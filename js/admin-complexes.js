const AMENITY_LABELS_RU = {
  pool: "Бассейн",
  spa: "SPA",
  gym: "Фитнес-зал",
  security: "Охрана",
  park: "Парк",
  cafe: "Кафе",
  parking: "Паркинг",
  kids: "Детская зона",
  wifi: "Wi-Fi",
  lobby: "Лобби",
};

// Простая транслитерация RU → латиница используется из translate.js (avoraTransliterate)

(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-complexes.html");
  const content = document.getElementById("admin-content");

  let editingId = null;
  let slugTouchedManually = false;
  let selectedAmenities = [];
  let developers = [];

  const { data: devData } = await supabaseClient.from("developers").select("*").order("sort_order");
  developers = devData || [];

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Комплексы</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">
      Заполняйте поля на русском — английская версия сайта заполнится переводом автоматически при сохранении.
      Пустой блок просто не показывается на сайте.
    </p>

    <form id="c-form" class="admin-form" style="margin-top:24px">
      <input class="form-field full" id="f-slug" placeholder="Адрес страницы (slug), например: solvyn-city — заполнится сам из названия" />

      <input class="form-field full" id="f-name-ru" placeholder="Название комплекса" required />
      <input class="form-field" id="f-country" placeholder="Страна" required />
      <input class="form-field" id="f-city" placeholder="Город" required />
      <input class="form-field" type="number" id="f-price" placeholder="Цена от, $" />
      <select class="form-field" id="f-developer">
        <option value="">Без застройщика</option>
        ${developers.map((d) => `<option value="${d.id}">${avoraEscapeHtml(d.name_ru || d.name_en)}</option>`).join("")}
      </select>

      <textarea class="form-field full" id="f-desc-ru" rows="4" placeholder="О проекте — подробное описание"></textarea>
      <textarea class="form-field" id="f-format-ru" rows="2" placeholder="Формат проекта (необязательно)"></textarea>
      <textarea class="form-field" id="f-payment-ru" rows="2" placeholder="Схема рассрочки (необязательно)"></textarea>
      <input class="form-field" id="f-handover" placeholder="Срок сдачи, например: Q4 2027" />
      <input class="form-field" id="f-yield-ru" placeholder="Доходность, например: 8-10% годовых" />
      <textarea class="form-field full" id="f-extra-ru" rows="2" placeholder="Дополнительная информация (необязательно)"></textarea>

      <div class="full">
        <p style="font-size:12px;color:rgba(247,247,245,0.5);margin-bottom:8px">Удобства</p>
        <div id="amenity-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
      </div>

      <div class="full" style="display:flex;gap:8px;align-items:center">
        <input class="form-field" id="f-cover" placeholder="Главное фото (обложка) — ссылка" style="margin-bottom:0" />
        <button type="button" id="cover-upload-btn" class="btn-outline-gold" style="white-space:nowrap;padding:12px 16px">Загрузить</button>
        <input type="file" id="cover-upload-input" accept="image/*" class="hidden" />
      </div>

      <input class="form-field" type="number" step="any" id="f-lat" placeholder="Широта (Latitude)" />
      <input class="form-field" type="number" step="any" id="f-lng" placeholder="Долгота (Longitude)" />
      <input class="form-field full" id="f-maps-url" placeholder="Ссылка на Google Maps (необязательно)" />
      <input class="form-field full" id="f-lead-url" placeholder="Ссылка «Отправить заявку застройщику» (куда ведёт кнопка)" />

      <div class="full">
        <p style="font-size:12px;color:rgba(247,247,245,0.5);margin-bottom:8px">Блок «Проверено Onlybrokers»</p>
        <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:14px">
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-trust-history" /> История застройщика</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-trust-legal" /> Юридическая проверка</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-trust-construction" /> Ход строительства</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-trust-contract" /> Анализ контракта</label>
        </div>
      </div>

      <select class="form-field" id="f-status">
        <option value="draft">Черновик (не виден на сайте)</option>
        <option value="published">Опубликовано (виден на сайте)</option>
        <option value="archived">Архив (скрыт, но сохранён)</option>
      </select>
      <input class="form-field" type="number" id="f-sort" placeholder="Порядок сортировки (0, 1, 2…)" value="0" />

      <details class="full" style="border:1px solid var(--line);border-radius:10px;padding:12px 16px">
        <summary style="cursor:pointer;font-size:13px;color:rgba(247,247,245,0.6)">Английская версия (необязательно — переведётся сама при сохранении, если оставить пустым)</summary>
        <div style="margin-top:12px;display:grid;gap:10px">
          <input class="form-field" id="f-name-en" placeholder="Name (EN)" />
          <textarea class="form-field" id="f-desc-en" rows="3" placeholder="Description (EN)"></textarea>
          <textarea class="form-field" id="f-format-en" rows="2" placeholder="Project format (EN)"></textarea>
          <textarea class="form-field" id="f-payment-en" rows="2" placeholder="Payment plan (EN)"></textarea>
          <input class="form-field" id="f-yield-en" placeholder="Yield (EN)" />
          <textarea class="form-field" id="f-extra-en" rows="2" placeholder="Additional information (EN)"></textarea>
        </div>
      </details>

      <p id="translate-status" class="full" style="font-size:12px;color:var(--gold-soft)"></p>

      <div class="full" style="display:flex;gap:12px">
        <button type="submit" class="btn-gold" style="width:auto;padding:12px 28px" id="c-submit-btn">Добавить комплекс</button>
        <button type="button" class="btn-outline-gold hidden" id="c-cancel-btn" style="width:auto">Отменить</button>
      </div>
    </form>

    <div id="media-section" class="hidden" style="margin-bottom:32px">
      <h2 class="font-display" style="font-size:22px;margin-bottom:4px">Фото и видео этого комплекса</h2>
      <p style="font-size:13px;color:rgba(247,247,245,0.5);margin-bottom:12px">Показываются в галерее на странице комплекса.</p>
      <div id="media-widget"></div>
    </div>

    <h2 class="font-display" style="font-size:22px;margin-bottom:16px">Все комплексы</h2>
    <div id="c-list"></div>
  `;

  document.getElementById("amenity-chips").innerHTML = Object.entries(AMENITY_LABELS_RU)
    .map(([key, label]) => `<button type="button" class="chip-toggle" data-key="${key}">${label}</button>`)
    .join("");
  document.querySelectorAll("[data-key]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.key;
      if (selectedAmenities.includes(key)) {
        selectedAmenities = selectedAmenities.filter((k) => k !== key);
        chip.classList.remove("active");
      } else {
        selectedAmenities.push(key);
        chip.classList.add("active");
      }
    });
  });

  avoraWireUploadButton("cover-upload-btn", "cover-upload-input", "f-cover", "covers");

  const form = document.getElementById("c-form");
  const cancelBtn = document.getElementById("c-cancel-btn");
  const submitBtn = document.getElementById("c-submit-btn");
  const slugInput = document.getElementById("f-slug");
  const nameInput = document.getElementById("f-name-ru");

  slugInput.addEventListener("input", () => { slugTouchedManually = true; });
  nameInput.addEventListener("input", () => {
    if (!slugTouchedManually) slugInput.value = avoraTransliterate(nameInput.value);
  });

  function resetForm() {
    editingId = null;
    slugTouchedManually = false;
    form.reset();
    selectedAmenities = [];
    document.querySelectorAll("[data-key]").forEach((c) => c.classList.remove("active"));
    document.getElementById("f-sort").value = 0;
    submitBtn.textContent = "Добавить комплекс";
    cancelBtn.classList.add("hidden");
    document.getElementById("media-section").classList.add("hidden");
  }

  function fillForm(c) {
    editingId = c.id;
    slugTouchedManually = true;
    document.getElementById("f-slug").value = c.slug || "";
    document.getElementById("f-name-ru").value = c.name_ru || "";
    document.getElementById("f-name-en").value = c.name_en || "";
    document.getElementById("f-country").value = c.country || "";
    document.getElementById("f-city").value = c.city || "";
    document.getElementById("f-price").value = c.price_from_usd ?? "";
    document.getElementById("f-developer").value = c.developer_id || "";
    document.getElementById("f-desc-ru").value = c.description_ru || "";
    document.getElementById("f-desc-en").value = c.description_en || "";
    document.getElementById("f-format-ru").value = c.format_ru || "";
    document.getElementById("f-format-en").value = c.format_en || "";
    document.getElementById("f-payment-ru").value = c.payment_plan_ru || "";
    document.getElementById("f-payment-en").value = c.payment_plan_en || "";
    document.getElementById("f-handover").value = c.handover_date || "";
    document.getElementById("f-yield-ru").value = c.yield_ru || "";
    document.getElementById("f-yield-en").value = c.yield_en || "";
    document.getElementById("f-extra-ru").value = c.extra_info_ru || "";
    document.getElementById("f-extra-en").value = c.extra_info_en || "";
    document.getElementById("f-cover").value = c.cover_image_url || "";
    document.getElementById("f-lat").value = c.latitude ?? "";
    document.getElementById("f-lng").value = c.longitude ?? "";
    document.getElementById("f-maps-url").value = c.google_maps_url || "";
    document.getElementById("f-lead-url").value = c.developer_lead_url || "";
    document.getElementById("f-trust-history").checked = !!c.trust_history_enabled;
    document.getElementById("f-trust-legal").checked = !!c.trust_legal_enabled;
    document.getElementById("f-trust-construction").checked = !!c.trust_construction_enabled;
    document.getElementById("f-trust-contract").checked = !!c.trust_contract_enabled;
    document.getElementById("f-status").value = c.status || "draft";
    document.getElementById("f-sort").value = c.sort_order || 0;

    selectedAmenities = [...(c.amenities || [])];
    document.querySelectorAll("[data-key]").forEach((chip) => chip.classList.toggle("active", selectedAmenities.includes(chip.dataset.key)));

    submitBtn.textContent = "Сохранить изменения";
    cancelBtn.classList.remove("hidden");

    document.getElementById("media-section").classList.remove("hidden");
    avoraRenderMediaManager(document.getElementById("media-widget"), "complex", c.id);

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
        ["f-format-ru", "f-format-en"],
        ["f-payment-ru", "f-payment-en"],
        ["f-yield-ru", "f-yield-en"],
        ["f-extra-ru", "f-extra-en"],
      ],
      document.getElementById("translate-status")
    );

    const payload = {
      slug: document.getElementById("f-slug").value.trim() || avoraTransliterate(document.getElementById("f-name-ru").value),
      name_ru: document.getElementById("f-name-ru").value,
      name_en: document.getElementById("f-name-en").value || document.getElementById("f-name-ru").value,
      country: document.getElementById("f-country").value,
      city: document.getElementById("f-city").value,
      price_from_usd: Number(document.getElementById("f-price").value) || null,
      developer_id: document.getElementById("f-developer").value || null,
      description_ru: document.getElementById("f-desc-ru").value || null,
      description_en: document.getElementById("f-desc-en").value || null,
      format_ru: document.getElementById("f-format-ru").value || null,
      format_en: document.getElementById("f-format-en").value || null,
      payment_plan_ru: document.getElementById("f-payment-ru").value || null,
      payment_plan_en: document.getElementById("f-payment-en").value || null,
      handover_date: document.getElementById("f-handover").value || null,
      yield_ru: document.getElementById("f-yield-ru").value || null,
      yield_en: document.getElementById("f-yield-en").value || null,
      extra_info_ru: document.getElementById("f-extra-ru").value || null,
      extra_info_en: document.getElementById("f-extra-en").value || null,
      amenities: selectedAmenities,
      cover_image_url: document.getElementById("f-cover").value || null,
      latitude: document.getElementById("f-lat").value ? Number(document.getElementById("f-lat").value) : null,
      longitude: document.getElementById("f-lng").value ? Number(document.getElementById("f-lng").value) : null,
      google_maps_url: document.getElementById("f-maps-url").value || null,
      developer_lead_url: document.getElementById("f-lead-url").value || null,
      trust_history_enabled: document.getElementById("f-trust-history").checked,
      trust_legal_enabled: document.getElementById("f-trust-legal").checked,
      trust_construction_enabled: document.getElementById("f-trust-construction").checked,
      trust_contract_enabled: document.getElementById("f-trust-contract").checked,
      status: document.getElementById("f-status").value,
      sort_order: Number(document.getElementById("f-sort").value) || 0,
    };

    let result;
    if (editingId) {
      result = await supabaseClient.from("complexes").update(payload).eq("id", editingId).select().single();
    } else {
      result = await supabaseClient.from("complexes").insert(payload).select().single();
    }

    submitBtn.disabled = false;

    if (result.error) { alert(result.error.message); return; }

    // Остаёмся в форме редактирования только что созданного/сохранённого
    // комплекса — чтобы сразу же можно было загрузить фото и видео.
    fillForm(result.data);
    await loadList();
  });

  async function loadList() {
    const { data } = await supabaseClient
      .from("complexes")
      .select("*, developer:developers(name_ru, name_en)")
      .order("sort_order");
    const listEl = document.getElementById("c-list");
    const STATUS_RU = { draft: "черновик", published: "опубликован", archived: "архив" };
    listEl.innerHTML = (data || [])
      .map(
        (c) => `
      <div class="admin-list-row">
        <div>
          <p>${avoraEscapeHtml(c.name_ru)} <span class="status-pill">${STATUS_RU[c.status] || c.status}</span></p>
          <p class="meta">${avoraEscapeHtml(c.city)}, ${avoraEscapeHtml(c.country)} · /${avoraEscapeHtml(c.slug)}${c.developer ? " · " + avoraEscapeHtml(c.developer.name_ru || c.developer.name_en) : ""}</p>
        </div>
        <div class="admin-actions">
          <a href="admin-apartments.html?complex_id=${c.id}&name=${encodeURIComponent(c.name_ru)}" class="icon-btn" style="font-size:12px;color:var(--gold-soft)">Апартаменты</a>
          <button class="icon-btn" data-edit="${c.id}" style="font-size:12px">Редактировать</button>
          <button class="icon-btn" data-delete="${c.id}"><i data-lucide="trash-2" width="15" height="15"></i></button>
        </div>
      </div>`
      )
      .join("");

    avoraRenderIcons();

    listEl.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", () => fillForm(data.find((c) => c.id === btn.dataset.edit)))
    );
    listEl.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        if (!confirm("Удалить этот комплекс и все его апартаменты? Это необратимо.")) return;
        await supabaseClient.from("complexes").delete().eq("id", btn.dataset.delete);
        loadList();
      })
    );
  }

  loadList();
})();
