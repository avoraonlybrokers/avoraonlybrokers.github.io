async function avoraLoadComplex() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) return;

  const { data: complex } = await supabaseClient
    .from("complexes")
    .select("*, developer:developers(*)")
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

  avoraRenderTrustBlock(document.getElementById("block-trust"), complex);
  avoraRenderMap(document.getElementById("block-map"), complex);
  avoraRenderLeadForm(document.getElementById("block-lead"), {
    complexId: complex.id,
    developerLeadUrl: complex.developer_lead_url,
  });

  await loadApartments(complex);
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
  const developerName = complex.developer ? (avoraPick(complex.developer, "name") || complex.developer.name_en) : null;

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
    ${developerName ? `
    <a href="developer.html?id=${complex.developer.id}" style="margin-top:20px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:8px 16px;font-size:12px;color:rgba(247,247,245,0.7)">
      <span data-i18n="developer_label"></span>: ${avoraEscapeHtml(developerName)} <i data-lucide="arrow-up-right" width="13" height="13"></i>
    </a>` : ""}
  `;
}

async function loadApartments(complex) {
  const { data: apartments } = await supabaseClient
    .from("apartments")
    .select("*")
    .eq("complex_id", complex.id)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  const block = document.getElementById("block-apartments");
  if (!apartments || apartments.length === 0) { block.classList.add("hidden"); return; }
  block.classList.remove("hidden");

  document.getElementById("apartments-list").innerHTML = apartments
    .map((apt) => {
      const name = avoraPick(apt, "name") || apt.name_en;
      const area = avoraFormatArea(apt.area_from_sqm);
      const price = avoraFormatUsd(apt.price_usd);
      const bedroomsLabel = apt.bedrooms != null ? `${apt.bedrooms} ${avoraT("bedrooms").toLowerCase()}` : "";
      return `
      <a href="apartment.html?complex=${encodeURIComponent(complex.slug)}&apt=${encodeURIComponent(apt.slug)}"
         style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:16px 20px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:12px">
          <i data-lucide="layers" width="16" height="16" style="color:var(--gold-soft)"></i>
          <div>
            <p>${avoraEscapeHtml(name)}</p>
            <p style="font-size:12px;color:rgba(247,247,245,0.5)">${[area ? `${avoraT("listing_from")} ${area}` : "", bedroomsLabel].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        ${price ? `<span style="color:var(--gold-soft);font-size:14px">${price}</span>` : ""}
      </a>`;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  avoraLoadComplex();
  document.addEventListener("avora:locale-changed", avoraLoadComplex);
});
