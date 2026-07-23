<?php
namespace App\Http\Controllers\Api;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
class PestController extends BaseApiController {
    protected string $modelClass = \App\Models\Pest::class;
    protected string $module = 'pests';
    protected array $searchable = ['scientific_name', 'common_name', 'common_name_uz', 'common_name_ru'];
    protected function rules(Request $r, ?Model $m = null): array {
        return [
            'scientific_name' => ['required', 'string', 'max:255'],
            'common_name' => ['nullable', 'string', 'max:255'],
            'common_name_uz' => ['nullable', 'string', 'max:255'],
            'common_name_ru' => ['nullable', 'string', 'max:255'],
            'order_family' => ['nullable', 'string', 'max:255'],
            'biology' => ['nullable', 'string'],
            'damage' => ['nullable', 'string'],
            'economic_threshold' => ['nullable', 'string', 'max:255'],
            'control_measures' => ['nullable', 'string'],
            'photos' => ['nullable', 'array'],
            'host_crops' => ['nullable', 'array'],
        ];
    }
    protected function beforeSave(Request $r, array $d, ?Model $m = null): array { if (!$m) $d['created_by'] = $r->user()->id; return $d; }
}
