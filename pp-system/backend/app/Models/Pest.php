<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Pest extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    protected $casts = ['photos'=>'array','host_crops'=>'array'];
}
