const GUIDE_COUNTRIES = [
  { value: "uae", label: "ОАЭ (Дубай / Абу-Даби / RAK)" },
  { value: "bali", label: "Бали" },
  { value: "thailand", label: "Таиланд (Пхукет)" },
];

(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-guides.html");
  const content = document.getElementById("admin-content");

  let editingId = null;
  let slugTouchedManually = false;

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Гайды</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">
      Добавляйте, редактируйте, скрывайте (черновик) или удаляйте гайды для инвесторов. Пишите на русском — английская версия переведётся сама.
    </p>

    <form id="g-form" class="admin-form" style="margin-top:24px">
      <input class="form-field full" id="f-slug" placeholder="Адрес страницы (slug) — заполнится сам из заголовка" />

      <input class="form-field full" id="f-title-ru" placeholder="Заголовок гайда" required />
      <input class="form-field full" id="f-subtitle-ru" placeholder="Подзаголовок (необязательно)" />

      <textarea class="form-field full" id="f-content-ru" rows="12" placeholder="Текст гайда. Для подзаголовков используйте '## ', для списка — '- ', для жирного — '**текст**', пустая строка — новый абзац."></textarea>

      <select class="form-field" id="f-country">
        <option value="">Без привязки к стране</option>
        ${GUIDE_COUNTRIES.map((c) => `<option value="${c.value}">${c.label}</option>`).join("")}
      </select>
      <input class="form-field" type="date" id="f-published-date" />

      <div class="full" style="display:flex;gap:8px;align-items:center">
        <input class="form-field" id="f-cover" placeholder="Обложка — ссылка (необязательно, иначе градиент по стране)" style="margin-bottom:0" />
        <button type="button" id="cover-upload-btn" class="btn-outline-gold" style="white-space:nowrap;padding:12px 16px">Загрузить</button>
        <input type="file" id="cover-upload-input" accept="image/*" class="hidden" />
      </div>

      <select class="form-field" id="f-status">
        <option value="draft">Черновик (скрыт с сайта)</option>
        <option value="published">Опубликовано</option>
        <option value="archived">Архив</option>
      </select>
      <input class="form-field" type="number" id="f-sort" placeholder="Порядок сортировки" value="0" />

      <details class="full" style="border:1px solid var(--line);border-radius:10px;padding:12px 16px">
        <summary style="cursor:pointer;font-size:13px;color:rgba(247,247,245,0.6)">Английская версия (необязательно — переведётся сама)</summary>
        <div style="margin-top:12px;display:grid;gap:10px">
          <input class="form-field" id="f-title-en" placeholder="Title (EN)" />
          <input class="form-field" id="f-subtitle-en" placeholder="Subtitle (EN)" />
          <textarea class="form-field" id="f-content-en" rows="10" placeholder="Content (EN)"></textarea>
        </div>
      </details>

      <p id="translate-status" class="full" style="font-size:12px;color:var(--gold-soft)"></p>

      <div class="full" style="display:flex;gap:12px">
        <button type="submit" class="btn-gold" style="width:auto;padding:12px 28px" id="g-submit-btn">Добавить гайд</button>
        <button type="button" class="btn-outline-gold hidden" id="g-cancel-btn" style="width:auto">Отменить</button>
      </div>
    </form>

    <div id="g-list"></div>
  `;

  avoraWireUploadButton("cover-upload-btn", "cover-upload-input", "f-cover", "guides");

  const form = document.getElementById("g-form");
  const cancelBtn = document.getElementById("g-cancel-btn");
  const submitBtn = document.getElementById("g-submit-btn");
  const slugInput = document.getElementById("f-slug");
  const titleInput = document.getElementById("f-title-ru");

  slugInput.addEventListener("input", () => { slugTouchedManually = true; });
  titleInput.addEventListener("input", () => {
    if (!slugTouchedManually) slugInput.value = avoraTransliterate(titleInput.value);
  });

  function resetForm() {
    editingId = null;
    slugTouchedManually = false;
    form.reset();
    document.getElementById("f-published-date").value = new Date().toISOString().slice(0, 10);
    document.getElementById("f-sort").value = 0;
    submitBtn.textContent = "Добавить гайд";
    cancelBtn.classList.add("hidden");
  }

  function fillForm(g) {
    editingId = g.id;
    slugTouchedManually = true;
    document.getElementById("f-slug").value = g.slug || "";
    document.getElementById("f-title-ru").value = g.title_ru || "";
    document.getElementById("f-title-en").value = g.title_en || "";
    document.getElementById("f-subtitle-ru").value = g.subtitle_ru || "";
    document.getElementById("f-subtitle-en").value = g.subtitle_en || "";
    document.getElementById("f-content-ru").value = g.content_ru || "";
    document.getElementById("f-content-en").value = g.content_en || "";
    document.getElementById("f-country").value = g.country || "";
    document.getElementById("f-published-date").value = g.published_date || "";
    document.getElementById("f-cover").value = g.cover_image_url || "";
    document.getElementById("f-status").value = g.status || "draft";
    document.getElementById("f-sort").value = g.sort_order || 0;
    submitBtn.textContent = "Сохранить изменения";
    cancelBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelBtn.addEventListener("click", resetForm);
  resetForm();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    await avoraAutoFillTranslations(
      [
        ["f-title-ru", "f-title-en"],
        ["f-subtitle-ru", "f-subtitle-en"],
        ["f-content-ru", "f-content-en"],
      ],
      document.getElementById("translate-status")
    );

    const payload = {
      slug: document.getElementById("f-slug").value.trim() || avoraTransliterate(document.getElementById("f-title-ru").value),
      title_ru: document.getElementById("f-title-ru").value,
      title_en: document.getElementById("f-title-en").value || document.getElementById("f-title-ru").value,
      subtitle_ru: document.getElementById("f-subtitle-ru").value || null,
      subtitle_en: document.getElementById("f-subtitle-en").value || null,
      content_ru: document.getElementById("f-content-ru").value,
      content_en: document.getElementById("f-content-en").value || null,
      country: document.getElementById("f-country").value || null,
      published_date: document.getElementById("f-published-date").value || null,
      cover_image_url: document.getElementById("f-cover").value || null,
      status: document.getElementById("f-status").value,
      sort_order: Number(document.getElementById("f-sort").value) || 0,
    };

    let error;
    if (editingId) {
      ({ error } = await supabaseClient.from("guides").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabaseClient.from("guides").insert(payload));
    }
    submitBtn.disabled = false;
    if (error) { alert(error.message); return; }
    resetForm();
    await loadList();
  });

  async function toggleHide(guide) {
    const nextStatus = guide.status === "published" ? "draft" : "published";
    await supabaseClient.from("guides").update({ status: nextStatus }).eq("id", guide.id);
    loadList();
  }

  async function loadList() {
    const { data } = await supabaseClient.from("guides").select("*").order("sort_order");
    const listEl = document.getElementById("g-list");
    const STATUS_RU = { draft: "черновик", published: "опубликован", archived: "архив" };
    listEl.innerHTML = (data || [])
      .map(
        (g) => `
      <div class="admin-list-row">
        <div>
          <p>${avoraEscapeHtml(g.title_ru)} <span class="status-pill">${STATUS_RU[g.status] || g.status}</span></p>
          <p class="meta">/${avoraEscapeHtml(g.slug)}${g.country ? " · " + avoraEscapeHtml(g.country) : ""}${g.published_date ? " · " + avoraEscapeHtml(g.published_date) : ""}</p>
        </div>
        <div class="admin-actions">
          <button class="icon-btn" data-hide="${g.id}" style="font-size:12px;color:var(--gold-soft)">${g.status === "published" ? "Скрыть" : "Опубликовать"}</button>
          <button class="icon-btn" data-edit="${g.id}" style="font-size:12px">Редактировать</button>
          <button class="icon-btn" data-delete="${g.id}"><i data-lucide="trash-2" width="15" height="15"></i></button>
        </div>
      </div>`
      )
      .join("");

    avoraRenderIcons();

    listEl.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => fillForm(data.find((g) => g.id === btn.dataset.edit)))
    );
    listEl.querySelectorAll("[data-hide]").forEach((btn) =>
      btn.addEventListener("click", () => toggleHide(data.find((g) => g.id === btn.dataset.hide)))
    );
    listEl.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("Удалить этот гайд без возможности восстановления?")) return;
        await supabaseClient.from("guides").delete().eq("id", btn.dataset.delete);
        loadList();
      })
    );
  }

  loadList();
})();
