<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CrayfishType;
use App\Models\AreaType;

class FarmManagementController extends Controller
{
    public function index()
    {
        return view('admin.farm-management', [
            'crayfishTypes' => CrayfishType::all(),
            'areaTypes' => AreaType::all(),
        ]);
    }
}
