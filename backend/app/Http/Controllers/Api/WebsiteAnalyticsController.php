<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class WebsiteAnalyticsController extends Controller
{
    public function track(Request $request)
    {
        $validated = $request->validate([
            'visitor_id' => ['required', 'string', 'min:16', 'max:128'],
            'session_id' => ['required', 'string', 'min:16', 'max:128'],
            'path' => ['required', 'string', 'max:500'],
            'referrer' => ['nullable', 'string', 'max:2048'],
        ]);

        if (!Schema::hasTable('website_visits')) {
            return response()->json(['success' => false, 'message' => 'Analytics storage is not ready.'], 503);
        }

        DB::table('website_visits')->insert([
            'user_id' => $request->user()?->id,
            'visitor_hash' => hash('sha256', $validated['visitor_id']),
            'session_key' => hash('sha256', $validated['session_id']),
            'path' => $validated['path'],
            'referrer' => $validated['referrer'] ?? null,
            'viewed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function index()
    {
        if (!Schema::hasTable('website_visits')) {
            return response()->json([
                'success' => true,
                'data' => ['page_views' => 0, 'unique_visitors' => 0, 'sessions' => 0, 'pages' => []],
            ]);
        }

        $since = now()->subDays(30);

        $base = DB::table('website_visits')->where('viewed_at', '>=', $since);

        return response()->json([
            'success' => true,
            'data' => [
                'page_views' => (clone $base)->count(),
                'unique_visitors' => (clone $base)->distinct('visitor_hash')->count('visitor_hash'),
                'sessions' => (clone $base)->distinct('session_key')->count('session_key'),
                'pages' => DB::table('website_visits')
                    ->select('path', DB::raw('COUNT(*) as views'), DB::raw('COUNT(DISTINCT visitor_hash) as unique_visitors'))
                    ->where('viewed_at', '>=', $since)
                    ->groupBy('path')
                    ->orderByDesc('views')
                    ->limit(10)
                    ->get(),
                'period' => 'last_30_days',
            ],
        ]);
    }

    public function pages()
    {
        $data = DB::table('website_visits')
            ->select('path', DB::raw('COUNT(*) as views'), DB::raw('COUNT(DISTINCT visitor_hash) as unique_visitors'))
            ->where('viewed_at', '>=', now()->subDays(30))
            ->groupBy('path')
            ->orderByDesc('views')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function visitors()
    {
        $data = DB::table('website_visits')
            ->select('visitor_hash', DB::raw('COUNT(*) as page_views'), DB::raw('MAX(viewed_at) as last_seen'))
            ->where('viewed_at', '>=', now()->subDays(30))
            ->groupBy('visitor_hash')
            ->orderByDesc('last_seen')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $data]);
    }
}
