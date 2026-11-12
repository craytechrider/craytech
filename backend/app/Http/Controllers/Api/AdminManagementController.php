<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\AuthController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminManagementController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => User::where('role', 'admin')
                ->select('id', 'name', 'email', 'mobile_number', 'business_name', 'role', 'is_active', 'email_verified_at', 'created_at')
                ->latest()
                ->paginate(20),
        ]);
    }

    public function store(Request $request, AuthController $authController)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'email' => ['required', 'email', 'max:191', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'mobile_number' => ['nullable', 'string', 'max:191'],
            'business_name' => ['nullable', 'string', 'max:191'],
        ]);

        $admin = DB::transaction(function () use ($validated) {
            return User::create([
                'name' => $validated['name'],
                'email' => strtolower($validated['email']),
                'password' => Hash::make($validated['password']),
                'mobile_number' => $validated['mobile_number'] ?? null,
                'business_name' => $validated['business_name'] ?? null,
                'role' => 'admin',
                'is_active' => true,
                // Admin must complete the same email verification flow as other roles.
                'email_verified_at' => null,
            ]);
        });

        $verification = $authController->sendVerificationCode($admin);

        if (!$verification['success']) {
            $admin->delete();

            return response()->json([
                'success' => false,
                'message' => 'Admin account was not created because the verification email could not be sent. ' . $verification['message'],
            ], $verification['status'] ?? 503);
        }

        DB::table('activity_logs')->insert([
            'user_id' => $request->user()->id,
            'user_name' => $request->user()->name,
            'action' => 'admin_created',
            'description' => "Created administrator account for {$admin->email}. Verification email sent.",
            'subject_type' => User::class,
            'subject_id' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Admin account created. The administrator must verify their email before logging in.',
            'data' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
                'is_active' => $admin->is_active,
            ],
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        if ($user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Only administrator accounts can be updated here.'], 422);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:191'],
            'email' => ['sometimes', 'required', 'email', 'max:191', Rule::unique('users', 'email')->ignore($user->id)],
            'mobile_number' => ['sometimes', 'nullable', 'string', 'max:191'],
            'business_name' => ['sometimes', 'nullable', 'string', 'max:191'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (isset($validated['email']) && strtolower($validated['email']) !== strtolower($user->email)) {
            $validated['email'] = strtolower($validated['email']);
            $validated['email_verified_at'] = null;
            DB::table('email_verification_codes')->where('user_id', $user->id)->delete();
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        DB::table('activity_logs')->insert([
            'user_id' => $request->user()->id,
            'user_name' => $request->user()->name,
            'action' => 'admin_updated',
            'description' => "Updated administrator account {$user->email}.",
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Administrator account updated.']);
    }

    public function toggleStatus(Request $request, User $user)
    {
        if ($user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Only administrator accounts can be changed here.'], 422);
        }

        if (!$user->is_active && $request->boolean('is_active') === false) {
            return response()->json(['success' => true, 'message' => 'Administrator is already inactive.']);
        }

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $user->is_active = $validated['is_active'];
        $user->save();

        if (!$user->is_active) {
            $user->tokens()->delete();
        }

        DB::table('activity_logs')->insert([
            'user_id' => $request->user()->id,
            'user_name' => $request->user()->name,
            'action' => $user->is_active ? 'admin_activated' : 'admin_deactivated',
            'description' => ($user->is_active ? 'Activated' : 'Deactivated') . " administrator account {$user->email}.",
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => $user->is_active ? 'Administrator activated.' : 'Administrator deactivated.',
        ]);
    }
}
