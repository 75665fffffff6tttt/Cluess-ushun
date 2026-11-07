<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()?->can('users.view'), 403, 'Рухсат йўқ.');
        $query = ActivityLog::with('user:id,username,name');
        if ($request->filled('action')) $query->where('action', $request->query('action'));
        if ($request->filled('user_id')) $query->where('user_id', $request->query('user_id'));
        return response()->json($query->latest()->paginate(min((int)$request->query('per_page', 20), 100)));
    }
}
