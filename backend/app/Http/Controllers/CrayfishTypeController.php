<?php

namespace App\Http\Controllers;

use App\Models\CrayfishType;
use Illuminate\Http\Request;

class CrayfishTypeController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|unique:crayfish_types,name',
            'description' => 'nullable|string',
        ]);

        CrayfishType::create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return redirect()->route('farm-management')
            ->with('success', 'Crayfish type added successfully.');
    }

    public function destroy(CrayfishType $crayfishType)
    {
        $crayfishType->delete();

        return redirect()->route('farm-management')
            ->with('success', 'Crayfish type deleted successfully.');
    }

    public function update(Request $request, CrayfishType $crayfishType)
    {
        $request->validate([
            'name' => 'required|unique:crayfish_types,name,' . $crayfishType->id,
            'description' => 'nullable|string',
        ]);

        $crayfishType->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return redirect()->route('farm-management')
            ->with('success', 'Crayfish type updated successfully.');
    }
}
