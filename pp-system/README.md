# Plant Protection Information System (PP System)

Ўсимликларни ҳимоя қилиш, пестицидлар, зараркунандалар мониторинги, лаборатория
маълумотлари ва ҳисоботларни бошқариш учун **хавфсиз веб-платформа**.

> Давлат ахборот тизими услубида — рол асосидаги кириш, аноним кириш мумкин эмас.

---

## Технологиялар

| Қатлам | Стек |
|--------|------|
| Frontend | Next.js + React + TypeScript + Tailwind CSS |
| Backend | Laravel 12 REST API |
| Маълумотлар базаси | PostgreSQL |
| Аутентификация | Laravel Sanctum (Bearer token) |
| RBAC | spatie/laravel-permission |
| Графиклар | ApexCharts | 
| Иконкалар | Lucide |
| PDF / Excel | dompdf / maatwebsite-excel (backend) |

---

## Тузилиш

```
pp-system/
├── backend/            # Laravel 12 REST API
│   ├── app/Models/                 # 10 модел
│   ├── app/Http/Controllers/Api/   # Auth + модул контроллерлари
│   ├── app/Http/Middleware/        # EnsureUserIsActive
│   ├── database/migrations/        # 14 миграция
│   ├── database/seeders/           # роллар + намуна маълумот
│   └── routes/api.php              # /api/v1/*
├── frontend/           # Next.js admin panel
│   ├── src/app/login/              # логин саҳифаси
│   ├── src/app/(admin)/            # auth-gated shell + модул саҳифалари
│   ├── src/components/ResourceModule.tsx  # умумий CRUD
│   └── src/lib/                    # api, auth, theme, i18n
└── docker-compose.yml
```

---

## Роллар ва рухсатлар (RBAC)

| Роль | Рухсатлар |
|------|-----------|
| **super_admin** | Барча модуллар — тўлиқ |
| **admin** | Барчаси (фойдаланувчини ўчиришдан ташқари) |
| **laboratory** | Лаборатория CRUD + барчасини кўриш + ҳисобот |
| **inspector** | Мониторинг CRUD + барчасини кўриш + ҳисобот |
| **researcher** | Пестицид/зараркунанда/касаллик/бегона ўт таҳрирлаш + ҳисобот |
| **farmer** | Фақат кўриш (пестицид, зараркунанда, касаллик, бегона ўт) |

40 рухсат = 8 модуль × 5 амал (view/create/update/delete/export).

### Демо фойдаланувчилар (парол: `password`)

`superadmin` · `admin` · `lab` · `inspector` · `researcher` · `farmer`

---

## ER диаграмма

```mermaid
erDiagram
    users ||--o{ activity_logs : "performs"
    users ||--o{ pesticides : "creates"
    users ||--o{ monitorings : "inspects"
    lab_samples ||--o{ lab_results : "has"
    users ||--o{ lab_samples : "registers"
    pests ||--o{ monitorings : "observed_in"
    diseases ||--o{ monitorings : "observed_in"
    roles }o--o{ users : "assigned (spatie)"
    permissions }o--o{ roles : "granted (spatie)"

    users { bigint id PK; string username UK; string name; string password; bool is_active; string locale }
    pesticides { bigint id PK; string trade_name; string active_ingredient; string registration_number; date expiry_date }
    pests { bigint id PK; string scientific_name; string common_name; string economic_threshold }
    diseases { bigint id PK; string name; string pathogen_type; text symptoms }
    weeds { bigint id PK; string name; string scientific_name; text herbicide_recommendation }
    lab_samples { bigint id PK; string sample_code UK; string status }
    lab_results { bigint id PK; bigint lab_sample_id FK; string parameter; string value }
    monitorings { bigint id PK; date inspection_date; decimal latitude; decimal longitude; string severity }
    reports { bigint id PK; string report_type; date period_start; date period_end }
    activity_logs { bigint id PK; bigint user_id FK; string action; string ip_address }
```

---

## API (REST, `/api/v1`)

| Метод | Йўл | Изоҳ |
|-------|-----|------|
| POST | `/auth/login` | Логин (username, password, remember) → Bearer token |
| POST | `/auth/logout` | Чиқиш |
| GET | `/auth/me` | Жорий фойдаланувчи + роллар + рухсатлар |
| POST | `/auth/change-password` | Паролни ўзгартириш |
| POST | `/auth/forgot-password` | Паролни тиклаш сўрови |
| GET | `/dashboard/stats` | Статистика + графиклар + сўнгги фаолият |
| — | `/users`, `/pesticides`, `/pests`, `/diseases`, `/weeds`, `/reports`, `/monitoring`, `/lab-samples` | CRUD (index/show/store/update/destroy) |
| POST | `/lab-samples/{id}/results` | Лаборатория натижаси қўшиш |
| GET | `/activity-logs` | Фаолият журнали |

Барча `/api/v1/*` (auth'дан ташқари) — `auth:sanctum` + фаол ҳисоб + рол-рухсат текшируви.
Индекс йўллари: `?q=` (қидирув), фильтрлар, `?sort=&dir=`, `?page=&per_page=` (пагинация).

---

## Ўрнатиш — Docker (тавсия)

```bash
cd pp-system
docker compose up --build
```
- Backend API: http://localhost:8090/api/v1
- Frontend: http://localhost:3000
- PostgreSQL авто-миграция + сидер қилинади.

`superadmin / password` билан киринг.

---

## Ўрнатиш — қўлбола (локал)

### Backend
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
# .env да PostgreSQL созламаларини киритинг (pp_system / ppsys / ppsys)
php artisan migrate --seed
php artisan serve --port=8090
```

### Frontend
```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8090/api/v1
npm install
npm run dev                  # http://localhost:3000
```

---

## Хавфсизлик

- Парол bcrypt билан ҳашланади (Laravel `hashed` cast).
- Sanctum Bearer token; remember-me → 30 кун, акс ҳолда 8 соат амал қилади.
- Фаол бўлмаган ҳисоб токени бекор қилинади (`active` middleware).
- Барча кириш/чиқиш/муваффақиятсиз уриниш `activity_logs`га ёзилади.
- SQL-инъекция — Eloquent parametr binding; XSS — React авто-escaping;
  валидация — FormRequest қоидалари; CORS — `config/cors.php`.

---

## Ҳолат

- ✅ **Phase 1** — Backend (схема, RBAC, аутентификация, барча модуль CRUD) — тестдан ўтган.
- ✅ **Phase 2** — Frontend (логин, admin shell, dashboard, 8 модуль саҳифаси, i18n, dark mode) — тестдан ўтган.
- ✅ **Phase 3** — Docker, ER диаграмма, ҳужжатлар.

### Кейинги режа
- PDF/Excel экспортни frontend тугмаларига улаш, файл юклаш (S3), TanStack Table
  кенгайтирилган хусусиятлари, парол тиклаш email/СМС, тўлиқ тест қамрови,
  Swagger/OpenAPI ҳужжати.
