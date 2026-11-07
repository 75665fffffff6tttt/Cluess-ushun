<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DiseaseController;
use App\Http\Controllers\Api\LabSampleController;
use App\Http\Controllers\Api\MonitoringController;
use App\Http\Controllers\Api\PestController;
use App\Http\Controllers\Api\PesticideController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WeedController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // --- Очиқ (аутентификациясиз) ---
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);

    // --- Ҳимояланган ---
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/change-password', [AuthController::class, 'changePassword']);

        Route::get('dashboard/stats', [DashboardController::class, 'stats']);

        // Фойдаланувчилар бошқаруви
        Route::get('users/roles', [UserController::class, 'roles']);
        Route::apiResource('users', UserController::class);

        // Модуллар (CRUD)
        Route::apiResource('pesticides', PesticideController::class);
        Route::apiResource('pests', PestController::class);
        Route::apiResource('diseases', DiseaseController::class);
        Route::apiResource('weeds', WeedController::class);
        Route::apiResource('reports', ReportController::class);
        Route::apiResource('monitoring', MonitoringController::class)->parameters(['monitoring' => 'id']);

        // Лаборатория
        Route::post('lab-samples/{id}/results', [LabSampleController::class, 'addResult']);
        Route::apiResource('lab-samples', LabSampleController::class)->parameters(['lab-samples' => 'id']);

        // Фаолият журнали
        Route::get('activity-logs', [ActivityLogController::class, 'index']);
    });
});
