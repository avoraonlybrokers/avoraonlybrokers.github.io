(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-complexes.html");
  const content = document.getElementById("admin-content");

  const params = new URLSearchParams(window.location.search);
  const ownerType = params.get("owner_type"); // 'complex' | 'apartment'
  const ownerId = params.get("owner_id");
  const ownerName = params.get("name") || "";

  if (!ownerType || !ownerId) {
    content.innerHTML = `<p>Не указан owner_type / owner_id в ссылке.</p>`;
    return;
  }

  content.innerHTML = `
    <a href="javascript:history.back()" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:rgba(247,247,245,0.6);margin-bottom:16px">
      <i data-lucide="chevron-left" width="15" height="15"></i>Назад
    </a>
    <h1 class="font-display" style="font-size:32px">Фото и видео — ${avoraEscapeHtml(ownerName)}</h1>
    <div id="media-widget" style="margin-top:24px"></div>
  `;
  avoraRenderIcons();

  avoraRenderMediaManager(document.getElementById("media-widget"), ownerType, ownerId);
})();
