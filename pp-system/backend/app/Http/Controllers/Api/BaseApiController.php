<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ActivityLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

abstract class BaseApiController extends Controller
{
    /** @var class-string<Model> */
    protected string $modelClass;

    /** Рухсат префикси (масалан "pesticides"). */
    protected string $module;

    /** Қидириладиган устунлар. */
    protected array $searchable = [];

    /** Фильтрланадиган устунлар (аниқ мослик). */
    protected array $filterable = [];

    /** Сақлаш/янгилаш валидация қоидалари. */
    abstract protected function rules(Request $request, ?Model $model = null): array;

    /** Eager-load муносабатлар. */
    protected array $with = [];

    protected function authorizeAction(Request $request, string $action): void
    {
        abort_unless($request->user()?->can("{$this->module}.{$action}"), 403, 'Рухсат йўқ.');
    }

    public function index(Request $request)
    {
        $this->authorizeAction($request, 'view');

        $query = $this->modelClass::query()->with($this->with);

        if ($q = trim((string) $request->query('q', ''))) {
            $query->where(function ($sub) use ($q) {
                foreach ($this->searchable as $col) {
                    $sub->orWhere($col, 'ilike', "%{$q}%");
                }
            });
        }

        foreach ($this->filterable as $col) {
            if ($request->filled($col)) {
                $query->where($col, $request->query($col));
            }
        }

        $sort = $request->query('sort', 'created_at');
        $dir = strtolower($request->query('dir', 'desc')) === 'asc' ? 'asc' : 'desc';
        if (in_array($sort, array_merge(['id', 'created_at', 'updated_at'], $this->searchable, $this->filterable), true)) {
            $query->orderBy($sort, $dir);
        }

        $perPage = min((int) $request->query('per_page', 15), 100);

        return response()->json($query->paginate($perPage));
    }

    public function show(Request $request, $id)
    {
        $this->authorizeAction($request, 'view');
        $model = $this->modelClass::with($this->with)->findOrFail($id);

        return response()->json(['data' => $model]);
    }

    public function store(Request $request)
    {
        $this->authorizeAction($request, 'create');
        $data = $request->validate($this->rules($request));
        $data = $this->beforeSave($request, $data);

        $model = $this->modelClass::create($data);
        ActivityLogger::log('create', $request->user()->id, class_basename($this->modelClass)." #{$model->id} created");

        return response()->json(['data' => $model->fresh($this->with)], 201);
    }

    public function update(Request $request, $id)
    {
        $this->authorizeAction($request, 'update');
        $model = $this->modelClass::findOrFail($id);
        $data = $request->validate($this->rules($request, $model));
        $data = $this->beforeSave($request, $data, $model);

        $model->update($data);
        ActivityLogger::log('update', $request->user()->id, class_basename($this->modelClass)." #{$model->id} updated");

        return response()->json(['data' => $model->fresh($this->with)]);
    }

    public function destroy(Request $request, $id)
    {
        $this->authorizeAction($request, 'delete');
        $model = $this->modelClass::findOrFail($id);
        $model->delete();
        ActivityLogger::log('delete', $request->user()->id, class_basename($this->modelClass)." #{$id} deleted");

        return response()->json(['message' => 'Ўчирилди.']);
    }

    /** Сақлашдан олдин маълумотни бойитиш (created_by ва ҳ.к.). */
    protected function beforeSave(Request $request, array $data, ?Model $model = null): array
    {
        return $data;
    }
}
