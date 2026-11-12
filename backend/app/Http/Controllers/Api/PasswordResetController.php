<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Carbon;

class PasswordResetController extends Controller
{
    public function sendCode(Request $request)
    {
        $validated = $request->validate(['email' => ['required', 'email']]);
        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => 'If the email is registered, a password reset code will be sent.',
            ]);
        }

        $existing = DB::table('password_reset_codes')->where('user_id', $user->id)->first();
        if ($existing && $existing->last_sent_at) {
            if (Carbon::parse($existing->last_sent_at)->addSeconds(60)->isFuture()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please wait 60 seconds before requesting another code.',
                ], 429);
            }
        }

        $code = (string) random_int(100000, 999999);
        DB::table('password_reset_codes')->updateOrInsert(
            ['user_id' => $user->id],
            [
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(5),
                'attempts' => 0,
                'last_sent_at' => now(),
                'created_at' => $existing ? $existing->created_at : now(),
                'updated_at' => now(),
            ]
        );

        $safeName = e($user->name);
        $html = "<div style='font-family:Arial,sans-serif;background:#f4f6f9;padding:30px;'>
            <div style='max-width:500px;margin:auto;background:#fff;padding:30px;border-radius:12px;'>
            <h2 style='color:#17365D;text-align:center;'>CRAYTECH</h2><h3>Hello {$safeName}!</h3>
            <p>We received a request to reset your CRAYTECH account password.</p>
            <p>Use the password reset code below:</p>
            <div style='background:#f1f5f9;padding:20px;text-align:center;border-radius:8px;'><h1 style='letter-spacing:10px;color:#17365D;'>{$code}</h1></div>
            <p>This code expires in <strong>5 minutes</strong>.</p>
            <p>If you did not request a password reset, please ignore this email.</p><hr>
            <p style='font-size:12px;color:#777;text-align:center;'>CRAYTECH - Crayfish Farm Management System</p>
            </div></div>";

        try {
            Mail::html($html, function ($message) use ($user) {
                $message->to($user->email)->subject('CRAYTECH Password Reset Code');
            });

            ActivityLogger::log('password_reset_requested', 'User requested a password reset code.', $user);

            return response()->json([
                'success' => true,
                'message' => 'If the email is registered, a password reset code will be sent.',
            ]);
        } catch (\Throwable $e) {
            DB::table('password_reset_codes')->where('user_id', $user->id)->delete();
            Log::error('CRAYTECH password reset email failed.', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to send the password reset email. Please try again later.',
            ], 503);
        }
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::where('email', strtolower(trim($validated['email'])))->first();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Invalid or expired password reset code.'], 422);
        }

        $record = DB::table('password_reset_codes')->where('user_id', $user->id)->first();
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'No password reset code found. Please request a new one.'], 422);
        }

        if (Carbon::parse($record->expires_at)->isPast()) {
            DB::table('password_reset_codes')->where('user_id', $user->id)->delete();
            return response()->json(['success' => false, 'message' => 'Password reset code expired. Please request a new one.'], 422);
        }

        if ($record->attempts >= 5) {
            DB::table('password_reset_codes')->where('user_id', $user->id)->delete();
            return response()->json(['success' => false, 'message' => 'Too many attempts. Please request a new code.'], 429);
        }

        if (!Hash::check($validated['code'], $record->code_hash)) {
            DB::table('password_reset_codes')->where('user_id', $user->id)->increment('attempts');
            ActivityLogger::log('password_reset_code_failed', 'Incorrect password reset verification code.', $user);
            return response()->json(['success' => false, 'message' => 'Incorrect password reset code.'], 422);
        }

        DB::transaction(function () use ($user, $validated) {
            $lockedUser = User::whereKey($user->id)->lockForUpdate()->first();
            $lockedUser->forceFill([
                'password' => Hash::make($validated['password']),
                'failed_login_attempts' => 0,
                'locked_until' => null,
            ])->save();

            $lockedUser->tokens()->delete();
            DB::table('password_reset_codes')->where('user_id', $lockedUser->id)->delete();
        });

        ActivityLogger::log(
            'password_reset',
            'User successfully reset their password and the account lock was cleared.',
            $user
        );

        return response()->json([
            'success' => true,
            'message' => 'Your password has been reset successfully. You can now log in.',
        ]);
    }
}
