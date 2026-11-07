<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{User, Pesticide, Pest, Disease, Weed, LabSample, Monitoring, Report, ActivityLog};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $counts = [
            'users' => User::count(),
            'pesticides' => Pesticide::count(),
            'pests' => Pest::count(),
            'diseases' => Disease::count(),
            'weeds' => Weed::count(),
            'lab_samples' => LabSample::count(),
            'monitorings' => Monitoring::count(),
            'reports' => Report::count(),
        ];

        // Пестицидлар тури бўйича тақсимот (chart)
        $byType = Pesticide::select('pesticide_type', DB::raw('count(*) as total'))
            ->groupBy('pesticide_type')->pluck('total', 'pesticide_type');

        // Охирги 6 ой бўйича мониторинглар
        $monitoringTrend = Monitoring::select(
                DB::raw("to_char(inspection_date, 'YYYY-MM') as month"),
                DB::raw('count(*) as total'))
            ->whereNotNull('inspection_date')
            ->where('inspection_date', '>=', now()->subMonths(6))
            ->groupBy('month')->orderBy('month')->get();

        // Мониторинг хавф даражаси
        $severity = Monitoring::select('severity', DB::raw('count(*) as total'))
            ->whereNotNull('severity')->groupBy('severity')->pluck('total', 'severity');

        $recent = ActivityLog::with('user:id,username,name')
            ->latest()->limit(10)->get();

        return response()->json([
            'counts' => $counts,
            'charts' => [
                'pesticides_by_type' => $byType,
                'monitoring_trend' => $monitoringTrend,
                'monitoring_severity' => $severity,
            ],
            'recent_activities' => $recent,
        ]);
    }
}
