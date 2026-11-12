<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class SuperAdminController extends Controller
{
    public function dashboard()
    {
        $end = now()->endOfDay();
        $start = now()->subDays(29)->startOfDay();

        return response()->json([
            'success' => true,
            'data' => [
                // Existing summary statistics
                'total_users' => User::count(),
                'total_admins' => User::where('role', 'admin')->count(),
                'total_customers' => User::where('role', 'customer')->count(),
                'total_delivery' => User::where('role', 'delivery')->count(),
                'total_visits' => Schema::hasTable('website_visits')
                    ? DB::table('website_visits')->count()
                    : 0,

                // Daily chart data: last 30 days, including today
                'daily_visits' => $this->dailyCounts(
                    'website_visits',
                    'viewed_at',
                    $start,
                    $end
                ),
                'daily_orders' => $this->dailyCounts(
                    'orders',
                    'created_at',
                    $start,
                    $end
                ),
                'daily_registrations' => $this->dailyCounts(
                    'users',
                    'created_at',
                    $start,
                    $end
                ),
                'chart_period' => 'last_30_days',
            ],
        ]);
    }

    /**
     * Return one count per calendar date, including dates with zero activity.
     */
    private function dailyCounts(string $table, string $dateColumn, $start, $end): array
    {
        // Check both table and date column so optional analytics tables
        // or schema differences do not break the dashboard endpoint.
        if (!Schema::hasTable($table) || !Schema::hasColumn($table, $dateColumn)) {
            return $this->emptyDailyCounts($start, $end);
        }

        $counts = DB::table($table)
            ->selectRaw("DATE({$dateColumn}) as date, COUNT(*) as count")
            ->where($dateColumn, '>=', $start)
            ->where($dateColumn, '<=', $end)
            ->groupBy(DB::raw("DATE({$dateColumn})"))
            ->orderBy('date')
            ->get()
            ->mapWithKeys(fn ($row) => [
                (string) $row->date => (int) $row->count,
            ])
            ->all();

        $daily = [];

        $date = $start->copy()->startOfDay();
        $lastDate = $end->copy()->startOfDay();

        while ($date->lte($lastDate)) {
            $key = $date->toDateString();

            $daily[] = [
                'date' => $key,
                'count' => $counts[$key] ?? 0,
            ];

            $date->addDay();
        }

        return $daily;
    }

    /**
     * Return a zero-filled date series when a table or column is unavailable.
     */
    private function emptyDailyCounts($start, $end): array
    {
        $daily = [];

        $date = $start->copy()->startOfDay();
        $lastDate = $end->copy()->startOfDay();

        while ($date->lte($lastDate)) {
            $daily[] = [
                'date' => $date->toDateString(),
                'count' => 0,
            ];

            $date->addDay();
        }

        return $daily;
    }

    public function users(Request $request)
    {
        $query = User::query()
            ->select(['id', 'name', 'email', 'mobile_number', 'business_name', 'role', 'is_active', 'email_verified_at', 'created_at'])
            ->where('role', '!=', 'super_admin')
            ->latest();

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        if ($request->filled('role') && in_array($request->role, ['admin', 'customer', 'delivery'], true)) {
            $query->where('role', $request->role);
        }

        return response()->json(['success' => true, 'data' => $query->paginate(20)]);
    }

    public function activityLogs()
    {
        if (!Schema::hasTable('activity_logs')) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $query = DB::table('activity_logs')->latest('created_at')->limit(100);
        $columns = ['id', 'user_id', 'user_name', 'action', 'description', 'created_at'];
        if (Schema::hasColumn('activity_logs', 'ip_address')) $columns[] = 'ip_address';

        return response()->json([
            'success' => true,
            'data' => $query->get($columns),
        ]);
    }

    public function systemHealth()
    {
        $database = 'connected';
        try { DB::connection()->getPdo(); } catch (Throwable $e) { $database = 'unavailable'; }

        return response()->json([
            'success' => true,
            'data' => [
                'application' => 'online',
                'database' => $database,
                'environment' => app()->environment(),
                'laravel' => app()->version(),
                'server_time' => now()->toIso8601String(),
            ],
        ]);
    }
}
