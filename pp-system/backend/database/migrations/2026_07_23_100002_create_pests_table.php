<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('pests', function (Blueprint $table) {
            $table->id();
            $table->string('scientific_name');
            $table->string('common_name')->nullable();
            $table->string('common_name_uz')->nullable();
            $table->string('common_name_ru')->nullable();
            $table->string('order_family')->nullable();
            $table->text('biology')->nullable();
            $table->text('damage')->nullable();
            $table->string('economic_threshold')->nullable();
            $table->text('control_measures')->nullable();
            $table->json('photos')->nullable();
            $table->json('host_crops')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['scientific_name', 'common_name']);
        });
    }
    public function down(): void { Schema::dropIfExists('pests'); }
};
