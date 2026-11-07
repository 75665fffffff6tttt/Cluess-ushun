<?php
namespace App\Http\Controllers\Api;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
class DiseaseController extends BaseApiController {
    protected string $modelClass = \App\Models\Disease::class;
    protected string $module = 'diseases';
    protected array $searchable = ['name', 'name_uz', 'name_ru', 'scientific_name'];
    protected array $filterable = ['pathogen_type'];
    protected function rules(Request $r, ?Model $m = null): array {
        return [
            'name' => ['required', 'string', 'max:255'],
            'name_uz' => ['nullable', 'string', 'max:255'],
            'name_ru' => ['nullable', 'string', 'max:255'],
            'scientific_name' => ['nullable', 'string', 'max:255'],
            'pathogen_type' => ['nullable', 'string', 'max:100'],
            'symptoms' => ['nullable', 'string'],
            'control' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
            'host_crops' => ['nullable', 'array'],
        ];
    }
    protected function beforeSave(Request $r, array $d, ?Model $m = null): array { if (!$m) $d['created_by'] = $r->user()->id; return $d; }
}
