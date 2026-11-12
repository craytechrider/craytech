<?php

namespace App\Http\Controllers;

use App\Models\AreaType;
use Illuminate\Http\Request;

class AreaTypeController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|unique:area_types,name',
            'description' => 'nullable|string',
        ]);

        AreaType::create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return redirect()->route('farm-management')
            ->with('success', 'Area type added successfully.');
    }

    public function destroy(AreaType $areaType)
    {
        $areaType->delete();

        return redirect()->route('farm-management')
            ->with('success', 'Area type deleted successfully.');
    }

    public function update(Request $request, AreaType $areaType)
    {
        $request->validate([
            'name' => 'required|unique:area_types,name,' . $areaType->id,
            'description' => 'nullable|string',
        ]);

        $areaType->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return redirect()->route('farm-management')
            ->with('success', 'Area type updated successfully.');
    }
}
