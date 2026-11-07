<?php
namespace App\Http\Controllers\Api;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
class ReportController extends BaseApiController {
    protected string $modelClass = \App\Models\Report::class;
    protected string $module = 'reports';
    protected array $searchable = ['title', 'summary'];
    protected array $filterable = ['report_type'];
    protected function rules(Request $r, ?Model $m = null): array {
        return [
            'title' => ['required', 'string', 'max:255'],
            'report_type' => ['required', 'in:daily,weekly,monthly,yearly'],
            'period_start' => ['nullable', 'date'],
            'period_end' => ['nullable', 'date'],
            'data' => ['nullable', 'array'],
            'summary' => ['nullable', 'string'],
        ];
    }
    protected function beforeSave(Request $r, array $d, ?Model $m = null): array { if (!$m) $d['created_by'] = $r->user()->id; return $d; }
}
