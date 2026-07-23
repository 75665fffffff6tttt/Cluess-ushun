<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class Monitoring extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    protected $casts = ['photos' => 'array', 'inspection_date' => 'date', 'latitude' => 'float', 'longitude' => 'float', 'area_ha' => 'float'];
    public function pest(): BelongsTo { return $this->belongsTo(Pest::class); }
    public function disease(): BelongsTo { return $this->belongsTo(Disease::class); }
    public function inspector(): BelongsTo { return $this->belongsTo(User::class, 'inspector_id'); }
}
