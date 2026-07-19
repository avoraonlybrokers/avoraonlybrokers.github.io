const AVORA_I18N = {
  ru: {
    brand_name: "AVORA",
    brand_by: "by Onlybrokers Partner",
    brand_tagline: "Premium Real Estate",
    brand_regions: "Dubai • Bali • Thailand",
    hero_cta: "Найти недвижимость",
    direct_from_developer: "Недвижимость напрямую от застройщика",
    nav_projects: "Объекты",
    nav_developers: "Застройщики",
    listing_title: "Активные объекты",
    listing_subtitle: "Кураторская подборка резиденций от проверенных застройщиков",
    listing_from: "от",
    listing_empty: "Скоро здесь появятся новые объекты.",
    price_from: "Цена от",
    handover: "Срок сдачи",
    yield: "Доходность",
    format: "Формат проекта",
    payment_plan: "Схема рассрочки",
    about: "О проекте",
    amenities: "Удобства",
    extra: "Дополнительная информация",
    apartments_title: "Варианты апартаментов",
    open_in_maps: "Открыть в Google Maps",
    developer_label: "Застройщик",
    send_lead: "Отправить заявку застройщику",
    trust_title: "Проверено Onlybrokers",
    trust_history: "История застройщика",
    trust_legal: "Юридическая проверка",
    trust_construction: "Ход строительства",
    trust_contract: "Анализ контракта",
    bedrooms: "Спальни",
    studio: "Студия",
    area: "Площадь",
    description: "Описание",
    floor_plan: "Планировка",
    specs: "Характеристики",
    back_to_apartments: "Ко всем вариантам",
    developers_title: "Застройщики",
    developers_subtitle: "Ведущие мировые застройщики и девелоперы",
    official_site: "Официальный сайт",
    projects_of_developer: "Проекты застройщика",
    footer_social: "Social Media",
    footer_contacts: "Контакты",
    admin_modal_title: "AVORA Admin",
    admin_password_label: "Введите пароль",
    admin_password_placeholder: "Пароль",
    admin_login: "Войти",
    admin_invalid: "Неверные данные доступа.",
    form_name: "Имя",
    form_phone: "Телефон",
    form_email: "Email",
    form_message: "Сообщение",
    form_submit: "Отправить заявку",
    form_sent: "Заявка отправлена",
  },
  en: {
    brand_name: "AVORA",
    brand_by: "by Onlybrokers Partner",
    brand_tagline: "Premium Real Estate",
    brand_regions: "Dubai • Bali • Thailand",
    hero_cta: "Find Your Property",
    direct_from_developer: "Real estate directly from the developer",
    nav_projects: "Projects",
    nav_developers: "Developers",
    listing_title: "Active Residences",
    listing_subtitle: "A curated selection of residences from trusted developers",
    listing_from: "from",
    listing_empty: "New properties are on their way.",
    price_from: "Price from",
    handover: "Handover",
    yield: "Yield",
    format: "Project format",
    payment_plan: "Payment plan",
    about: "About the project",
    amenities: "Amenities",
    extra: "Additional information",
    apartments_title: "Available layouts",
    open_in_maps: "Open in Google Maps",
    developer_label: "Developer",
    send_lead: "Send inquiry to developer",
    trust_title: "Verified by Onlybrokers",
    trust_history: "Developer history",
    trust_legal: "Legal due diligence",
    trust_construction: "Construction progress",
    trust_contract: "Contract analysis",
    bedrooms: "Bedrooms",
    studio: "Studio",
    area: "Area",
    description: "Description",
    floor_plan: "Floor plan",
    specs: "Specifications",
    back_to_apartments: "Back to all layouts",
    developers_title: "Developers",
    developers_subtitle: "Leading global developers and builders",
    official_site: "Official website",
    projects_of_developer: "Projects by this developer",
    footer_social: "Social Media",
    footer_contacts: "Contacts",
    admin_modal_title: "AVORA Admin",
    admin_password_label: "Enter password",
    admin_password_placeholder: "Password",
    admin_login: "Login",
    admin_invalid: "Invalid access credentials.",
    form_name: "Name",
    form_phone: "Phone",
    form_email: "Email",
    form_message: "Message",
    form_submit: "Submit inquiry",
    form_sent: "Inquiry sent",
  },
};

function avoraGetLocale() {
  return localStorage.getItem("avora_locale") === "en" ? "en" : "ru";
}

function avoraSetLocale(locale) {
  localStorage.setItem("avora_locale", locale);
  document.documentElement.lang = locale;
  avoraApplyTranslations();
  document.dispatchEvent(new CustomEvent("avora:locale-changed", { detail: { locale } }));
}

function avoraT(key) {
  const locale = avoraGetLocale();
  return AVORA_I18N[locale][key] ?? AVORA_I18N.ru[key] ?? key;
}

// Picks name_ru/name_en (or any_ru/any_en) style bilingual field from a DB row.
function avoraPick(row, field) {
  if (!row) return null;
  const locale = avoraGetLocale();
  return row[`${field}_${locale}`] ?? null;
}

// Applies translations to every element with [data-i18n] in the current DOM.
function avoraApplyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = avoraT(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", avoraT(el.getAttribute("data-i18n-placeholder")));
  });
}
