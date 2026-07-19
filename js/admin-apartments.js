(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-complexes.html");
  const content = document.getElementById("admin-content");

  const params = new URLSearchParams(window.location.search);
  const complexId = params.get("complex_id");
  const complexName = params.get("name") || "";

  if (!complexId) {
    content.innerHTML = `<p>Missing complex_id in URL.</p>`;
    return;
  }

  let editingId = null;
  let extraSpecs = [];

  content.innerHTML = `
    <a href="admin-complexes.html" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:rgba(247,247,245,0.6);margin-bottom:16px">
      <i data-lucide="chevron-left" width="15" height="15"></i>Back to complexes
    </a>
    <h1 class="font-display" style="font-size:32px">Apartments — ${avoraEscapeHtml(complexName)}</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">Each layout becomes its own page under this complex.</p>

    <form id="a-form" class="admin-form" style="margin-top:24px">
      <input class="form-field full" id="f-slug" placeholder="Slug (e.g. 1-bedroom-50m2)" required />
      <input class="form-field" id="f-name-ru" placeholder="Name (RU)" required />
      <input class="form-field" id="f-name-en" placeholder="Name (EN)" required />
      <input class="form-field" type="number" id="f-bedrooms" placeholder="Bedrooms (0 = studio)" />
      <input class="form-field" type="number" step="any" id="f-area" placeholder="Area from (m²)" />
      <input class="form-field" type="number" id="f-price" placeholder="Price (USD)" />
      <textarea class="form-field" id="f-desc-ru" rows="2" placeholder="Description (RU)"></textarea>
      <textarea class="form-field" id="f-desc-en" rows="2" placeholder="Description (EN)"></textarea>
      <div class="full" style="display:flex;gap:8px;align-items:center">
        <input class="form-field" id="f-floorplan" placeholder="Floor plan image URL" style="margin-bottom:0" />
        <button type="button" id="fp-upload-btn" class="btn-outline-gold" style="white-space:nowrap;padding:12px 16px">Upload</button>
        <input type="file" id="fp-upload-input" accept="image/*" class="hidden" />
      </div>

      <div class="full">
        <p style="font-size:12px;color:rgba(247,247,245,0.5);margin-bottom:8px">Extra specifications (optional)</p>
        <div id="specs-rows"></div>
        <button type="button" id="add-spec-btn" class="btn-outline-gold" style="width:auto;padding:8px 16px;font-size:12px;margin-top:8px">+ Add spec</button>
      </div>

      <select class="form-field" id="f-status">
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      <input class="form-field" type="number" id="f-sort" placeholder="Sort order" value="0" />

      <div class="full" style="display:flex;gap:12px">
        <button type="submit" class="btn-gold" style="width:auto;padding:12px 28px" id="a-submit-btn">Add layout</button>
        <button type="button" class="btn-outline-gold hidden" id="a-cancel-btn" style="width:auto">Cancel</button>
      </div>
    </form>

    <div id="a-list"></div>
  `;
  avoraRenderIcons();

  avoraWireUploadButton("fp-upload-btn", "fp-upload-input", "f-floorplan", "floorplans");

  function renderSpecsRows() {
    document.getElementById("specs-rows").innerHTML = extraSpecs
      .map(
        (spec, i) => `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:6px;margin-bottom:6px">
        <input class="form-field" style="margin-bottom:0" data-spec="${i}-label_ru" placeholder="Label RU" value="${avoraEscapeHtml(spec.label_ru)}" />
        <input class="form-field" style="margin-bottom:0" data-spec="${i}-label_en" placeholder="Label EN" value="${avoraEscapeHtml(spec.label_en)}" />
        <input class="form-field" style="margin-bottom:0" data-spec="${i}-value_ru" placeholder="Value RU" value="${avoraEscapeHtml(spec.value_ru)}" />
        <input class="form-field" style="margin-bottom:0" data-spec="${i}-value_en" placeholder="Value EN" value="${avoraEscapeHtml(spec.value_en)}" />
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
    form.reset();
    extraSpecs = [];
    renderSpecsRows();
    document.getElementById("f-sort").value = 0;
    submitBtn.textContent = "Add layout";
    cancelBtn.classList.add("hidden");
  }

  function fillForm(apt) {
    editingId = apt.id;
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
    submitBtn.textContent = "Save changes";
    cancelBtn.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  cancelBtn.addEventListener("click", resetForm);
  renderSpecsRows();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      complex_id: complexId,
      slug: document.getElementById("f-slug").value.trim(),
      name_ru: document.getElementById("f-name-ru").value,
      name_en: document.getElementById("f-name-en").value,
      bedrooms: document.getElementById("f-bedrooms").value !== "" ? Number(document.getElementById("f-bedrooms").value) : null,
      area_from_sqm: document.getElementById("f-area").value ? Number(document.getElementById("f-area").value) : null,
      price_usd: document.getElementById("f-price").value ? Number(document.getElementById("f-price").value) : null,
      description_ru: document.getElementById("f-desc-ru").value || null,
      description_en: document.getElementById("f-desc-en").value || null,
      floor_plan_url: document.getElementById("f-floorplan").value || null,
      extra_specs: extraSpecs.filter((s) => s.label_ru || s.label_en),
      status: document.getElementById("f-status").value,
      sort_order: Number(document.getElementById("f-sort").value) || 0,
    };

    let error;
    if (editingId) {
      ({ error } = await supabaseClient.from("apartments").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabaseClient.from("apartments").insert(payload));
    }
    if (error) { alert(error.message); return; }
    resetForm();
    await loadList();
  });

  async function loadList() {
    const { data } = await supabaseClient.from("apartments").select("*").eq("complex_id", complexId).order("sort_order");
    const listEl = document.getElementById("a-list");
    listEl.innerHTML = (data || [])
      .map(
        (apt) => `
      <div class="admin-list-row">
        <div>
          <p>${avoraEscapeHtml(apt.name_en)} <span class="status-pill">${apt.status}</span></p>
          <p class="meta">/${avoraEscapeHtml(apt.slug)}</p>
        </div>
        <div class="admin-actions">
          <a href="admin-media.html?owner_type=apartment&owner_id=${apt.id}&name=${encodeURIComponent(apt.name_en)}" class="icon-btn" style="font-size:12px;color:var(--gold-soft)">Media</a>
          <button class="icon-btn" data-edit="${apt.id}" style="font-size:12px">Edit</button>
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
        if (!confirm("Delete this apartment layout?")) return;
        await supabaseClient.from("apartments").delete().eq("id", btn.dataset.delete);
        loadList();
      })
    );
  }

  loadList();
})();
