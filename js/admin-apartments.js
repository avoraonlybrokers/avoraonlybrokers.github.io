(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-complexes.html");
  const content = document.getElementById("admin-content");

  const params = new URLSearchParams(window.location.search);
  const complexId = params.get("complex_id");
  const complexName = params.get("name") || "";

  if (!complexId) {
    content.innerHTML = `<p>В ссылке не указан complex_id.</p>`;
    return;
  }

  let editingId = null;
  let extraSpecs = [];
  let slugTouchedManually = false;

  content.innerHTML = `
    <a href="admin-complexes.html" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:rgba(247,247,245,0.6);margin-bottom:16px">
      <i data-lucide="chevron-left" width="15" height="15"></i>Назад к комплексам
    </a>
    <h1 class="font-display" style="font-size:32px">Апартаменты — ${avoraEscapeHtml(complexName)}</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">Каждый формат становится отдельной страницей на сайте.</p>

    <form id="a-form" class="admin-form" style="margin-top:24px">
      <input class="form-field full" id="f-slug" placeholder="Адрес страницы (slug) — заполнится сам из названия" />
      <input class="form-field full" id="f-name-ru" placeholder="Название формата, например: Односпальная Вилла" required />
      <input class="form-field" type="number" id="f-bedrooms" placeholder="Спальни (0 = студия)" />
      <input class="form-field" type="number" step="any" id="f-area" placeholder="Площадь от, м²" />
      <input class="form-field" type="number" id="f-price" placeholder="Цена, $" />
      <textarea class="form-field full" id="f-desc-ru" rows="3" placeholder="Описание (необязательно)"></textarea>

      <div class="full" style="display:flex;gap:8px;align-items:center">
        <input class="form-field" id="f-floorplan" placeholder="Планировка — ссылка на изображение" style="margin-bottom:0" />
        <button type="button" id="fp-upload-btn" class="btn-outline-gold" style="white-space:nowrap;padding:12px 16px">Загрузить</button>
        <input type="file" id="fp-upload-input" accept="image/*" class="hidden" />
      </div>

      <div class="full">
        <p style="font-size:12px;color:rgba(247,247,245,0.5);margin-bottom:8px">Дополнительные характеристики (необязательно)</p>
        <div id="specs-rows"></div>
        <button type="button" id="add-spec-btn" class="btn-outline-gold" style="width:auto;padding:8px 16px;font-size:12px;margin-top:8px">+ Добавить характеристику</button>
      </div>

      <select class="form-field" id="f-status">
        <option value="draft">Черновик (не виден на сайте)</option>
        <option value="published">Опубликовано (виден на сайте)</option>
        <option value="archived">Архив</option>
      </select>
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
        <button type="submit" class="btn-gold" style="width:auto;padding:12px 28px" id="a-submit-btn">Добавить формат</button>
        <button type="button" class="btn-outline-gold hidden" id="a-cancel-btn" style="width:auto">Отменить</button>
      </div>
    </form>

    <div id="media-section" class="hidden" style="margin-bottom:32px">
      <h2 class="font-display" style="font-size:22px;margin-bottom:4px">Фото и видео этого формата</h2>
      <div id="media-widget"></div>
    </div>

    <h2 class="font-display" style="font-size:22px;margin-bottom:16px">Все форматы</h2>
    <div id="a-list"></div>
  `;
  avoraRenderIcons();

  avoraWireUploadButton("fp-upload-btn", "fp-upload-input", "f-floorplan", "floorplans");

  const slugInput = document.getElementById("f-slug");
  const nameInput = document.getElementById("f-name-ru");
  slugInput.addEventListener("input", () => { slugTouchedManually = true; });
  nameInput.addEventListener("input", () => {
    if (!slugTouchedManually) slugInput.value = avoraTransliterate(nameInput.value);
  });

  function renderSpecsRows() {
    document.getElementById("specs-rows").innerHTML = extraSpecs
      .map(
        (spec, i) => `
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-bottom:6px">
        <input class="form-field" style="margin-bottom:0" data-spec="${i}-label_ru" placeholder="Название (RU), напр. Площадь" value="${avoraEscapeHtml(spec.label_ru)}" />
        <input class="form-field" style="margin-bottom:0" data-spec="${i}-value_ru" placeholder="Значение (RU), напр. 34.6 м²" value="${avoraEscapeHtml(spec.value_ru)}" />
        <button type="button" class="icon-btn" data-remove-spec="${i}"><i data-lucide="x" width="14" height="14"></i></button>
      </div>`
      )
      .join("");
    document.querySelectorAll("[data-spec]").forEach((input) => {
      input.addEventListener("input", () => {
        const [i, field] = input.dataset.spec.split("-");
        extraSpecs[Number(i)][field] = input.value;
      });
    });
    document.querySelectorAll("[data-remove-spec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        extraSpecs.splice(Number(btn.dataset.removeSpec), 1);
        renderSpecsRows();
      });
    });
    avoraRenderIcons();
  }

  document.getElementById("add-spec-btn").addEventListener("click", () => {
    extraSpecs.push({ label_ru: "", label_en: "", value_ru: "", value_en: "" });
    renderSpecsRows();
  });

  const form = document.getElementById("a-form");
  const cancelBtn = document.getElementById("a-cancel-btn");
  const submitBtn = document.getElementById("a-submit-btn");

  function resetForm() {
    editingId = null;
    slugTouchedManually = false;
    form.reset();
    extraSpecs = [];
    renderSpecsRows();
    document.getElementById("f-sort").value = 0;
    submitBtn.textContent = "Добавить формат";
    cancelBtn.classList.add("hidden");
    document.getElementById("media-section").classList.add("hidden");
  }

  function fillForm(apt) {
    editingId = apt.id;
    slugTouchedManually = true;
    document.getElementById("f-slug").value = apt.slug || "";
    document.getElementById("f-name-ru").value = apt.name_ru || "";
    document.getElementById("f-name-en").value = apt.name_en || "";
    document.getElementById("f-bedrooms").value = apt.bedrooms ?? "";
    document.getElementById("f-area").value = apt.area_from_sqm ?? "";
    document.getElementById("f-price").value = apt.price_usd ?? "";
    document.getElementById("f-desc-ru").value = apt.description_ru || "";
    document.getElementById("f-desc-en").value = apt.description_en || "";
    document.getElementById("f-floorplan").value = apt.floor_plan_url || "";
    document.getElementById("f-status").value = apt.status || "draft";
    document.getElementById("f-sort").value = apt.sort_order || 0;
    extraSpecs = JSON.parse(JSON.stringify(apt.extra_specs || []));
    renderSpecsRows();
    submitBtn.textContent = "Сохранить изменения";
    cancelBtn.classList.remove("hidden");

    document.getElementById("media-section").classList.remove("hidden");
    avoraRenderMediaManager(document.getElementById("media-widget"), "apartment", apt.id);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelBtn.addEventListener("click", resetForm);
  renderSpecsRows();

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
    for (const spec of extraSpecs) {
      if (spec.label_ru) spec.label_en = (await avoraTranslateRuToEn(spec.label_ru)).text;
      if (spec.value_ru) spec.value_en = (await avoraTranslateRuToEn(spec.value_ru)).text;
    }

    const payload = {
      complex_id: complexId,
      slug: document.getElementById("f-slug").value.trim() || avoraTransliterate(document.getElementById("f-name-ru").value),
      name_ru: document.getElementById("f-name-ru").value,
      name_en: document.getElementById("f-name-en").value || document.getElementById("f-name-ru").value,
      bedrooms: document.getElementById("f-bedrooms").value !== "" ? Number(document.getElementById("f-bedrooms").value) : null,
      area_from_sqm: document.getElementById("f-area").value ? Number(document.getElementById("f-area").value) : null,
      price_usd: document.getElementById("f-price").value ? Number(document.getElementById("f-price").value) : null,
      description_ru: document.getElementById("f-desc-ru").value || null,
      description_en: document.getElementById("f-desc-en").value || null,
      floor_plan_url: document.getElementById("f-floorplan").value || null,
      extra_specs: extraSpecs.filter((s) => s.label_ru),
      status: document.getElementById("f-status").value,
      sort_order: Number(document.getElementById("f-sort").value) || 0,
    };

    let result;
    if (editingId) {
      result = await supabaseClient.from("apartments").update(payload).eq("id", editingId).select().single();
    } else {
      result = await supabaseClient.from("apartments").insert(payload).select().single();
    }

    submitBtn.disabled = false;
    if (result.error) { alert(result.error.message); return; }

    fillForm(result.data);
    await loadList();
  });

  async function loadList() {
    const { data } = await supabaseClient.from("apartments").select("*").eq("complex_id", complexId).order("sort_order");
    const listEl = document.getElementById("a-list");
    const STATUS_RU = { draft: "черновик", published: "опубликован", archived: "архив" };
    listEl.innerHTML = (data || [])
      .map(
        (apt) => `
      <div class="admin-list-row">
        <div>
          <p>${avoraEscapeHtml(apt.name_ru)} <span class="status-pill">${STATUS_RU[apt.status] || apt.status}</span></p>
          <p class="meta">/${avoraEscapeHtml(apt.slug)}</p>
        </div>
        <div class="admin-actions">
          <button class="icon-btn" data-edit="${apt.id}" style="font-size:12px">Редактировать</button>
          <button class="icon-btn" data-delete="${apt.id}"><i data-lucide="trash-2" width="15" height="15"></i></button>
        </div>
      </div>`
      )
      .join("");

    avoraRenderIcons();

    listEl.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => fillForm(data.find((a) => a.id === btn.dataset.edit)))
    );
    listEl.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("Удалить этот формат апартамента?")) return;
        await supabaseClient.from("apartments").delete().eq("id", btn.dataset.delete);
        loadList();
      })
    );
  }

  loadList();
})();
