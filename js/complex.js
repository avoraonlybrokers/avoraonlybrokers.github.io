async function avoraLoadComplex() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) return;

  const { data: complex } = await supabaseClient
    .from("complexes")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!complex) {
    document.querySelector("main").innerHTML = `<div class="container page-main"><p>Property not found.</p></div>`;
    return;
  }

  window.__avoraComplex = complex;
  document.title = `${complex.name_en} — AVORA`;

  // ---- media ----
  const { data: media } = await supabaseClient
    .from("media")
    .select("*")
    .eq("owner_type", "complex")
    .eq("owner_id", complex.id)
    .order("sort_order", { ascending: true });

  const items = (media || []).map((m) => ({ kind: m.kind, url: m.url }));
  const carousel = document.getElementById("complex-carousel");
  if (items.length > 0) {
    carousel.classList.remove("hidden");
    avoraRenderCarousel(carousel, items, complex.name_en);
  }

  renderSummary(complex);
  renderTextBlock("block-about", "about-text", avoraPick(complex, "description"));
  renderTextBlock("block-format", "format-text", avoraPick(complex, "format"));
  renderTextBlock("block-payment", "payment-text", avoraPick(complex, "payment_plan"));
  renderTextBlock("block-extra", "extra-text", avoraPick(complex, "extra_info"));

  const amenitiesBlock = document.getElementById("block-amenities");
  if (complex.amenities && complex.amenities.length > 0) {
    amenitiesBlock.classList.remove("hidden");
    avoraRenderAmenities(amenitiesBlock, complex.amenities);
  }

  // ---- Загружаем апартаменты (вместе с кнопкой внутри) ----
  await loadApartments(complex);

  // ---- Trust блок ----
  avoraRenderTrustBlock(document.getElementById("block-trust"), complex);

  // ---- Карта ----
  avoraRenderMap(document.getElementById("block-map"), complex);

  avoraApplyTranslations();
  avoraRenderIcons();
  avoraInitReveal();
}

function renderTextBlock(blockId, textId, value) {
  const block = document.getElementById(blockId);
  if (!value) { block.classList.add("hidden"); return; }
  block.classList.remove("hidden");
  document.getElementById(textId).textContent = value;
}

function renderSummary(complex) {
  const name = avoraPick(complex, "name") || complex.name_en;
  const priceFrom = avoraFormatUsd(complex.price_from_usd);
  const yieldText = avoraPick(complex, "yield");

  document.getElementById("complex-summary").innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;font-size:14px;color:rgba(247,247,245,0.6)">
      <i data-lucide="map-pin" width="14" height="14"></i><span>${avoraEscapeHtml(complex.city)}, ${avoraEscapeHtml(complex.country)}</span>
    </div>
    <h1 class="font-display" style="font-size:40px;margin-top:8px">${avoraEscapeHtml(name)}</h1>
    <div style="display:flex;flex-wrap:wrap;gap:20px;margin-top:20px;font-size:14px">
      ${priceFrom ? `<div><span style="color:rgba(247,247,245,0.5)" data-i18n="price_from"></span> <span style="color:var(--gold-soft)">${priceFrom}</span></div>` : ""}
      ${complex.handover_date ? `<div style="display:flex;align-items:center;gap:6px;color:rgba(247,247,245,0.7)"><i data-lucide="calendar-clock" width="14" height="14"></i><span data-i18n="handover"></span>: ${avoraEscapeHtml(complex.handover_date)}</div>` : ""}
      ${yieldText ? `<div style="display:flex;align-items:center;gap:6px;color:rgba(247,247,245,0.7)"><i data-lucide="trending-up" width="14" height="14"></i><span data-i18n="yield"></span>: ${avoraEscapeHtml(yieldText)}</div>` : ""}
    </div>
  `;
}

// ============================================================
// Апартаменты с раскрывающейся панелью (только фото)
// ============================================================
async function loadApartments(complex) {
  const { data: apartments } = await supabaseClient
    .from("apartments")
    .select("*")
    .eq("complex_id", complex.id)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  const block = document.getElementById("block-apartments");
  if (!apartments || apartments.length === 0) {
    block.classList.add("hidden");
    return;
  }
  block.classList.remove("hidden");

  document.getElementById("apartments-list").innerHTML = apartments
    .map((apt) => {
      const name = avoraPick(apt, "name") || apt.name_en;
      const area = avoraFormatArea(apt.area_from_sqm);
      const price = avoraFormatUsd(apt.price_usd);
      const bedroomsLabel = apt.bedrooms != null ? `${apt.bedrooms} ${avoraT("bedrooms").toLowerCase()}` : "";
      return `
      <div class="apartment-row">
        <button type="button" class="apartment-row-header" data-toggle="${apt.id}">
          <div class="apartment-row-main">
            <i data-lucide="layers" width="16" height="16" style="color:var(--gold-soft)"></i>
            <div>
              <p>${avoraEscapeHtml(name)}</p>
              <p style="font-size:12px;color:rgba(247,247,245,0.5)">${[area ? `${avoraT("listing_from")} ${area}` : "", bedroomsLabel].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div class="apartment-row-right">
            ${price ? `<span style="color:var(--gold-soft);font-size:14px">${price}</span>` : ""}
            <i data-lucide="chevron-down" width="16" height="16" class="apartment-chevron" id="chevron-${apt.id}"></i>
          </div>
        </button>
        <div class="apartment-row-panel" id="panel-${apt.id}" data-loaded="0"></div>
      </div>`;
    })
    .join("");

  avoraRenderIcons();

  document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.toggle;
      const panel = document.getElementById(`panel-${id}`);
      const chevron = document.getElementById(`chevron-${id}`);
      const isOpen = panel.classList.contains("open");

      if (isOpen) {
        panel.style.maxHeight = "0px";
        panel.classList.remove("open");
        chevron.classList.remove("open");
        return;
      }

      if (panel.dataset.loaded === "0") {
        await renderApartmentPanel(panel, apartments.find((a) => a.id === id));
        panel.dataset.loaded = "1";
      }

      panel.classList.add("open");
      chevron.classList.add("open");
      panel.style.maxHeight = panel.scrollHeight + 40 + "px";
    });
  });

  // Кнопка "Отправить заявку застройщику" — ПОСЛЕ списка апартаментов
  const leadButtonHTML = complex.developer_lead_url
    ? `
      <div style="margin-top:24px;display:flex;justify-content:flex-start;">
        <a href="${complex.developer_lead_url}" target="_blank" rel="noopener noreferrer" 
           style="display:inline-flex;align-items:center;justify-content:center;gap:8px;
                  background:var(--gold);color:var(--ink);padding:10px 24px;
                  border-radius:999px;font-size:13px;font-weight:600;letter-spacing:0.3px;
                  text-decoration:none;text-transform:uppercase;white-space:nowrap;
                  transition:background 0.2s;border:none;cursor:pointer;">
          <span data-i18n="send_lead"></span> <i data-lucide="send" width="14" height="14" style="flex-shrink:0;"></i>
        </a>
      </div>
    `
    : "";

  const listEl = document.getElementById("apartments-list");
  listEl.innerHTML = listEl.innerHTML + leadButtonHTML;
}

// ============================================================
// Рендер панели с фото (БЕЗ ОПИСАНИЯ)
// ============================================================
async function renderApartmentPanel(panel, apt) {
  const { data: media } = await supabaseClient
    .from("media")
    .select("*")
    .eq("owner_type", "apartment")
    .eq("owner_id", apt.id)
    .eq("kind", "image")
    .order("sort_order", { ascending: true });

  const photos = media || [];

  let html = "";

  if (photos.length > 0) {
    html += `<div class="apt-thumb-grid">${photos
      .map((m, i) => `<div class="apt-thumb" data-photo-index="${i}"><img src="${m.url}" loading="lazy" /></div>`)
      .join("")}</div>`;
  } else {
    html += `<p class="apt-panel-empty">Фото пока не добавлены.</p>`;
  }

  panel.innerHTML = html;

  panel.querySelectorAll("[data-photo-index]").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      avoraOpenLightbox(
        photos.map((m) => ({ kind: "image", url: m.url })),
        "",
        Number(thumb.dataset.photoIndex)
      );
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  avoraLoadComplex();
  document.addEventListener("avora:locale-changed", avoraLoadComplex);
});
