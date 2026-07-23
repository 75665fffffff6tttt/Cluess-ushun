<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('report_type'); // daily/weekly/monthly/yearly
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->json('data')->nullable();
            $table->text('summary')->nullable();
            $table->string('file_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['report_type', 'period_start']);
        });
    }
    public function down(): void { Schema::dropIfExists('reports'); }
};
