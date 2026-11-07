<?php
namespace App\Http\Controllers\Api;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
class WeedController extends BaseApiController {
    protected string $modelClass = \App\Models\Weed::class;
    protected string $module = 'weeds';
    protected array $searchable = ['name', 'scientific_name', 'weed_type'];
    protected function rules(Request $r, ?Model $m = null): array {
        return [
            'name' => ['required', 'string', 'max:255'],
            'scientific_name' => ['nullable', 'string', 'max:255'],
            'weed_type' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'herbicide_recommendation' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
        ];
    }
    protected function beforeSave(Request $r, array $d, ?Model $m = null): array { if (!$m) $d['created_by'] = $r->user()->id; return $d; }
}
