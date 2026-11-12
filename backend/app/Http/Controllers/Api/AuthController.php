<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use App\Support\ActivityLogger;

class AuthController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    */

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if (!$user) {
            ActivityLogger::log(
                'login_failed',
                'Failed login attempt for an unrecognized email address.',
                null,
                ['email' => $email],
                $email
            );

            return response()->json([
                'success' => false,
                'message' => 'The email or password is incorrect.',
            ], 422);
        }

        if ($user->locked_until && $user->locked_until->isFuture()) {
            ActivityLogger::log(
                'login_blocked',
                'Login blocked because the account is temporarily locked.',
                $user
            );

            return response()->json([
                'success' => false,
                'locked' => true,
                'requires_password_reset' => true,
                'message' => 'Your account is temporarily locked after 3 failed login attempts. Please use Forgot Password to reset your password.',
                'remaining_seconds' => now()->diffInSeconds($user->locked_until),
            ], 423);
        }

        if ($user->locked_until && $user->locked_until->isPast()) {
            $user->forceFill([
                'failed_login_attempts' => 0,
                'locked_until' => null,
            ])->save();
        }

        if (!Hash::check($validated['password'], $user->password)) {
            // Lock the row while incrementing to prevent simultaneous requests
            // from losing an attempt update.
            $attempts = DB::transaction(function () use ($user) {
                $lockedUser = User::whereKey($user->id)->lockForUpdate()->first();
                $count = (int) $lockedUser->failed_login_attempts + 1;
                $lockedUser->forceFill([
                    'failed_login_attempts' => $count,
                    'locked_until' => $count >= 3 ? now()->addMinutes(15) : null,
                ])->save();
                return $count;
            });

            $isLocked = $attempts >= 3;
            ActivityLogger::log(
                'login_failed',
                $isLocked
                    ? 'Incorrect password. Account locked after 3 failed attempts.'
                    : "Incorrect password. Failed attempt {$attempts} of 3.",
                $user,
                [
                    'attempt' => $attempts,
                    'maximum_attempts' => 3,
                    'locked' => $isLocked,
                ]
            );

            if ($isLocked) {
                ActivityLogger::log(
                    'account_locked',
                    'Account temporarily locked after 3 consecutive failed password attempts.',
                    $user
                );

                return response()->json([
                    'success' => false,
                    'locked' => true,
                    'requires_password_reset' => true,
                    'message' => 'You have reached the maximum of 3 failed login attempts. Your account is temporarily locked. Please use Forgot Password to reset your password.',
                ], 423);
            }

            return response()->json([
                'success' => false,
                'remaining_attempts' => 3 - $attempts,
                'message' => 'The email or password is incorrect. You have ' . (3 - $attempts) . ' attempt(s) remaining.',
            ], 422);
        }

        if (!$user->is_active) {
            ActivityLogger::log(
                'login_blocked',
                'Login denied because the account is disabled.',
                $user
            );

            return response()->json([
                'success' => false,
                'message' => 'This account has been disabled. Please contact the administrator.',
            ], 403);
        }

        if (!$user->email_verified_at) {
            ActivityLogger::log(
                'login_requires_verification',
                'Login denied because the email address is not verified.',
                $user
            );

            return response()->json([
                'success' => false,
                'requires_verification' => true,
                'email' => $user->email,
                'message' => 'Please verify your email before logging in.',
            ], 403);
        }

        $user->forceFill([
            'failed_login_attempts' => 0,
            'locked_until' => null,
        ])->save();

        $user->tokens()->delete();
        $token = $user->createToken('craytech-app')->plainTextToken;

        ActivityLogger::log('login_success', 'User successfully logged in.', $user);

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $user->mobile_number,
                'business_name' => $user->business_name,
                'role' => $user->role,
                'is_active' => $user->is_active,
                'email_verified_at' => $user->email_verified_at,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | REGISTER CUSTOMER
    |--------------------------------------------------------------------------
    */

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:191'],
            'email' => ['required', 'email', 'max:191', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        // Public registration always creates a customer.
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => 'customer',
            'is_active' => true,
        ]);

        $result = $this->sendVerificationCode($user);

        if (!$result['success']) {
            Log::warning('CRAYTECH registration OTP email was not sent.', [
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => false,
                'requires_verification' => true,
                'email' => $user->email,
                'message' => $result['message'],
            ], $result['status']);
        }

        // No Sanctum token is issued until email verification.
        return response()->json([
            'success' => true,
            'requires_verification' => true,
            'email' => $user->email,
            'message' => 'Account created. Please verify your email.',
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | SEND EMAIL VERIFICATION CODE
    |--------------------------------------------------------------------------
    */

    public function sendVerificationCode(User $user): array
    {
        $existing = DB::table('email_verification_codes')
            ->where('user_id', $user->id)
            ->first();

        // Enforce 60-second resend cooldown.
        if ($existing && $existing->last_sent_at) {
            $lastSent = Carbon::parse($existing->last_sent_at);

            if ($lastSent->addSeconds(60)->isFuture()) {
                return [
                    'success' => false,
                    'status' => 429,
                    'message' => 'Please wait 60 seconds before requesting another code.',
                ];
            }
        }

        $code = (string) random_int(100000, 999999);

        // Store the hashed OTP before attempting email delivery.
        DB::table('email_verification_codes')->updateOrInsert(
            ['user_id' => $user->id],
            [
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes(5),
                'attempts' => 0,
                'last_sent_at' => now(),
                'created_at' => $existing
                    ? $existing->created_at
                    : now(),
                'updated_at' => now(),
            ]
        );

        $safeName = e($user->name);

        $html = "
            <div style='font-family:Arial,sans-serif;background:#f4f6f9;padding:30px;'>
                <div style='max-width:500px;margin:auto;background:#fff;padding:30px;border-radius:12px;'>
                    <h2 style='color:#17365D;text-align:center;'>CRAYTECH</h2>

                    <h3>Hello {$safeName}!</h3>

                    <p>Thank you for using CRAYTECH.</p>

                    <p>Use the verification code below to verify your email address.</p>

                    <div style='background:#f1f5f9;padding:20px;text-align:center;border-radius:8px;'>
                        <h1 style='letter-spacing:10px;color:#17365D;'>
                            {$code}
                        </h1>
                    </div>

                    <p>This verification code expires in <strong>5 minutes</strong>.</p>

                    <p>If you did not request this code, you can ignore this email.</p>

                    <hr>

                    <p style='font-size:12px;color:#777;text-align:center;'>
                        CRAYTECH - Crayfish Farm Management System
                    </p>
                </div>
            </div>
        ";

        try {
            Mail::html($html, function ($message) use ($user) {
                $message->to($user->email)
                    ->subject('CRAYTECH Email Verification Code');
            });

            return [
                'success' => true,
                'status' => 200,
                'message' => 'Verification code sent successfully.',
            ];
        } catch (\Throwable $e) {
            // Remove the unusable OTP if delivery fails.
            DB::table('email_verification_codes')
                ->where('user_id', $user->id)
                ->delete();

            Log::error('CRAYTECH OTP email failed.', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'status' => 503,
                'message' => 'Unable to send verification email. Please try again later.',
            ];
        }
    }

    /*
    |--------------------------------------------------------------------------
    | VERIFY EMAIL CODE
    |--------------------------------------------------------------------------
    */

    public function verifyEmailCode(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'digits:6'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Verification is available for every account role.
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification request.',
            ], 422);
        }

        if ($user->email_verified_at) {
            return response()->json([
                'success' => true,
                'message' => 'Email already verified.',
            ]);
        }

        $record = DB::table('email_verification_codes')
            ->where('user_id', $user->id)
            ->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'No verification code found. Please request a new one.',
            ], 422);
        }

        if (Carbon::parse($record->expires_at)->isPast()) {
            DB::table('email_verification_codes')
                ->where('user_id', $user->id)
                ->delete();

            return response()->json([
                'success' => false,
                'message' => 'Verification code expired. Please request a new one.',
            ], 422);
        }

        if ($record->attempts >= 5) {
            DB::table('email_verification_codes')
                ->where('user_id', $user->id)
                ->delete();

            return response()->json([
                'success' => false,
                'message' => 'Too many attempts. Please request a new code.',
            ], 429);
        }

        if (!Hash::check($validated['code'], $record->code_hash)) {
            DB::table('email_verification_codes')
                ->where('user_id', $user->id)
                ->increment('attempts');

            return response()->json([
                'success' => false,
                'message' => 'Incorrect verification code.',
            ], 422);
        }

        // Mark account email as verified.
        $user->forceFill([
            'email_verified_at' => now(),
        ])->save();

        // Delete used OTP.
        DB::table('email_verification_codes')
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Email successfully verified. You can now log in.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | RESEND VERIFICATION CODE
    |--------------------------------------------------------------------------
    */

    public function resendVerificationCode(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Do not reveal whether an account exists.
        // Any unverified account can request a code.
        if (!$user || $user->email_verified_at) {
            return response()->json([
                'success' => true,
                'message' => 'If verification is needed, a code will be sent.',
            ]);
        }

        $result = $this->sendVerificationCode($user);

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message'],
        ], $result['status']);
    }

    /*
    |--------------------------------------------------------------------------
    | CURRENT USER
    |--------------------------------------------------------------------------
    */

    public function user(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'mobile_number' => $user->mobile_number,
                'business_name' => $user->business_name,
                'role' => $user->role,
                'is_active' => $user->is_active,
                'email_verified_at' => $user->email_verified_at,
            ],
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | LOGOUT
    |--------------------------------------------------------------------------
    */

    public function logout(Request $request)
    {
        $user = $request->user();

        if ($user) {
            ActivityLogger::log('logout', 'User successfully logged out.', $user);
            $token = $user->currentAccessToken();
            if ($token) {
                $token->delete();
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
        ]);
    }
}
