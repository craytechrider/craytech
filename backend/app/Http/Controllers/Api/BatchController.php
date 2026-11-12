<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\BatchUpdate;
use App\Models\Area;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BatchController extends Controller
{
    /**
     * Synchronize area occupancy and population
     * based on its active batches.
     */
    private function syncArea(Area $area): void
    {
        $activeBatches = Batch::where('area_id', $area->id)
            ->where('status', 'active')
            ->get();

        $totalPopulation = $activeBatches->sum('current_population');

        $area->update([
            'occupied' => $activeBatches->isNotEmpty() ? 1 : 0,
            'total_crayfish' => $totalPopulation,
            'crayfish_type_id' => $activeBatches->isNotEmpty()
                ? $activeBatches->first()->crayfish_type_id
                : null,
        ]);
    }

    /**
     * Get all batches.
     */
    public function index()
    {
        try {
            $batches = Batch::with([
                'area.areaType',
                'crayfishType',
                'updates',
            ])
                ->latest()
                ->get();

            return response()->json([
                'success' => true,
                'data' => $batches,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to load batches.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a new batch.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'batch_name' => 'required|string|max:255',
            'area_id' => 'required|exists:areas,id',
            'crayfish_type_id' => 'required|exists:crayfish_types,id',
            'initial_population' => 'required|integer|min:1',
            'date_added' => 'required|date',
        ]);

        try {
            DB::beginTransaction();

            $area = Area::whereKey($validated['area_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $activeBatches = Batch::where('area_id', $area->id)
                ->where('status', 'active')
                ->lockForUpdate()
                ->get();

            $currentTotal = $activeBatches->sum('current_population');

            // Check crayfish type compatibility.
            if (
                $activeBatches->isNotEmpty() &&
                $activeBatches->contains(function ($batch) use ($validated) {
                    return (int) $batch->crayfish_type_id !==
                        (int) $validated['crayfish_type_id'];
                })
            ) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'This area already contains another crayfish type.',
                ], 422);
            }

            // Check area capacity.
            $newTotal = $currentTotal +
                (int) $validated['initial_population'];

            if ($newTotal > (int) $area->capacity) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'The initial population exceeds the available area capacity.',
                ], 422);
            }

            // Create batch.
            $batch = Batch::create([
                'batch_name' => $validated['batch_name'],
                'area_id' => $validated['area_id'],
                'crayfish_type_id' => $validated['crayfish_type_id'],
                'initial_population' => $validated['initial_population'],
                'current_population' => $validated['initial_population'],
                'date_added' => $validated['date_added'],
                'status' => 'active',
            ]);

            // Record initial population history.
            BatchUpdate::create([
                'batch_id' => $batch->id,
                'population' => $validated['initial_population'],
                'mortality_rate' => 0,
            ]);

            // Automatically update area availability and population.
            $this->syncArea($area);

            DB::commit();

            $batch->load([
                'area.areaType',
                'crayfishType',
                'updates',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Batch added successfully.',
                'data' => $batch,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to create batch.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update batch population.
     */
    public function update(Request $request, Batch $batch)
    {
        $validated = $request->validate([
            'current_population' => 'required|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            // Lock batch.
            $batch = Batch::whereKey($batch->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Released batches cannot be updated.
            if ($batch->status !== 'active') {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'Released batches cannot be updated.',
                ], 422);
            }

            // Lock assigned area.
            $area = Area::whereKey($batch->area_id)
                ->lockForUpdate()
                ->firstOrFail();

            $oldPopulation = (int) $batch->current_population;
            $newPopulation = (int) $validated['current_population'];

            // Prevent population above initial population.
            if ($newPopulation > (int) $batch->initial_population) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'Current population cannot exceed the initial population.',
                ], 422);
            }

            // Check total area capacity.
            $otherActivePopulation = Batch::where('area_id', $area->id)
                ->where('status', 'active')
                ->where('id', '!=', $batch->id)
                ->sum('current_population');

            if (
                $otherActivePopulation + $newPopulation >
                (int) $area->capacity
            ) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'The updated population exceeds the area capacity.',
                ], 422);
            }

            // Update batch population.
            $batch->update([
                'current_population' => $newPopulation,
            ]);

            // Calculate mortality.
            $mortality = 0;

            if ((int) $batch->initial_population > 0) {
                $mortality = (
                    (
                        (int) $batch->initial_population - $newPopulation
                    ) / (int) $batch->initial_population
                ) * 100;
            }

            // Save population history.
            BatchUpdate::create([
                'batch_id' => $batch->id,
                'population' => $newPopulation,
                'mortality_rate' => $mortality,
            ]);

            // Recalculate area population and availability.
            $this->syncArea($area);

            DB::commit();

            $batch->load([
                'area.areaType',
                'crayfishType',
                'updates',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Population updated successfully.',
                'data' => $batch,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to update population.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Release an entire batch.
     */
    public function release(Request $request, Batch $batch)
    {
        $validated = $request->validate([
            'date_released' => 'required|date',
            'release_remarks' => 'nullable|string|max:2000',
        ]);

        try {
            DB::beginTransaction();

            // Lock batch.
            $batch = Batch::whereKey($batch->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($batch->status !== 'active') {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'This batch has already been released.',
                ], 422);
            }

            // Lock assigned area.
            $area = Area::whereKey($batch->area_id)
                ->lockForUpdate()
                ->firstOrFail();

            // Mark batch as released.
            $batch->update([
                'status' => 'released',
                'date_released' => $validated['date_released'],
                'release_remarks' => $validated['release_remarks'] ?? null,
            ]);

            // Remove released batch from active area population.
            $this->syncArea($area);

            DB::commit();

            $batch->load([
                'area.areaType',
                'crayfishType',
                'updates',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Batch released successfully.',
                'data' => $batch,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to release batch.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete batch.
     */
    public function destroy(Batch $batch)
    {
        try {
            DB::beginTransaction();

            $batch = Batch::whereKey($batch->id)
                ->lockForUpdate()
                ->firstOrFail();

            $area = Area::whereKey($batch->area_id)
                ->lockForUpdate()
                ->firstOrFail();

            // Delete batch and its population history.
            $batch->updates()->delete();
            $batch->delete();

            // Recalculate area after deletion.
            $this->syncArea($area);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Batch deleted successfully.',
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete batch.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
