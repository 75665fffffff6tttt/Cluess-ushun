<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('monitorings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->date('inspection_date')->nullable();
            $table->string('region')->nullable();
            $table->string('district')->nullable();
            $table->string('crop')->nullable();
            $table->decimal('latitude', 10, 6)->nullable();
            $table->decimal('longitude', 10, 6)->nullable();
            $table->decimal('area_ha', 10, 2)->nullable();
            $table->foreignId('pest_id')->nullable()->constrained('pests')->nullOnDelete();
            $table->foreignId('disease_id')->nullable()->constrained('diseases')->nullOnDelete();
            $table->string('severity')->nullable(); // low/medium/high
            $table->text('recommendations')->nullable();
            $table->json('photos')->nullable();
            $table->foreignId('inspector_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['inspection_date', 'region']);
        });
    }
    public function down(): void { Schema::dropIfExists('monitorings'); }
};
