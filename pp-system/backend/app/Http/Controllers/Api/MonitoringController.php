<?php
namespace App\Http\Controllers\Api;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
class MonitoringController extends BaseApiController {
    protected string $modelClass = \App\Models\Monitoring::class;
    protected string $module = 'monitoring';
    protected array $searchable = ['title', 'region', 'district', 'crop'];
    protected array $filterable = ['region', 'severity', 'crop'];
    protected array $with = ['pest', 'disease', 'inspector'];
    protected function rules(Request $r, ?Model $m = null): array {
        return [
            'title' => ['required', 'string', 'max:255'],
            'inspection_date' => ['nullable', 'date'],
            'region' => ['nullable', 'string', 'max:255'],
            'district' => ['nullable', 'string', 'max:255'],
            'crop' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'area_ha' => ['nullable', 'numeric', 'min:0'],
            'pest_id' => ['nullable', 'exists:pests,id'],
            'disease_id' => ['nullable', 'exists:diseases,id'],
            'severity' => ['nullable', 'in:low,medium,high'],
            'recommendations' => ['nullable', 'string'],
            'photos' => ['nullable', 'array'],
        ];
    }
    protected function beforeSave(Request $r, array $d, ?Model $m = null): array { if (!$m) $d['inspector_id'] = $r->user()->id; return $d; }
}
