<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;

class PhilippineLocationController extends Controller
{
    /**
     * PSGC Cloud API v2
     */
    private string $baseUrl = 'https://psgc.cloud/api/v2';

    /**
     * Make request to PSGC Cloud.
     *
     * withoutVerifying() is kept for local Laragon environments
     * where PHP/OpenSSL may have certificate configuration issues.
     */
    private function psgcGet(string $url)
    {
        return Http::timeout(20)
            ->connectTimeout(10)
            ->acceptJson()
            ->withoutVerifying()
            ->get($url);
    }

    /**
     * Extract the actual data array from PSGC Cloud.
     *
     * PSGC Cloud v2 returns:
     *
     * {
     *     "data": [...]
     * }
     *
     * We return only the inner array to the React frontend.
     */
    private function extractData($response): array
    {
        $json = $response->json();

        /*
         * PSGC Cloud v2 normally returns:
         *
         * [
         *     "data" => [...]
         * ]
         */
        if (
            is_array($json) &&
            isset($json['data']) &&
            is_array($json['data'])
        ) {
            return $json['data'];
        }

        /*
         * Fallback in case the API returns
         * a plain array.
         */
        if (is_array($json)) {
            return $json;
        }

        return [];
    }

    /**
     * Handle PSGC API errors consistently.
     */
    private function apiError(
        $response,
        string $message
    ) {
        return response()->json([
            'success' => false,
            'message' => $message,
            'status' => $response->status(),
            'error' => $response->body(),
        ], 502);
    }

    /*
    |--------------------------------------------------------------------------
    | REGIONS
    |--------------------------------------------------------------------------
    |
    | GET /api/locations/regions
    |
    */

    public function regions()
    {
        try {
            $response = $this->psgcGet(
                $this->baseUrl . '/regions'
            );

            if (!$response->successful()) {
                return $this->apiError(
                    $response,
                    'PSGC Cloud failed to return regions.'
                );
            }

            return response()->json([
                'success' => true,
                'data' => $this->extractData($response),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to connect to PSGC Cloud.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | PROVINCES
    |--------------------------------------------------------------------------
    |
    | GET /api/locations/{region}/provinces
    |
    */

    public function provinces(string $region)
    {
        try {
            $url =
                $this->baseUrl .
                '/regions/' .
                rawurlencode($region) .
                '/provinces';

            $response = $this->psgcGet($url);

            if (!$response->successful()) {
                return $this->apiError(
                    $response,
                    'PSGC Cloud failed to return provinces.'
                );
            }

            return response()->json([
                'success' => true,
                'data' => $this->extractData($response),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to load provinces.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | MUNICIPALITIES / CITIES
    |--------------------------------------------------------------------------
    |
    | GET
    | /api/locations/{region}/provinces/{province}/municipalities
    |
    */

    public function municipalities(
        string $region,
        string $province
    ) {
        try {
            $url =
                $this->baseUrl .
                '/regions/' .
                rawurlencode($region) .
                '/provinces/' .
                rawurlencode($province) .
                '/cities-municipalities';

            $response = $this->psgcGet($url);

            if (!$response->successful()) {
                return $this->apiError(
                    $response,
                    'PSGC Cloud failed to return municipalities and cities.'
                );
            }

            return response()->json([
                'success' => true,
                'data' => $this->extractData($response),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' =>
                'Unable to load municipalities and cities.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | BARANGAYS
    |--------------------------------------------------------------------------
    |
    | GET
    | /api/locations/{region}/provinces/{province}/municipalities/{municipality}/barangays
    |
    */

    public function barangays(
        string $region,
        string $province,
        string $municipality
    ) {
        try {
            $url =
                $this->baseUrl .
                '/regions/' .
                rawurlencode($region) .
                '/provinces/' .
                rawurlencode($province) .
                '/cities-municipalities/' .
                rawurlencode($municipality) .
                '/barangays';

            $response = $this->psgcGet($url);

            if (!$response->successful()) {
                return $this->apiError(
                    $response,
                    'PSGC Cloud failed to return barangays.'
                );
            }

            return response()->json([
                'success' => true,
                'data' => $this->extractData($response),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to load barangays.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
