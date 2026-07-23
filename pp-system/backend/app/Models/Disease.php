<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Disease extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    protected $casts = ['images'=>'array','host_crops'=>'array'];
}
