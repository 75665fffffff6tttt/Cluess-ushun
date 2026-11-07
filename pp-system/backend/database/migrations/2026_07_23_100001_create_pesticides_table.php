<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('pesticides', function (Blueprint $table) {
            $table->id();
            $table->string('trade_name');
            $table->string('active_ingredient');
            $table->string('company')->nullable();
            $table->string('registration_number')->nullable();
            $table->date('registration_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('pesticide_type')->nullable(); // insecticide/fungicide/herbicide/...
            $table->string('formulation')->nullable();
            $table->string('application_rate')->nullable();
            $table->string('crop')->nullable();
            $table->string('target_pest')->nullable();
            $table->text('instructions')->nullable();
            $table->string('hazard_class')->nullable();
            $table->string('waiting_period')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['trade_name', 'active_ingredient']);
        });
    }
    public function down(): void { Schema::dropIfExists('pesticides'); }
};
