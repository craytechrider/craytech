<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\AreaType;
use App\Models\CrayfishType;
use Illuminate\Http\Request;

class AreaController extends Controller
{
    public function index()
    {
        $areas = Area::with([
            'areaType',
            'crayfishType',
            'activeBatches',
        ])->get();

        $areaTypes = AreaType::all();
        $crayfishTypes = CrayfishType::all();

        return view('admin.farm-management', compact(
            'areas',
            'areaTypes',
            'crayfishTypes'
        ));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'area_type_id' => 'required|exists:area_types,id',
            'capacity' => 'required|integer|min:1',
        ]);

        Area::create([
            'name' => $validated['name'],
            'area_type_id' => $validated['area_type_id'],
            'capacity' => $validated['capacity'],
            'occupied' => 0,
            'crayfish_type_id' => null,
            'total_crayfish' => 0,
        ]);

        return redirect()
            ->route('farm-management')
            ->with('success', 'Area added successfully.');
    }

    public function update(Request $request, Area $area)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'area_type_id' => 'required|exists:area_types,id',
            'capacity' => 'required|integer|min:1',
        ]);

        $activePopulation = $area->activeBatches()
            ->sum('current_population');

        if ($validated['capacity'] < $activePopulation) {
            return back()
                ->withErrors([
                    'capacity' => 'Capacity cannot be lower than the current active population.',
                ])
                ->withInput();
        }

        $area->update([
            'name' => $validated['name'],
            'area_type_id' => $validated['area_type_id'],
            'capacity' => $validated['capacity'],
        ]);

        return redirect()
            ->route('farm-management')
            ->with('success', 'Area updated successfully.');
    }

    public function destroy(Area $area)
    {
        if ($area->activeBatches()->exists()) {
            return back()->with(
                'error',
                'This area cannot be deleted while it contains active batches.'
            );
        }

        $area->delete();

        return redirect()
            ->route('farm-management')
            ->with('success', 'Area deleted successfully.');
    }
}
