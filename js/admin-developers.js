(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-developers.html");
  const content = document.getElementById("admin-content");

  let editingId = null;

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Застройщики</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">Добавляйте, редактируйте, скрывайте или удаляйте застройщиков.</p>

    <form id="dev-form" class="admin-form" style="margin-top:24px">
      <input class="form-field full" id="f-name-ru" placeholder="Название застройщика" required />
      <div class="full" style="display:flex;gap:8px;align-items:center">
        <input class="form-field" id="f-logo" placeholder="Логотип — ссылка" style="margin-bottom:0" />
        <button type="button" id="logo-upload-btn" class="btn-outline-gold" style="white-space:nowrap;padding:12px 16px">Загрузить</button>
        <input type="file" id="logo-upload-input" accept="image/*" class="hidden" />
      </div>
      <input class="form-field full" id="f-website" placeholder="Официальный сайт (ссылка)" />
      <textarea class="form-field full" id="f-desc-ru" rows="3" placeholder="Описание (необязательно)"></textarea>
      <input class="form-field" type="number" id="f-sort" placeholder="Порядок сортировки" value="0" />

      <details class="full" style="border:1px solid var(--line);border-radius:10px;padding:12px 16px">
        <summary style="cursor:pointer;font-size:13px;color:rgba(247,247,245,0.6)">Английская версия (необязательно — переведётся сама)</summary>
        <div style="margin-top:12px;display:grid;gap:10px">
          <input class="form-field" id="f-name-en" placeholder="Name (EN)" />
          <textarea class="form-field" id="f-desc-en" rows="3" placeholder="Description (EN)"></textarea>
        </div>
      </details>

      <p id="translate-status" class="full" style="font-size:12px;color:var(--gold-soft)"></p>

      <div class="full" style="display:flex;gap:12px">
        <button type="submit" class="btn-gold" style="width:auto;padding:12px 28px" id="dev-submit-btn">Добавить застройщика</button>
        <button type="button" class="btn-outline-gold hidden" id="dev-cancel-btn" style="width:auto">Отменить</button>
      </div>
    </form>

    <div id="dev-list"></div>
  `;

  avoraWireUploadButton("logo-upload-btn", "logo-upload-input", "f-logo", "logos");

  const form = document.getElementById("dev-form");
  const cancelBtn = document.getElementById("dev-cancel-btn");
  const submitBtn = document.getElementById("dev-submit-btn");

  function resetForm() {
    editingId = null;
    form.reset();
    document.getElementById("f-sort").value = 0;
    submitBtn.textContent = "Добавить застройщика";
    cancelBtn.classList.add("hidden");
  }

  function fillForm(dev) {
    editingId = dev.id;
    document.getElementById("f-name-ru").value = dev.name_ru || "";
    document.getElementById("f-name-en").value = dev.name_en || "";
    document.getElementById("f-logo").value = dev.logo_url || "";
    document.getElementById("f-website").value = dev.website_url || "";
    document.getElementById("f-desc-ru").value = dev.description_ru || "";
    document.getElementById("f-desc-en").value = dev.description_en || "";
    document.getElementById("f-sort").value = dev.sort_order || 0;
    submitBtn.textContent = "Сохранить изменения";
    cancelBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    await avoraAutoFillTranslations(
      [
        ["f-name-ru", "f-name-en"],
        ["f-desc-ru", "f-desc-en"],
      ],
      document.getElementById("translate-status")
    );

    const payload = {
      name_ru: document.getElementById("f-name-ru").value,
      name_en: document.getElementById("f-name-en").value || document.getElementById("f-name-ru").value,
      logo_url: document.getElementById("f-logo").value || null,
      website_url: document.getElementById("f-website").value || null,
      description_ru: document.getElementById("f-desc-ru").value || null,
      description_en: document.getElementById("f-desc-en").value || null,
      sort_order: Number(document.getElementById("f-sort").value) || 0,
    };

    submitBtn.disabled = false;

    if (editingId) {
      await supabaseClient.from("developers").update(payload).eq("id", editingId);
    } else {
      await supabaseClient.from("developers").insert(payload);
    }
    resetForm();
    await loadList();
  });

  async function handleDelete(id) {
    if (!confirm("Удалить этого застройщика?")) return;
    await supabaseClient.from("developers").delete().eq("id", id);
    await loadList();
  }

  async function toggleHidden(dev) {
    await supabaseClient.from("developers").update({ is_hidden: !dev.is_hidden }).eq("id", dev.id);
    await loadList();
  }

  async function loadList() {
    const { data } = await supabaseClient.from("developers").select("*").order("sort_order");
    const listEl = document.getElementById("dev-list");
    listEl.innerHTML = (data || [])
      .map(
        (dev) => `
      <div class="admin-list-row">
        <div>
          <p>${avoraEscapeHtml(dev.name_ru)} ${dev.is_hidden ? '<span class="status-pill">скрыт</span>' : ""}</p>
          <p class="meta">${avoraEscapeHtml(dev.website_url || "")}</p>
        </div>
        <div class="admin-actions">
          <button class="icon-btn" data-toggle="${dev.id}" title="Показать/скрыть"><i data-lucide="${dev.is_hidden ? "eye-off" : "eye"}" width="15" height="15"></i></button>
          <button class="icon-btn" data-edit="${dev.id}" style="font-size:12px;color:var(--gold-soft)">Редактировать</button>
          <button class="icon-btn" data-delete="${dev.id}"><i data-lucide="trash-2" width="15" height="15"></i></button>
        </div>
      </div>`
      )
      .join("");

    avoraRenderIcons();

    listEl.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => fillForm(data.find((d) => d.id === btn.dataset.edit)))
    );
    listEl.querySelectorAll("[data-toggle]").forEach((btn) =>
      btn.addEventListener("click", () => toggleHidden(data.find((d) => d.id === btn.dataset.toggle)))
    );
    listEl.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", () => handleDelete(btn.dataset.delete))
    );
  }

  loadList();
})();
