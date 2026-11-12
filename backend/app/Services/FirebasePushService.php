<?php

namespace App\Services;

use App\Models\User;
use App\Models\DeviceToken;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

class FirebasePushService
{
    protected $messaging;

    public function __construct()
    {
        $credentials = storage_path('app/firebase.json');

        if (!file_exists($credentials)) {
            throw new \RuntimeException(
                'Firebase credentials not found: ' . $credentials
            );
        }

        $factory = (new Factory)
            ->withServiceAccount($credentials);

        $this->messaging = $factory->createMessaging();
    }

    /**
     * Send a push notification to one FCM token.
     */
    public function sendToToken(
        string $token,
        string $title,
        string $body,
        array $data = []
    ): bool {
        try {
            $message = CloudMessage::withTarget('token', $token)
                ->withNotification(
                    Notification::create($title, $body)
                )
                ->withData(
                    $this->formatData($data)
                );

            $this->messaging->send($message);

            return true;
        } catch (Throwable $e) {

            Log::error('Firebase push notification failed', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Send push notifications to all registered devices
     * belonging to one user.
     */
    public function sendToUser(
        User $user,
        string $title,
        string $body,
        array $data = []
    ): int {
        $sent = 0;

        $tokens = DeviceToken::where('user_id', $user->id)->get();

        foreach ($tokens as $device) {

            $success = $this->sendToToken(
                $device->token,
                $title,
                $body,
                $data
            );

            if ($success) {
                $sent++;

                $device->update([
                    'last_used_at' => now(),
                ]);
            }
        }

        return $sent;
    }

    /**
     * Send notifications to users with a specific role.
     */
    public function sendToRole(
        string $role,
        string $title,
        string $body,
        array $data = []
    ): int {
        $sent = 0;

        User::where('role', $role)
            ->whereHas('deviceTokens')
            ->chunkById(100, function ($users) use (
                &$sent,
                $title,
                $body,
                $data
            ) {
                foreach ($users as $user) {
                    $sent += $this->sendToUser(
                        $user,
                        $title,
                        $body,
                        $data
                    );
                }
            });

        return $sent;
    }

    /**
     * FCM data values must be strings.
     */
    private function formatData(array $data): array
    {
        $formatted = [];

        foreach ($data as $key => $value) {
            if (is_array($value) || is_object($value)) {
                $formatted[$key] = json_encode($value);
            } elseif (is_bool($value)) {
                $formatted[$key] = $value ? 'true' : 'false';
            } elseif ($value === null) {
                $formatted[$key] = '';
            } else {
                $formatted[$key] = (string) $value;
            }
        }

        return $formatted;
    }
}
