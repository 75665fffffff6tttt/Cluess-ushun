<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
class LabSample extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    protected $casts = ['received_date' => 'date'];
    public function results(): HasMany { return $this->hasMany(LabResult::class); }
}
