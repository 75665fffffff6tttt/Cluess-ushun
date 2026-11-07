<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('lab_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lab_sample_id')->constrained()->cascadeOnDelete();
            $table->string('parameter');
            $table->string('value')->nullable();
            $table->string('unit')->nullable();
            $table->string('method')->nullable();
            $table->string('conclusion')->nullable();
            $table->json('attachments')->nullable();
            $table->foreignId('analyst_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('analyzed_at')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('lab_results'); }
};
