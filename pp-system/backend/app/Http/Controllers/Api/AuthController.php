<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        $user = User::where('username', $data['username'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            ActivityLogger::log('login_failed', $user?->id, 'Failed login for '.$data['username']);
            throw ValidationException::withMessages([
                'username' => ['Логин ёки парол нотўғри.'],
            ]);
        }

        if (! $user->is_active) {
            ActivityLogger::log('login_blocked', $user->id, 'Blocked account login attempt');
            throw ValidationException::withMessages([
                'username' => ['Ҳисоб фаол эмас. Администраторга мурожаат қилинг.'],
            ]);
        }

        $expiresAt = ! empty($data['remember']) ? now()->addDays(30) : now()->addHours(8);
        $token = $user->createToken('api', ['*'], $expiresAt)->plainTextToken;

        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();

        ActivityLogger::log('login', $user->id, 'Successful login');

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    public function logout(Request $request)
    {
        ActivityLogger::log('logout', $request->user()->id, 'Logout');
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Тизимдан чиқилди.']);
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Жорий парол нотўғри.']]);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();
        ActivityLogger::log('password_changed', $user->id, 'Password changed');

        return response()->json(['message' => 'Парол янгиланди.']);
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate(['username' => ['required', 'string']]);
        // Ишлаб чиқаришда: email/СМС орқали токен юборилади. Бу ерда фақат қабул қилинади.
        ActivityLogger::log('password_reset_requested', null, 'Reset requested for '.$data['username']);

        return response()->json([
            'message' => 'Агар ҳисоб мавжуд бўлса, паролни тиклаш кўрсатмаси юборилди. Администраторга мурожаат қилинг.',
        ]);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'organization' => $user->organization,
            'locale' => $user->locale,
            'is_active' => $user->is_active,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'last_login_at' => $user->last_login_at,
        ];
    }
}
