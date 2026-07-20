const SOCIAL_PLATFORMS = ["instagram", "x", "facebook", "tiktok"];

(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-settings.html");
  const content = document.getElementById("admin-content");

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Настройки</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">Логотип, фоновое видео, контакты и соцсети, показанные на всём сайте.</p>

    <form id="settings-form" class="admin-form" style="grid-template-columns:1fr;max-width:560px;margin-top:24px">
      <input class="form-field" id="f-logo" placeholder="Логотип — ссылка" />
      <div style="display:flex;gap:8px;align-items:center">
        <input class="form-field" id="f-hero-video" placeholder="Фоновое видео на главной — ссылка" style="margin-bottom:0" />
        <button type="button" id="video-upload-btn" class="btn-outline-gold" style="white-space:nowrap;padding:12px 16px">Загрузить</button>
        <input type="file" id="video-upload-input" accept="video/*" class="hidden" />
      </div>
      <input class="form-field" id="f-whatsapp" placeholder="Номер WhatsApp" />
      <input class="form-field" id="f-telegram" placeholder="Ссылка на Telegram" />
      <input class="form-field" id="f-email" placeholder="Email" />
      <input class="form-field" id="f-phone" placeholder="Телефон" />
      <button type="submit" class="btn-gold" style="width:auto;padding:12px 28px">Сохранить настройки</button>
      <p id="save-msg" style="font-size:12px;color:var(--gold-soft)"></p>
    </form>

    <h2 class="font-display" style="font-size:24px;margin-top:40px">Социальные сети</h2>
    <div id="social-rows" style="margin-top:16px;max-width:640px"></div>
  `;

  avoraWireUploadButton("video-upload-btn", "video-upload-input", "f-hero-video", "site");

  const { data: settings } = await supabaseClient.from("site_settings").select("*").eq("id", 1).single();
  if (settings) {
    document.getElementById("f-logo").value = settings.logo_url || "";
    document.getElementById("f-hero-video").value = settings.hero_video_url || "";
    document.getElementById("f-whatsapp").value = settings.whatsapp || "";
    document.getElementById("f-telegram").value = settings.telegram || "";
    document.getElementById("f-email").value = settings.email || "";
    document.getElementById("f-phone").value = settings.phone || "";
  }

  document.getElementById("settings-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      logo_url: document.getElementById("f-logo").value || null,
      hero_video_url: document.getElementById("f-hero-video").value || null,
      whatsapp: document.getElementById("f-whatsapp").value || null,
      telegram: document.getElementById("f-telegram").value || null,
      email: document.getElementById("f-email").value || null,
      phone: document.getElementById("f-phone").value || null,
    };
    await supabaseClient.from("site_settings").update(payload).eq("id", 1);
    const msg = document.getElementById("save-msg");
    msg.textContent = "Настройки сохранены.";
    setTimeout(() => (msg.textContent = ""), 2000);
  });

  const { data: socials } = await supabaseClient.from("social_links").select("*");
  const socialMap = {};
  (socials || []).forEach((s) => (socialMap[s.platform] = s));

  document.getElementById("social-rows").innerHTML = SOCIAL_PLATFORMS.map(
    (platform) => `
    <div style="display:flex;gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:14px 20px;margin-bottom:8px">
      <span style="width:80px;text-transform:capitalize;font-size:14px">${platform}</span>
      <input class="form-field" style="margin-bottom:0;flex:1" data-platform="${platform}" placeholder="https://…" value="${avoraEscapeHtml(socialMap[platform]?.url || "")}" />
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(247,247,245,0.6)">
        <input type="checkbox" data-enabled="${platform}" ${socialMap[platform]?.is_enabled ? "checked" : ""} /> Включено
      </label>
      <button type="button" data-save="${platform}" class="btn-outline-gold" style="width:auto;padding:8px 16px;font-size:12px">Сохранить</button>
    </div>`
  ).join("");

  document.querySelectorAll("[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const platform = btn.dataset.save;
      const url = document.querySelector(`[data-platform="${platform}"]`).value;
      const is_enabled = document.querySelector(`[data-enabled="${platform}"]`).checked;
      await supabaseClient.from("social_links").update({ url, is_enabled }).eq("platform", platform);
    });
  });
})();
