<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'active' => \App\Http\Middleware\EnsureUserIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, $request) {
            if ($request->is('api/*')) {
                $status = 500;
                if ($e instanceof \Illuminate\Auth\AuthenticationException) $status = 401;
                elseif ($e instanceof \Illuminate\Auth\Access\AuthorizationException) $status = 403;
                elseif ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) $status = $e->getStatusCode();
                elseif ($e instanceof \Illuminate\Validation\ValidationException) {
                    return response()->json(['message' => $e->getMessage(), 'errors' => $e->errors()], 422);
                }

                return response()->json([
                    'message' => $status === 500 && ! config('app.debug') ? 'Server error' : $e->getMessage(),
                ], $status);
            }
        });
    })->create();
