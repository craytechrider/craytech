<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

use App\Models\Area;
use App\Models\AreaType;
use App\Models\CrayfishType;

class FarmManagementController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Get Farm Management Data
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        $areas = Area::with([
            'areaType',
            'crayfishType',
        ])->get();

        $areaTypes = AreaType::all();

        $crayfishTypes = CrayfishType::all();

        return response()->json([
            'success' => true,
            'data' => [
                'areas' => $areas,
                'areaTypes' => $areaTypes,
                'crayfishTypes' => $crayfishTypes,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Crayfish Types
    |--------------------------------------------------------------------------
    */

    public function storeCrayfishType(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                'unique:crayfish_types,name',
            ],
            'description' => 'nullable|string',
        ], [
            'name.unique' => 'This crayfish type already exists.',
        ]);

        $type = CrayfishType::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Crayfish type added successfully.',
            'data' => $type,
        ], 201);
    }

    public function updateCrayfishType(Request $request, $id)
    {
        $type = CrayfishType::findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('crayfish_types', 'name')->ignore($type->id),
            ],
            'description' => 'nullable|string',
        ], [
            'name.unique' => 'This crayfish type already exists.',
        ]);

        $type->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Crayfish type updated successfully.',
            'data' => $type,
        ]);
    }

    public function deleteCrayfishType($id)
    {
        $type = CrayfishType::findOrFail($id);

        $type->delete();

        return response()->json([
            'success' => true,
            'message' => 'Crayfish type deleted successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Area Types
    |--------------------------------------------------------------------------
    */

    public function storeAreaType(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                'unique:area_types,name',
            ],
            'description' => 'nullable|string',
        ], [
            'name.unique' => 'This area type already exists.',
        ]);

        $type = AreaType::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Area type added successfully.',
            'data' => $type,
        ], 201);
    }

    public function updateAreaType(Request $request, $id)
    {
        $type = AreaType::findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('area_types', 'name')->ignore($type->id),
            ],
            'description' => 'nullable|string',
        ], [
            'name.unique' => 'This area type already exists.',
        ]);

        $type->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Area type updated successfully.',
            'data' => $type,
        ]);
    }

    public function deleteAreaType($id)
    {
        $type = AreaType::findOrFail($id);

        $type->delete();

        return response()->json([
            'success' => true,
            'message' => 'Area type deleted successfully.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Farm Areas
    |--------------------------------------------------------------------------
    */

    public function storeArea(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',

            'area_type_id' => 'required|exists:area_types,id',

            'capacity' => 'required|integer|min:0',

            'occupied' => 'required|boolean',

            'crayfish_type_id' => 'nullable|exists:crayfish_types,id',

            'total_crayfish' => 'nullable|integer|min:0',
        ]);

        /*
        |--------------------------------------------------------------------------
        | If area is available, remove crayfish information
        |--------------------------------------------------------------------------
        */

        if (!$validated['occupied']) {
            $validated['crayfish_type_id'] = null;
            $validated['total_crayfish'] = 0;
        }

        $area = Area::create($validated);

        $area->load([
            'areaType',
            'crayfishType',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Farm area added successfully.',
            'data' => $area,
        ], 201);
    }

    public function updateArea(Request $request, $id)
    {
        $area = Area::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',

            'area_type_id' => 'required|exists:area_types,id',

            'capacity' => 'required|integer|min:0',

            'occupied' => 'required|boolean',

            'crayfish_type_id' => 'nullable|exists:crayfish_types,id',

            'total_crayfish' => 'nullable|integer|min:0',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Available area = no crayfish
        |--------------------------------------------------------------------------
        */

        if (!$validated['occupied']) {
            $validated['crayfish_type_id'] = null;
            $validated['total_crayfish'] = 0;
        }

        $area->update($validated);

        $area->load([
            'areaType',
            'crayfishType',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Farm area updated successfully.',
            'data' => $area,
        ]);
    }

    public function deleteArea($id)
    {
        $area = Area::findOrFail($id);

        $area->delete();

        return response()->json([
            'success' => true,
            'message' => 'Farm area deleted successfully.',
        ]);
    }
}
