const AMENITY_KEYS = ["pool", "spa", "gym", "security", "park", "cafe", "parking", "kids", "wifi", "lobby"];

(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-complexes.html");
  const content = document.getElementById("admin-content");

  let editingId = null;
  let selectedAmenities = [];
  let developers = [];

  const { data: devData } = await supabaseClient.from("developers").select("*").order("sort_order");
  developers = devData || [];

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Complexes</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">A block only shows on the public site once its field is filled in.</p>

    <form id="c-form" class="admin-form" style="margin-top:24px">
      <input class="form-field full" id="f-slug" placeholder="Slug (e.g. pandawa-residence)" required />
      <input class="form-field" id="f-name-ru" placeholder="Name (RU)" required />
      <input class="form-field" id="f-name-en" placeholder="Name (EN)" required />
      <input class="form-field" id="f-country" placeholder="Country" required />
      <input class="form-field" id="f-city" placeholder="City" required />
      <input class="form-field" type="number" id="f-price" placeholder="Price from (USD)" />
      <select class="form-field" id="f-developer">
        <option value="">No developer</option>
        ${developers.map((d) => `<option value="${d.id}">${avoraEscapeHtml(d.name_en)}</option>`).join("")}
      </select>

      <textarea class="form-field" id="f-desc-ru" rows="2" placeholder="Description (RU) — О проекте"></textarea>
      <textarea class="form-field" id="f-desc-en" rows="2" placeholder="Description (EN)"></textarea>

      <textarea class="form-field" id="f-format-ru" rows="2" placeholder="Project format (RU) — Формат проекта"></textarea>
      <textarea class="form-field" id="f-format-en" rows="2" placeholder="Project format (EN)"></textarea>

      <textarea class="form-field" id="f-payment-ru" rows="2" placeholder="Payment plan (RU) — Схема рассрочки"></textarea>
      <textarea class="form-field" id="f-payment-en" rows="2" placeholder="Payment plan (EN)"></textarea>

      <input class="form-field" id="f-handover" placeholder="Handover date (e.g. Q4 2027)" />
      <input class="form-field" id="f-yield-ru" placeholder="Yield (RU)" />
      <input class="form-field full" id="f-yield-en" placeholder="Yield (EN)" />

      <textarea class="form-field" id="f-extra-ru" rows="2" placeholder="Additional information (RU)"></textarea>
      <textarea class="form-field" id="f-extra-en" rows="2" placeholder="Additional information (EN)"></textarea>

      <div class="full">
        <p style="font-size:12px;color:rgba(247,247,245,0.5);margin-bottom:8px">Amenities</p>
        <div id="amenity-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
      </div>

      <div class="full" style="display:flex;gap:8px;align-items:center">
        <input class="form-field" id="f-cover" placeholder="Cover image URL" style="margin-bottom:0" />
        <button type="button" id="cover-upload-btn" class="btn-outline-gold" style="white-space:nowrap;padding:12px 16px">Upload</button>
        <input type="file" id="cover-upload-input" accept="image/*" class="hidden" />
      </div>

      <input class="form-field" type="number" step="any" id="f-lat" placeholder="Latitude" />
      <input class="form-field" type="number" step="any" id="f-lng" placeholder="Longitude" />
      <input class="form-field full" id="f-maps-url" placeholder="Google Maps URL" />
      <input class="form-field full" id="f-lead-url" placeholder="Developer lead URL (Отправить заявку застройщику)" />

      <div class="full">
        <p style="font-size:12px;color:rgba(247,247,245,0.5);margin-bottom:8px">Проверено Onlybrokers</p>
        <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:14px">
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-trust-history" /> History</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-trust-legal" /> Legal</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-trust-construction" /> Construction</label>
          <label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="f-trust-contract" /> Contract</label>
        </div>
      </div>

      <select class="form-field" id="f-status">
        <option value="draft">Черновик / Draft</option>
        <option value="published">Опубликовано / Published</option>
        <option value="archived">Архив / Archived</option>
      </select>
      <input class="form-field" type="number" id="f-sort" placeholder="Sort order" value="0" />

      <div class="full" style="display:flex;gap:12px">
        <button type="submit" class="btn-gold" style="width:auto;padding:12px 28px" id="c-submit-btn">Add complex</button>
        <button type="button" class="btn-outline-gold hidden" id="c-cancel-btn" style="width:auto">Cancel</button>
      </div>
    </form>

    <div id="c-list"></div>
  `;

  document.getElementById("amenity-chips").innerHTML = AMENITY_KEYS.map(
    (key) => `<button type="button" class="chip-toggle" data-key="${key}">${key}</button>`
  ).join("");
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

  function resetForm() {
    editingId = null;
    form.reset();
    selectedAmenities = [];
    document.querySelectorAll("[data-key]").forEach((c) => c.classList.remove("active"));
    document.getElementById("f-sort").value = 0;
    submitBtn.textContent = "Add complex";
    cancelBtn.classList.add("hidden");
  }

  function fillForm(c) {
    editingId = c.id;
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

    submitBtn.textContent = "Save changes";
    cancelBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      slug: document.getElementById("f-slug").value.trim(),
      name_ru: document.getElementById("f-name-ru").value,
      name_en: document.getElementById("f-name-en").value,
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

    let error;
    if (editingId) {
      ({ error } = await supabaseClient.from("complexes").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabaseClient.from("complexes").insert(payload));
    }
    if (error) { alert(error.message); return; }
    resetForm();
    await loadList();
  });

  async function loadList() {
    const { data } = await supabaseClient
      .from("complexes")
      .select("*, developer:developers(name_en)")
      .order("sort_order");
    const listEl = document.getElementById("c-list");
    listEl.innerHTML = (data || [])
      .map(
        (c) => `
      <div class="admin-list-row">
        <div>
          <p>${avoraEscapeHtml(c.name_en)} <span class="status-pill">${c.status}</span></p>
          <p class="meta">${avoraEscapeHtml(c.city)}, ${avoraEscapeHtml(c.country)} · /${avoraEscapeHtml(c.slug)}${c.developer ? " · " + avoraEscapeHtml(c.developer.name_en) : ""}</p>
        </div>
        <div class="admin-actions">
          <a href="admin-apartments.html?complex_id=${c.id}&name=${encodeURIComponent(c.name_en)}" class="icon-btn" style="font-size:12px;color:var(--gold-soft)">Apartments</a>
          <a href="admin-media.html?owner_type=complex&owner_id=${c.id}&name=${encodeURIComponent(c.name_en)}" class="icon-btn" style="font-size:12px;color:var(--gold-soft)">Media</a>
          <button class="icon-btn" data-edit="${c.id}" style="font-size:12px">Edit</button>
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
        if (!confirm("Delete this complex and all its apartments?")) return;
        await supabaseClient.from("complexes").delete().eq("id", btn.dataset.delete);
        loadList();
      })
    );
  }

  loadList();
})();
