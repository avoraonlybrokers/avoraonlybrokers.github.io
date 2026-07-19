// ============================================================
// Shared across every page: header, footer, admin login modal,
// locale switching, scroll-reveal animation, icon rendering.
// Include AFTER config.js, supabaseClient.js, i18n.js.
// ============================================================

const SOCIAL_ICON = {
  instagram: "instagram",
  x: "twitter",
  facebook: "facebook",
  tiktok: "music-2",
};

function avoraRenderIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function avoraMountHeader() {
  const el = document.getElementById("avora-header");
  if (!el) return;
  el.innerHTML = `
    <a href="index.html" class="brand-logo">AVORA</a>
    <nav class="header-nav">
      <a href="index.html#projects" data-i18n="nav_projects"></a>
      <a href="developers.html" data-i18n="nav_developers"></a>
      <a href="guides.html" class="nav-guides-link" data-i18n="nav_guides"></a>
    </nav>
    <div class="locale-switch">
      <button data-locale="ru">RU</button>
      <button data-locale="en">EN</button>
    </div>
  `;
  el.classList.add("site-header");

  const locale = avoraGetLocale();
  el.querySelectorAll("[data-locale]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.locale === locale);
    btn.addEventListener("click", () => {
      avoraSetLocale(btn.dataset.locale);
      el.querySelectorAll("[data-locale]").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });
  avoraApplyTranslations();
}

async function avoraMountFooter() {
  const el = document.getElementById("avora-footer");
  if (!el) return;
  el.classList.add("site-footer");

  const [{ data: settings }, { data: socials }] = await Promise.all([
    supabaseClient.from("site_settings").select("*").eq("id", 1).single(),
    supabaseClient.from("social_links").select("*").eq("is_enabled", true).not("url", "is", null),
  ]);

  const contacts = [];
  if (settings?.phone) contacts.push({ icon: "phone", label: settings.phone, href: `tel:${settings.phone}` });
  if (settings?.email) contacts.push({ icon: "mail", label: settings.email, href: `mailto:${settings.email}` });
  if (settings?.whatsapp)
    contacts.push({ icon: "message-circle", label: "WhatsApp", href: `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}` });
  if (settings?.telegram) contacts.push({ icon: "send", label: "Telegram", href: settings.telegram });

  const hasColumns = contacts.length > 0 || (socials && socials.length > 0);

  el.innerHTML = `
    <div class="container">
      ${hasColumns ? `
      <div class="footer-columns">
        ${contacts.length > 0 ? `
        <div>
          <p class="eyebrow" style="margin-bottom:16px" data-i18n="footer_contacts"></p>
          <div class="footer-contacts">
            ${contacts.map((c) => `<a href="${c.href}"><i data-lucide="${c.icon}" width="15" height="15"></i>${c.label}</a>`).join("")}
          </div>
        </div>` : ""}
        ${socials && socials.length > 0 ? `
        <div>
          <p class="eyebrow" style="margin-bottom:16px" data-i18n="footer_social"></p>
          <div class="social-icons">
            ${socials.map((s) => `<a class="social-icon-btn" href="${s.url}" target="_blank" rel="noopener noreferrer"><i data-lucide="${SOCIAL_ICON[s.platform] || "link"}" width="16" height="16"></i></a>`).join("")}
          </div>
        </div>` : ""}
      </div>` : ""}
      <div class="footer-brand">
        <button class="footer-brand-btn" id="avora-admin-trigger" aria-label="AVORA">AVORA</button>
        <p data-i18n="brand_by"></p>
      </div>
    </div>
    ${avoraAdminModalHTML()}
  `;

  avoraApplyTranslations();
  avoraRenderIcons();
  avoraWireAdminModal();
}

function avoraAdminModalHTML() {
  return `
  <div class="modal-overlay" id="avora-admin-overlay">
    <div class="modal-panel">
      <button class="modal-close" id="avora-admin-close" aria-label="Close"><i data-lucide="x" width="18" height="18"></i></button>
      <div class="modal-header">
        <div class="modal-icon"><i data-lucide="lock" width="18" height="18"></i></div>
        <h2 data-i18n="admin_modal_title"></h2>
        <p data-i18n="admin_password_label"></p>
      </div>
      <form id="avora-admin-form">
        <input type="password" class="form-field" id="avora-admin-password" required autocomplete="current-password" data-i18n-placeholder="admin_password_placeholder" />
        <p class="form-error hidden" id="avora-admin-error" data-i18n="admin_invalid"></p>
        <button type="submit" class="btn-gold" id="avora-admin-submit" data-i18n="admin_login"></button>
      </form>
    </div>
  </div>`;
}

function avoraWireAdminModal() {
  const trigger = document.getElementById("avora-admin-trigger");
  const overlay = document.getElementById("avora-admin-overlay");
  const closeBtn = document.getElementById("avora-admin-close");
  const form = document.getElementById("avora-admin-form");
  const errorEl = document.getElementById("avora-admin-error");
  const submitBtn = document.getElementById("avora-admin-submit");

  if (!trigger || !overlay) return;

  trigger.addEventListener("click", () => overlay.classList.add("open"));
  closeBtn.addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("hidden");
    submitBtn.disabled = true;
    const password = document.getElementById("avora-admin-password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: AVORA_CONFIG.ADMIN_EMAIL,
      password,
    });

    const role = data?.user?.user_metadata?.role;

    if (error || !data?.user || role !== "admin") {
      await supabaseClient.auth.signOut();
      errorEl.classList.remove("hidden");
      submitBtn.disabled = false;
      return;
    }

    window.location.href = "admin.html";
  });
}

// ---------------- Scroll reveal ----------------
function avoraInitReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "-40px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

// Re-run reveal wiring after dynamically injected content.
function avoraObserveNewReveals(container) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "-40px" }
  );
  container.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

function avoraEscapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.lang = avoraGetLocale();
  avoraMountHeader();
  avoraMountFooter();
});
