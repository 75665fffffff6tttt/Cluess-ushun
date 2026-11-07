<?php
namespace App\Support;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
class ActivityLogger
{
    public static function log(string $action, ?int $userId = null, ?string $description = null, array $props = [], ?Request $request = null): void
    {
        $request ??= request();
        ActivityLog::create([
            'user_id' => $userId,
            'action' => $action,
            'description' => $description,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 500),
            'properties' => $props ?: null,
        ]);
    }
}
