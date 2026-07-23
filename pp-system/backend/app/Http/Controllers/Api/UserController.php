<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ActivityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private function authorizeAction(Request $request, string $action): void
    {
        abort_unless($request->user()?->can("users.{$action}"), 403, 'Рухсат йўқ.');
    }

    public function index(Request $request)
    {
        $this->authorizeAction($request, 'view');
        $query = User::with('roles');

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(fn ($s) => $s->where('username', 'ilike', "%{$q}%")
                ->orWhere('name', 'ilike', "%{$q}%")
                ->orWhere('email', 'ilike', "%{$q}%"));
        }
        if ($request->filled('role')) {
            $query->whereHas('roles', fn ($r) => $r->where('name', $request->query('role')));
        }

        return response()->json($query->orderByDesc('created_at')->paginate(min((int) $request->query('per_page', 15), 100)));
    }

    public function show(Request $request, User $user)
    {
        $this->authorizeAction($request, 'view');

        return response()->json(['data' => $user->load('roles')]);
    }

    public function store(Request $request)
    {
        $this->authorizeAction($request, 'create');
        $data = $request->validate([
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'organization' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', 'exists:roles,name'],
            'is_active' => ['sometimes', 'boolean'],
            'locale' => ['sometimes', 'string', 'max:8'],
        ]);

        $user = User::create([
            'username' => $data['username'],
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
            'organization' => $data['organization'] ?? null,
            'password' => Hash::make($data['password']),
            'is_active' => $data['is_active'] ?? true,
            'locale' => $data['locale'] ?? 'uz-Latn',
        ]);
        $user->syncRoles([$data['role']]);
        ActivityLogger::log('create', $request->user()->id, "User {$user->username} created");

        return response()->json(['data' => $user->load('roles')], 201);
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeAction($request, 'update');
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', "unique:users,email,{$user->id}"],
            'phone' => ['nullable', 'string', 'max:50'],
            'organization' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'string', 'exists:roles,name'],
            'is_active' => ['sometimes', 'boolean'],
            'locale' => ['sometimes', 'string', 'max:8'],
        ]);

        $user->fill(collect($data)->except(['password', 'role'])->toArray());
        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }
        $user->save();
        if (! empty($data['role'])) {
            $user->syncRoles([$data['role']]);
        }
        ActivityLogger::log('update', $request->user()->id, "User {$user->username} updated");

        return response()->json(['data' => $user->load('roles')]);
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorizeAction($request, 'delete');
        abort_if($user->id === $request->user()->id, 422, 'Ўзингизни ўчира олмайсиз.');
        $user->delete();
        ActivityLogger::log('delete', $request->user()->id, "User {$user->username} deleted");

        return response()->json(['message' => 'Ўчирилди.']);
    }

    public function roles(Request $request)
    {
        $this->authorizeAction($request, 'view');

        return response()->json(['data' => Role::pluck('name')]);
    }
}
