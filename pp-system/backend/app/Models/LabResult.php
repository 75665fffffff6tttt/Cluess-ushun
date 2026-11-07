<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class LabResult extends Model {
    protected $guarded = ['id'];
    protected $casts = ['attachments' => 'array', 'analyzed_at' => 'datetime'];
    public function sample(): BelongsTo { return $this->belongsTo(LabSample::class, 'lab_sample_id'); }
}
