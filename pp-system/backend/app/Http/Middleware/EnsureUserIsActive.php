<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->user() && ! $request->user()->is_active) {
            $request->user()->currentAccessToken()?->delete();
            return response()->json(['message' => 'Ҳисоб фаол эмас (blocked).'], 403);
        }
        return $next($request);
    }
}
