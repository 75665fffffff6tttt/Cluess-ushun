<?php

namespace App\Http\Controllers\Api;

use App\Models\LabResult;
use App\Models\LabSample;
use App\Support\ActivityLogger;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LabSampleController extends BaseApiController
{
    protected string $modelClass = LabSample::class;
    protected string $module = 'lab';
    protected array $searchable = ['sample_code', 'crop', 'region', 'district', 'submitted_by'];
    protected array $filterable = ['status', 'sample_type', 'region'];
    protected array $with = ['results'];

    protected function rules(Request $request, ?Model $model = null): array
    {
        $id = $model?->id;

        return [
            'sample_code' => ['required', 'string', 'max:255', "unique:lab_samples,sample_code,{$id}"],
            'sample_type' => ['nullable', 'string', 'max:100'],
            'crop' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'district' => ['nullable', 'string', 'max:255'],
            'submitted_by' => ['nullable', 'string', 'max:255'],
            'received_date' => ['nullable', 'date'],
            'status' => ['nullable', 'in:registered,in_analysis,completed'],
            'notes' => ['nullable', 'string'],
        ];
    }

    protected function beforeSave(Request $request, array $data, ?Model $model = null): array
    {
        if (! $model) {
            $data['registered_by'] = $request->user()->id;
        }

        return $data;
    }

    /** Намунага таҳлил натижаси қўшиш. */
    public function addResult(Request $request, $id)
    {
        $this->authorizeAction($request, 'update');
        $sample = LabSample::findOrFail($id);

        $data = $request->validate([
            'parameter' => ['required', 'string', 'max:255'],
            'value' => ['nullable', 'string', 'max:255'],
            'unit' => ['nullable', 'string', 'max:50'],
            'method' => ['nullable', 'string', 'max:255'],
            'conclusion' => ['nullable', 'string', 'max:255'],
            'attachments' => ['nullable', 'array'],
        ]);
        $data['lab_sample_id'] = $sample->id;
        $data['analyst_id'] = $request->user()->id;
        $data['analyzed_at'] = now();

        $result = LabResult::create($data);
        ActivityLogger::log('create', $request->user()->id, "LabResult #{$result->id} added to sample {$sample->sample_code}");

        return response()->json(['data' => $result], 201);
    }
}
