<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('diseases', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('name_uz')->nullable();
            $table->string('name_ru')->nullable();
            $table->string('scientific_name')->nullable();
            $table->string('pathogen_type')->nullable(); // fungal/bacterial/viral
            $table->text('symptoms')->nullable();
            $table->text('control')->nullable();
            $table->json('images')->nullable();
            $table->json('host_crops')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('name');
        });
    }
    public function down(): void { Schema::dropIfExists('diseases'); }
};
