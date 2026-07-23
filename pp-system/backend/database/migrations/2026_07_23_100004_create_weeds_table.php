<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('weeds', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('scientific_name')->nullable();
            $table->string('weed_type')->nullable(); // annual/perennial, mono/dicot
            $table->text('description')->nullable();
            $table->text('herbicide_recommendation')->nullable();
            $table->json('images')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index('name');
        });
    }
    public function down(): void { Schema::dropIfExists('weeds'); }
};
