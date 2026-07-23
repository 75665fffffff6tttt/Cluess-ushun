"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "uz-Latn" | "uz-Cyrl" | "ru" | "en";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "uz-Latn", label: "O'zbekcha" },
  { code: "uz-Cyrl", label: "Ўзбекча" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];

type Dict = Record<string, [string, string, string, string]>; // [uz-Latn, uz-Cyrl, ru, en]

// Кетма-кетлик: uz-Latn, uz-Cyrl, ru, en
const DICT: Dict = {
  app_name: ["O'simliklarni himoya qilish tizimi", "Ўсимликларни ҳимоя қилиш тизими", "Система защиты растений", "Plant Protection System"],
  login: ["Kirish", "Кириш", "Вход", "Login"],
  logout: ["Chiqish", "Чиқиш", "Выход", "Logout"],
  username: ["Login", "Логин", "Логин", "Username"],
  password: ["Parol", "Парол", "Пароль", "Password"],
  remember_me: ["Meni eslab qol", "Мени эслаб қол", "Запомнить меня", "Remember me"],
  forgot_password: ["Parolni unutdingizmi?", "Паролни унутдингизми?", "Забыли пароль?", "Forgot password?"],
  sign_in: ["Tizimga kirish", "Тизимга кириш", "Войти в систему", "Sign in"],
  dashboard: ["Boshqaruv paneli", "Бошқарув панели", "Панель управления", "Dashboard"],
  users: ["Foydalanuvchilar", "Фойдаланувчилар", "Пользователи", "Users"],
  pesticides: ["Pestitsidlar", "Пестицидлар", "Пестициды", "Pesticides"],
  pests: ["Zararkunandalar", "Зараркунандалар", "Вредители", "Pests"],
  diseases: ["Kasalliklar", "Касалликлар", "Болезни", "Diseases"],
  weeds: ["Begona o'tlar", "Бегона ўтлар", "Сорняки", "Weeds"],
  laboratory: ["Laboratoriya", "Лаборатория", "Лаборатория", "Laboratory"],
  monitoring: ["Monitoring", "Мониторинг", "Мониторинг", "Monitoring"],
  reports: ["Hisobotlar", "Ҳисоботлар", "Отчёты", "Reports"],
  activity_log: ["Faoliyat jurnali", "Фаолият журнали", "Журнал активности", "Activity Log"],
  total: ["Jami", "Жами", "Всего", "Total"],
  latest_activities: ["So'nggi faoliyat", "Сўнгги фаолият", "Последние действия", "Latest Activities"],
  search: ["Qidirish", "Қидириш", "Поиск", "Search"],
  create: ["Qo'shish", "Қўшиш", "Создать", "Create"],
  edit: ["Tahrirlash", "Таҳрирлаш", "Изменить", "Edit"],
  delete: ["O'chirish", "Ўчириш", "Удалить", "Delete"],
  save: ["Saqlash", "Сақлаш", "Сохранить", "Save"],
  cancel: ["Bekor qilish", "Бекор қилиш", "Отмена", "Cancel"],
  actions: ["Amallar", "Амаллар", "Действия", "Actions"],
  role: ["Rol", "Роль", "Роль", "Role"],
  profile: ["Profil", "Профил", "Профиль", "Profile"],
  settings: ["Sozlamalar", "Созламалар", "Настройки", "Settings"],
  change_password: ["Parolni o'zgartirish", "Паролни ўзгартириш", "Сменить пароль", "Change Password"],
  loading: ["Yuklanmoqda...", "Юкланмоқда...", "Загрузка...", "Loading..."],
  no_data: ["Ma'lumot yo'q", "Маълумот йўқ", "Нет данных", "No data"],
  confirm_delete: ["Rostdan o'chirilsinmi?", "Ростдан ўчирилсинми?", "Действительно удалить?", "Really delete?"],
  government_portal: ["Davlat axborot tizimi", "Давлат ахборот тизими", "Государственная информационная система", "Government Information System"],
};

const idx: Record<Lang, number> = { "uz-Latn": 0, "uz-Cyrl": 1, ru: 2, en: 3 };

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string } | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uz-Latn");

  useEffect(() => {
    const saved = localStorage.getItem("pp_lang") as Lang | null;
    if (saved && idx[saved] !== undefined) setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("pp_lang", l);
  };

  const t = (k: string) => {
    const entry = DICT[k];
    return entry ? entry[idx[lang]] : k;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
