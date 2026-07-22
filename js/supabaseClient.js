// Requires the Supabase CDN script to be loaded first:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
// and js/config.js before this file.

const supabaseClient = window.supabase.createClient(
  AVORA_CONFIG.SUPABASE_URL,
  AVORA_CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "avora-auth",
      // Сессия хранится в localStorage, пока не истечёт refresh_token
      // Настраивается в Supabase → Authentication → Settings → Refresh Token
      // Рекомендуем установить 30 дней (2592000 секунд)
    },
  }
);

// ============================================================
// Проверка и продление сессии админа
// ============================================================

// Функция для проверки, жив ли админ
// Если сессия истекла — перенаправляет на главную
async function avoraCheckAdminSession() {
  const { data } = await supabaseClient.auth.getSession();
  const session = data?.session;
  
  if (!session) {
    // Сессии нет — перенаправляем, если мы в админке
    if (window.location.pathname.includes("admin")) {
      window.location.href = "index.html";
    }
    return false;
  }

  const role = session.user?.user_metadata?.role;
  if (role !== "admin") {
    await supabaseClient.auth.signOut();
    if (window.location.pathname.includes("admin")) {
      window.location.href = "index.html";
    }
    return false;
  }

  // Продлеваем сессию
  await supabaseClient.auth.refreshSession();
  return true;
}

// Автоматическое обновление сессии каждые 6 часов
// (чтобы сессия жила дольше, даже при долгом бездействии)
function avoraStartSessionRefresh() {
  const interval = 6 * 60 * 60 * 1000; // 6 часов
  setInterval(async () => {
    try {
      const { data } = await supabaseClient.auth.refreshSession();
      if (data?.session) {
        console.log("Сессия обновлена");
      }
    } catch (err) {
      // Не обновилось — тихо пропускаем
    }
  }, interval);
}

// Если мы в админке — запускаем автообновление
if (window.location.pathname.includes("admin")) {
  avoraStartSessionRefresh();
}