<?php

namespace Database\Seeders;

use App\Models\Disease;
use App\Models\Pest;
use App\Models\Pesticide;
use App\Models\User;
use App\Models\Weed;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        // Асосий фойдаланувчилар (ҳар роль учун биттадан)
        $users = [
            ['username' => 'superadmin', 'name' => 'Super Administrator', 'role' => 'super_admin'],
            ['username' => 'admin',      'name' => 'Administrator',       'role' => 'admin'],
            ['username' => 'lab',        'name' => 'Laboratory User',     'role' => 'laboratory'],
            ['username' => 'inspector',  'name' => 'Field Inspector',     'role' => 'inspector'],
            ['username' => 'researcher', 'name' => 'Researcher',          'role' => 'researcher'],
            ['username' => 'farmer',     'name' => 'Farmer',              'role' => 'farmer'],
        ];

        foreach ($users as $u) {
            $user = User::firstOrCreate(
                ['username' => $u['username']],
                [
                    'name' => $u['name'],
                    'email' => $u['username'].'@ppsystem.uz',
                    'password' => Hash::make('password'),
                    'is_active' => true,
                    'locale' => 'uz-Latn',
                ]
            );
            $user->syncRoles([$u['role']]);
        }

        // Намуна маълумотлар
        if (Pesticide::count() === 0) {
            Pesticide::insert([
                ['trade_name' => 'Aktellik', 'active_ingredient' => 'Pirimifos-metil 500 g/l', 'company' => 'Syngenta', 'registration_number' => 'UZ-0001', 'pesticide_type' => 'insecticide', 'application_rate' => '1,0 l/ha', 'crop' => "G'o'za", 'target_pest' => "O'rgimchakkana", 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['trade_name' => 'Flurog 40', 'active_ingredient' => 'Fluroxypyr', 'company' => 'AGRO-SERVICE-TORG', 'registration_number' => 'UZ-0002', 'pesticide_type' => 'herbicide', 'application_rate' => '0,5 l/ha', 'crop' => "Kuzgi bug'doy", 'target_pest' => "Ikki pallali begona o'tlar", 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
                ['trade_name' => 'Tebukonazol', 'active_ingredient' => 'Tebuconazole 250 g/l', 'company' => 'Bayer', 'registration_number' => 'UZ-0003', 'pesticide_type' => 'fungicide', 'application_rate' => '0,5 l/ha', 'crop' => "Bug'doy", 'target_pest' => 'Un-shudring', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        if (Pest::count() === 0) {
            Pest::insert([
                ['scientific_name' => 'Tetranychus urticae', 'common_name' => 'Two-spotted spider mite', 'common_name_uz' => "O'rgimchakkana", 'common_name_ru' => 'Паутинный клещ', 'economic_threshold' => '3-5 dona/barg', 'created_at' => now(), 'updated_at' => now()],
                ['scientific_name' => 'Aphis gossypii', 'common_name' => 'Cotton aphid', 'common_name_uz' => "G'o'za shirasi", 'common_name_ru' => 'Хлопковая тля', 'economic_threshold' => '10-15%', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        if (Disease::count() === 0) {
            Disease::insert([
                ['name' => 'Powdery mildew', 'name_uz' => 'Un-shudring', 'name_ru' => 'Мучнистая роса', 'pathogen_type' => 'fungal', 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Verticillium wilt', 'name_uz' => 'Vilt', 'name_ru' => 'Вилт', 'pathogen_type' => 'fungal', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        if (Weed::count() === 0) {
            Weed::insert([
                ['name' => "Sho'ra", 'scientific_name' => 'Amaranthus retroflexus', 'weed_type' => 'annual dicot', 'created_at' => now(), 'updated_at' => now()],
                ['name' => "Qo'ypechak", 'scientific_name' => 'Convolvulus arvensis', 'weed_type' => 'perennial dicot', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }
    }
}
