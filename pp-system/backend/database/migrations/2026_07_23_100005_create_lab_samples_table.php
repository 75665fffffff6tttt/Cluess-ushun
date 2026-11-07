<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('lab_samples', function (Blueprint $table) {
            $table->id();
            $table->string('sample_code')->unique();
            $table->string('sample_type')->nullable(); // soil/plant/water/pesticide
            $table->string('crop')->nullable();
            $table->string('region')->nullable();
            $table->string('district')->nullable();
            $table->string('submitted_by')->nullable();
            $table->date('received_date')->nullable();
            $table->string('status')->default('registered'); // registered/in_analysis/completed
            $table->text('notes')->nullable();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['sample_code', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('lab_samples'); }
};
