<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Pesticide extends Model {
    use SoftDeletes;
    protected $guarded = ['id'];
    protected $casts = ['is_active'=>'boolean','registration_date'=>'date','expiry_date'=>'date'];
}
