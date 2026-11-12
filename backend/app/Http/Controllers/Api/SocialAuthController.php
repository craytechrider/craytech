<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SocialAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    private const FRONTEND_URL = 'https://craytech.site';

    /*
    |--------------------------------------------------------------------------
    | REDIRECT TO GOOGLE OR FACEBOOK
    |--------------------------------------------------------------------------
    */

    public function redirect(string $provider)
    {
        abort_unless(
            in_array($provider, ['google', 'facebook'], true),
            404
        );

        return Socialite::driver($provider)->redirect();
    }

    /*
    |--------------------------------------------------------------------------
    | GOOGLE / FACEBOOK CALLBACK
    |--------------------------------------------------------------------------
    */

    public function callback(string $provider)
    {
        abort_unless(
            in_array($provider, ['google', 'facebook'], true),
            404
        );

        try {
            // Retrieve provider information.
            // Socialite validates the session-backed OAuth state.
            $socialUser = Socialite::driver($provider)->user();

            $providerId = $socialUser->getId();
            $email = $socialUser->getEmail();

            $name = $socialUser->getName()
                ?: $socialUser->getNickname()
                ?: 'CRAYTECH Customer';

            if (!$providerId || !$email) {
                return redirect(
                    self::FRONTEND_URL . '/login?social_error=email_missing'
                );
            }

            $email = strtolower(trim($email));

            /*
            |--------------------------------------------------------------------------
            | VERIFY GOOGLE EMAIL
            |--------------------------------------------------------------------------
            */

            if ($provider === 'google') {
                $googleData = $socialUser->user ?? [];

                $verified = filter_var(
                    $googleData['email_verified'] ?? false,
                    FILTER_VALIDATE_BOOLEAN
                );

                if (!$verified) {
                    return redirect(
                        self::FRONTEND_URL . '/login?social_error=email_unverified'
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | FIND OR CREATE CRAYTECH ACCOUNT
            |--------------------------------------------------------------------------
            */

            $user = DB::transaction(function () use (
                $provider,
                $providerId,
                $email,
                $name
            ) {

                // Check whether this provider account is already linked.
                $socialAccount = SocialAccount::where('provider', $provider)
                    ->where('provider_user_id', $providerId)
                    ->lockForUpdate()
                    ->first();

                // Existing linked social account.
                if ($socialAccount) {
                    $user = User::whereKey($socialAccount->user_id)
                        ->lockForUpdate()
                        ->firstOrFail();

                    $socialAccount->update([
                        'provider_email' => $email,
                    ]);

                    return $user;
                }

                // Check whether the email already exists in CRAYTECH.
                $user = User::where('email', $email)
                    ->lockForUpdate()
                    ->first();

                /*
                 * FACEBOOK SECURITY:
                 * Never automatically link a new Facebook identity
                 * to an existing CRAYTECH account.
                 *
                 * Facebook email ownership is not treated as verified.
                 */
                if ($user && $provider === 'facebook') {
                    throw new \RuntimeException('SOCIAL_ACCOUNT_EXISTS');
                }

                /*
                 * CREATE NEW CUSTOMER ACCOUNT
                 */
                if (!$user) {
                    $user = User::create([
                        'name' => $name,
                        'email' => $email,
                        'password' => Str::random(64),
                        'role' => 'customer',
                        'is_active' => true,
                        'email_verified_at' => null,
                    ]);
                }

                /*
                 * GOOGLE EMAIL VERIFICATION:
                 * Google has already confirmed email ownership.
                 *
                 * This also preserves the existing role of an account.
                 */
                if (
                    $provider === 'google' &&
                    !$user->email_verified_at
                ) {
                    $user->forceFill([
                        'email_verified_at' => now(),
                    ])->save();

                    DB::table('email_verification_codes')
                        ->where('user_id', $user->id)
                        ->delete();
                }

                /*
                 * LINK SOCIAL ACCOUNT
                 */
                SocialAccount::create([
                    'user_id' => $user->id,
                    'provider' => $provider,
                    'provider_user_id' => $providerId,
                    'provider_email' => $email,
                ]);

                return $user;
            });

            /*
            |--------------------------------------------------------------------------
            | CHECK ACCOUNT STATUS
            |--------------------------------------------------------------------------
            */

            if (!$user->is_active) {
                return redirect(
                    self::FRONTEND_URL . '/login?social_error=account_disabled'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | FACEBOOK EMAIL OTP VERIFICATION
            |--------------------------------------------------------------------------
            */

            if (!$user->email_verified_at) {

                $result = app(AuthController::class)
                    ->sendVerificationCode($user);

                if (!$result['success']) {
                    return redirect(
                        self::FRONTEND_URL
                            . '/verify-email?email='
                            . urlencode($user->email)
                            . '&social_error=otp_failed'
                    );
                }

                return redirect(
                    self::FRONTEND_URL
                        . '/verify-email?email='
                        . urlencode($user->email)
                        . '&social=facebook'
                );
            }

            /*
            |--------------------------------------------------------------------------
            | GENERATE ONE-TIME EXCHANGE CODE
            |--------------------------------------------------------------------------
            |
            | Never place the actual Sanctum token in the redirect URL.
            | The frontend exchanges this temporary code for the token.
            |
            */

            $exchangeCode = Str::random(64);

            Cache::put(
                'social_auth:' . hash('sha256', $exchangeCode),
                $user->id,
                now()->addMinutes(2)
            );

            return redirect(
                self::FRONTEND_URL
                    . '/social-auth/callback?code='
                    . urlencode($exchangeCode)
            );
        } catch (\Throwable $e) {

            // Handle an existing email matched by Facebook.
            if ($e->getMessage() === 'SOCIAL_ACCOUNT_EXISTS') {
                return redirect(
                    self::FRONTEND_URL . '/login?social_error=account_exists'
                );
            }

            report($e);

            return redirect(
                self::FRONTEND_URL . '/login?social_error=authentication_failed'
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | EXCHANGE ONE-TIME CODE FOR SANCTUM TOKEN
    |--------------------------------------------------------------------------
    */

    public function exchange(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:64'],
        ]);

        $cacheKey = 'social_auth:' . hash(
            'sha256',
            $validated['code']
        );

        // Retrieve and delete the temporary code.
        $userId = Cache::pull($cacheKey);

        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired authentication code.',
            ], 401);
        }

        $user = User::find($userId);

        if (
            !$user ||
            !$user->is_active ||
            !$user->email_verified_at
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Account cannot be authenticated.',
            ], 403);
        }

        /*
         * CREATE SANCTUM TOKEN
         */
        $token = $user->createToken('craytech-app')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Social login successful.',
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
}
