const ADMIN_NAV = [
  { href: "admin.html", label: "Dashboard", icon: "layout-dashboard" },
  { href: "admin-complexes.html", label: "Complexes", icon: "building" },
  { href: "admin-developers.html", label: "Developers", icon: "users" },
  { href: "admin-leads.html", label: "Leads", icon: "share-2" },
  { href: "admin-guides.html", label: "Guides", icon: "book-open" },
  { href: "admin-reviews.html", label: "Reviews", icon: "star" },
  { href: "admin-settings.html", label: "Settings & Social", icon: "settings" },
];

// ============================================================
// Проверка сессии с автоматическим продлением
// ============================================================

// Resolves once the auth state is known. Redirects away if the
// session does not belong to the admin user. Every admin-*.html
// page must call this before rendering anything sensitive.
async function avoraRequireAdmin() {
  // Пробуем обновить сессию перед проверкой
  try {
    await supabaseClient.auth.refreshSession();
  } catch (e) {
    // Не обновилось — значит сессии нет
  }

  const { data } = await supabaseClient.auth.getUser();
  const role = data?.user?.user_metadata?.role;
  
  if (!data?.user || role !== "admin") {
    // Если пользователь есть, но не admin — выходим
    if (data?.user) {
      await supabaseClient.auth.signOut();
    }
    window.location.href = "index.html";
    return null;
  }

  // Продлеваем сессию после успешной проверки
  await supabaseClient.auth.refreshSession();

  return data.user;
}

// ============================================================
// Автоматическое обновление сессии каждые 6 часов
// ============================================================

let sessionRefreshInterval = null;

function avoraStartSessionRefresh() {
  if (sessionRefreshInterval) return;
  
  // Каждые 6 часов обновляем сессию
  sessionRefreshInterval = setInterval(async () => {
    try {
      const { data } = await supabaseClient.auth.refreshSession();
      if (data?.session) {
        console.log("Сессия обновлена");
      }
    } catch (err) {
      // Не обновилось — пропускаем
    }
  }, 6 * 60 * 60 * 1000); // 6 часов
}

// ============================================================
// Рендер админ-шела
// ============================================================

function avoraRenderAdminShell(activeHref) {
  const shell = document.getElementById("admin-shell");
  if (!shell) return;

  // Запускаем автообновление сессии
  avoraStartSessionRefresh();

  const currentPage = activeHref || window.location.pathname.split("/").pop();

  shell.innerHTML = `
    <aside class="admin-sidebar">
      <a href="index.html" class="brand-logo">AVORA</a>
      ${ADMIN_NAV.map(
        (item) => `
        <a href="${item.href}" class="admin-nav-link ${item.href === currentPage ? "active" : ""}">
          <i data-lucide="${item.icon}" width="16" height="16"></i>${item.label}
        </a>`
      ).join("")}
      <a href="index.html" class="admin-nav-link" style="margin-top:auto">
        <i data-lucide="home" width="16" height="16"></i>Открыть сайт
      </a>
      <button id="admin-logout-btn" class="admin-nav-link" style="border:none;background:none;text-align:left;color:rgba(247,247,245,0.5)">
        <i data-lucide="log-out" width="16" height="16"></i>Выйти
      </button>
    </aside>
    <main class="admin-main" id="admin-content"></main>
    <div id="visit-counter" class="visit-counter"></div>
  `;
  shell.classList.add("admin-shell");

  // ============================================================
  // Мобильное меню (гамбургер)
  // ============================================================
  if (!document.getElementById('admin-menu-toggle')) {
    const toggle = document.createElement('button');
    toggle.id = 'admin-menu-toggle';
    toggle.className = 'admin-menu-toggle';
    toggle.innerHTML = '<i data-lucide="menu" width="22" height="22"></i>';
    toggle.setAttribute('aria-label', 'Toggle menu');
    document.body.prepend(toggle);

    const overlay = document.createElement('div');
    overlay.id = 'admin-sidebar-overlay';
    overlay.className = 'admin-sidebar-overlay';
    document.body.prepend(overlay);

    toggle.addEventListener('click', () => {
      const sidebar = document.querySelector('.admin-sidebar');
      const overlayEl = document.getElementById('admin-sidebar-overlay');
      if (sidebar) {
        sidebar.classList.toggle('open');
        overlayEl.classList.toggle('open');
      }
    });

    overlay.addEventListener('click', () => {
      const sidebar = document.querySelector('.admin-sidebar');
      const overlayEl = document.getElementById('admin-sidebar-overlay');
      if (sidebar) {
        sidebar.classList.remove('open');
        overlayEl.classList.remove('open');
      }
    });
  }

  document.getElementById("admin-logout-btn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    // Останавливаем обновление сессии
    if (sessionRefreshInterval) {
      clearInterval(sessionRefreshInterval);
      sessionRefreshInterval = null;
    }
    window.location.href = "index.html";
  });

  avoraRenderIcons();
  avoraMountVisitCounter();
}

// ============================================================
// Счётчик визитов
// ============================================================

async function avoraMountVisitCounter() {
  const el = document.getElementById("visit-counter");
  if (!el) return;

  el.innerHTML = `<button id="visit-counter-btn" class="visit-counter-btn"><i data-lucide="users" width="14" height="14"></i><span id="visit-counter-num">…</span></button>
    <div id="visit-counter-panel" class="visit-counter-panel hidden">
      <div class="visit-counter-row"><span>Сегодня</span><strong id="visit-today">…</strong></div>
      <div class="visit-counter-row"><span>За всё время</span><strong id="visit-all">…</strong></div>
    </div>`;
  avoraRenderIcons();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ count: allCount }, { count: todayCount }] = await Promise.all([
    supabaseClient.from("site_visits").select("id", { count: "exact", head: true }),
    supabaseClient.from("site_visits").select("id", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()),
  ]);

  document.getElementById("visit-counter-num").textContent = allCount ?? 0;
  document.getElementById("visit-today").textContent = todayCount ?? 0;
  document.getElementById("visit-all").textContent = allCount ?? 0;

  const btn = document.getElementById("visit-counter-btn");
  const panel = document.getElementById("visit-counter-panel");
  btn.addEventListener("click", () => panel.classList.toggle("hidden"));
  document.addEventListener("click", (e) => {
    if (!el.contains(e.target)) panel.classList.add("hidden");
  });
}

// ============================================================
// Загрузка файлов в Storage
// ============================================================

// Uploads a file to Supabase Storage and returns its public URL.
// bucket must already exist and be public (see README).
async function avoraUploadFile(file, folder) {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseClient.storage.from("avora-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from("avora-media").getPublicUrl(path);
  return data.publicUrl;
}

function avoraWireUploadButton(buttonId, inputId, targetInputId, folder, onDone) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!button || !input) return;
  button.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    button.textContent = "Загрузка…";
    try {
      const url = await avoraUploadFile(file, folder);
      document.getElementById(targetInputId).value = url;
      if (onDone) onDone(url);
    } catch (err) {
      alert("Не удалось загрузить файл: " + err.message);
    } finally {
      button.textContent = "Загрузить";
      input.value = "";
    }
  });
}