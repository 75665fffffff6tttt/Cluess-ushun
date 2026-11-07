<?php
namespace App\Http\Controllers\Api;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
class PesticideController extends BaseApiController {
    protected string $modelClass = \App\Models\Pesticide::class;
    protected string $module = 'pesticides';
    protected array $searchable = ['trade_name', 'active_ingredient', 'company', 'registration_number', 'crop', 'target_pest'];
    protected array $filterable = ['pesticide_type', 'is_active'];
    protected function rules(Request $r, ?Model $m = null): array {
        return [
            'trade_name' => ['required', 'string', 'max:255'],
            'active_ingredient' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'registration_number' => ['nullable', 'string', 'max:255'],
            'registration_date' => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date'],
            'pesticide_type' => ['nullable', 'string', 'max:100'],
            'formulation' => ['nullable', 'string', 'max:255'],
            'application_rate' => ['nullable', 'string', 'max:255'],
            'crop' => ['nullable', 'string', 'max:255'],
            'target_pest' => ['nullable', 'string', 'max:255'],
            'instructions' => ['nullable', 'string'],
            'hazard_class' => ['nullable', 'string', 'max:50'],
            'waiting_period' => ['nullable', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
    protected function beforeSave(Request $r, array $d, ?Model $m = null): array {
        if (!$m) $d['created_by'] = $r->user()->id;
        return $d;
    }
}
