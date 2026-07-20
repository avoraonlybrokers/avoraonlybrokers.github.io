async function avoraLoadApartment() {
  const params = new URLSearchParams(window.location.search);
  const complexSlug = params.get("complex");
  const aptSlug = params.get("apt");
  if (!complexSlug || !aptSlug) return;

  const { data: complex } = await supabaseClient
    .from("complexes")
    .select("*")
    .eq("slug", complexSlug)
    .eq("status", "published")
    .single();

  if (!complex) return;

  document.getElementById("back-link").href = `complex.html?slug=${encodeURIComponent(complexSlug)}`;

  const { data: apartment } = await supabaseClient
    .from("apartments")
    .select("*")
    .eq("complex_id", complex.id)
    .eq("slug", aptSlug)
    .eq("status", "published")
    .single();

  if (!apartment) {
    document.querySelector("main").innerHTML = `<div class="container page-main"><p>Layout not found.</p></div>`;
    return;
  }

  document.title = `${apartment.name_en} — ${complex.name_en} — AVORA`;

  const { data: media } = await supabaseClient
    .from("media")
    .select("*")
    .eq("owner_type", "apartment")
    .eq("owner_id", apartment.id)
    .order("sort_order", { ascending: true });

  const items = (media || []).map((m) => ({ kind: m.kind, url: m.url }));
  const carousel = document.getElementById("apartment-carousel");
  if (items.length > 0) {
    carousel.classList.remove("hidden");
    avoraRenderCarousel(carousel, items, apartment.name_en);
  }

  const name = avoraPick(apartment, "name") || apartment.name_en;
  const area = avoraFormatArea(apartment.area_from_sqm);
  const price = avoraFormatUsd(apartment.price_usd);
  const bedroomsLabel =
    apartment.bedrooms === 0 ? avoraT("studio") : apartment.bedrooms != null ? `${apartment.bedrooms} ${avoraT("bedrooms").toLowerCase()}` : null;

  document.getElementById("apartment-summary").innerHTML = `
    <h1 class="font-display" style="font-size:40px">${avoraEscapeHtml(name)}</h1>
    <div style="display:flex;flex-wrap:wrap;gap:20px;margin-top:16px;font-size:14px;color:rgba(247,247,245,0.75)">
      ${bedroomsLabel ? `<div style="display:flex;align-items:center;gap:6px"><i data-lucide="bed-double" width="15" height="15"></i>${bedroomsLabel}</div>` : ""}
      ${area ? `<div style="display:flex;align-items:center;gap:6px"><i data-lucide="ruler" width="15" height="15"></i>${area}</div>` : ""}
      ${price ? `<span style="color:var(--gold-soft)">${price}</span>` : ""}
    </div>
  `;

  const description = avoraPick(apartment, "description");
  if (description) {
    document.getElementById("block-description").classList.remove("hidden");
    avoraRenderLiteMarkdown(document.getElementById("description-text"), description);
  }

  if (apartment.floor_plan_url) {
    document.getElementById("block-floorplan").classList.remove("hidden");
    document.getElementById("floorplan-image").innerHTML = `<img src="${apartment.floor_plan_url}" alt="${avoraEscapeHtml(name)}" style="width:100%;object-fit:contain;background:var(--ink)" />`;
  }

  if (apartment.extra_specs && apartment.extra_specs.length > 0) {
    document.getElementById("block-specs").classList.remove("hidden");
    const locale = avoraGetLocale();
    document.getElementById("specs-list").innerHTML = apartment.extra_specs
      .map(
        (spec) => `
      <div style="display:flex;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--line);font-size:14px">
        <dt style="color:rgba(247,247,245,0.55)">${avoraEscapeHtml(locale === "ru" ? spec.label_ru : spec.label_en)}</dt>
        <dd style="color:rgba(247,247,245,0.9)">${avoraEscapeHtml(locale === "ru" ? spec.value_ru : spec.value_en)}</dd>
      </div>`
      )
      .join("");
  }

  avoraRenderLeadForm(document.getElementById("block-lead"), {
    complexId: complex.id,
    apartmentId: apartment.id,
    developerLeadUrl: complex.developer_lead_url,
  });

  avoraApplyTranslations();
  avoraRenderIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  avoraLoadApartment();
  document.addEventListener("avora:locale-changed", avoraLoadApartment);
});
