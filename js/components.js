function avoraFormatUsd(value) {
  if (value === null || value === undefined) return null;
  return `$${Math.round(Number(value)).toLocaleString("en-US")}`;
}

function avoraFormatArea(value) {
  if (value === null || value === undefined) return null;
  return `${Number(value).toLocaleString("en-US")} m²`;
}

function avoraProjectCardHTML(complex) {
  const name = avoraPick(complex, "name") || complex.name_en;
  const priceFrom = avoraFormatUsd(complex.price_from_usd);
  return `
    <a href="complex.html?slug=${encodeURIComponent(complex.slug)}" class="project-card reveal">
      <div class="card-media">
        ${complex.cover_image_url ? `<img src="${complex.cover_image_url}" alt="${avoraEscapeHtml(name)}" loading="lazy" />` : `<div class="no-image"></div>`}
        <div class="card-scrim"></div>
        <div class="card-info">
          <div class="card-location"><i data-lucide="map-pin" width="13" height="13"></i><span>${avoraEscapeHtml(complex.city)}, ${avoraEscapeHtml(complex.country)}</span></div>
          <h3 class="card-title font-display">${avoraEscapeHtml(name)}</h3>
          ${priceFrom ? `<p class="card-price">${avoraT("listing_from")} ${priceFrom}</p>` : ""}
        </div>
      </div>
    </a>`;
}

function avoraDeveloperCountLabel(n) {
  const locale = avoraGetLocale();
  if (locale === "ru") {
    if (n === 0) return "0 проектов";
    if (n === 1) return "1 проект";
    if (n < 5) return `${n} проекта`;
    return `${n} проектов`;
  }
  return `${n} ${n === 1 ? "project" : "projects"}`;
}

function avoraDeveloperCardHTML(dev, count) {
  const name = avoraPick(dev, "name") || dev.name_en;
  return `
    <a href="developer.html?id=${dev.id}" class="developer-card reveal">
      <div class="developer-logo-circle">
        ${dev.logo_url ? `<img src="${dev.logo_url}" alt="${avoraEscapeHtml(name)}" />` : `<i data-lucide="building-2" width="22" height="22" style="color:rgba(247,247,245,0.5)"></i>`}
      </div>
      <div>
        <p class="developer-name font-display">${avoraEscapeHtml(name)}</p>
        <p class="developer-count">${avoraDeveloperCountLabel(count)}</p>
      </div>
    </a>`;
}

// ============================================================
// Reusable render helpers shared by complex.js and apartment.js
// ============================================================

const AMENITY_MAP = {
  pool: { icon: "waves", ru: "Бассейн", en: "Pool" },
  spa: { icon: "sparkles", ru: "SPA", en: "Spa" },
  gym: { icon: "dumbbell", ru: "Фитнес", en: "Fitness" },
  security: { icon: "shield-check", ru: "Охрана", en: "Security" },
  park: { icon: "trees", ru: "Парк", en: "Park" },
  cafe: { icon: "coffee", ru: "Кафе", en: "Cafe" },
  parking: { icon: "car-front", ru: "Паркинг", en: "Parking" },
  kids: { icon: "baby", ru: "Детская зона", en: "Kids area" },
  wifi: { icon: "wifi", ru: "Wi-Fi", en: "Wi-Fi" },
  lobby: { icon: "building", ru: "Лобби", en: "Lobby" },
};

function avoraRenderAmenities(container, amenities) {
  const known = (amenities || []).filter((key) => AMENITY_MAP[key]);
  if (known.length === 0) { container.classList.add("hidden"); return; }
  const locale = avoraGetLocale();
  container.innerHTML = `
    <h3 style="font-size:24px;margin-bottom:8px" data-i18n="amenities"></h3>
    <div class="amenity-grid">
      ${known.map((key) => {
        const a = AMENITY_MAP[key];
        return `<div class="amenity-item"><i data-lucide="${a.icon}" width="18" height="18"></i><span>${locale === "ru" ? a.ru : a.en}</span></div>`;
      }).join("")}
    </div>`;
  avoraApplyTranslations();
  avoraRenderIcons();
}

// items: [{ kind: 'image'|'video', url }]
function avoraRenderCarousel(container, items, title) {
  if (!items || items.length === 0) { container.classList.add("hidden"); return; }
  let index = 0;

  container.innerHTML = `
    <div class="carousel-track" id="carousel-track"></div>
    <div class="carousel-scrim"></div>
    ${items.length > 1 ? `
    <button class="carousel-arrow prev" aria-label="Previous"><i data-lucide="chevron-left" width="18" height="18"></i></button>
    <button class="carousel-arrow next" aria-label="Next"><i data-lucide="chevron-right" width="18" height="18"></i></button>
    <div class="carousel-dots">${items.map((_, i) => `<button data-i="${i}" class="${i === 0 ? "active" : ""}"></button>`).join("")}</div>
    ` : ""}
  `;

  const track = container.querySelector("#carousel-track");

  function render() {
    const item = items[index];
    track.innerHTML =
      item.kind === "video"
        ? `<video src="${item.url}" controls playsinline></video>`
        : `<img src="${item.url}" alt="${avoraEscapeHtml(title)}" loading="${index === 0 ? "eager" : "lazy"}" />`;
    container.querySelectorAll(".carousel-dots button").forEach((b, i) => b.classList.toggle("active", i === index));
  }

  function go(dir) {
    index = (index + dir + items.length) % items.length;
    render();
  }

  container.querySelector(".prev")?.addEventListener("click", () => go(-1));
  container.querySelector(".next")?.addEventListener("click", () => go(1));
  container.querySelectorAll(".carousel-dots button").forEach((btn) => {
    btn.addEventListener("click", () => { index = Number(btn.dataset.i); render(); });
  });

  // basic touch swipe
  let startX = null;
  container.addEventListener("touchstart", (e) => (startX = e.touches[0].clientX), { passive: true });
  container.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const diff = e.changedTouches[0].clientX - startX;
    if (diff > 60) go(-1);
    else if (diff < -60) go(1);
    startX = null;
  });

  render();
  avoraRenderIcons();
}

function avoraRenderTrustBlock(container, complex) {
  const items = [
    { enabled: complex.trust_history_enabled, icon: "scroll-text", key: "trust_history" },
    { enabled: complex.trust_legal_enabled, icon: "file-search", key: "trust_legal" },
    { enabled: complex.trust_construction_enabled, icon: "hard-hat", key: "trust_construction" },
    { enabled: complex.trust_contract_enabled, icon: "badge-check", key: "trust_contract" },
  ].filter((i) => i.enabled);

  if (items.length === 0) { container.classList.add("hidden"); return; }

  container.innerHTML = `
    <div class="trust-head"><i data-lucide="badge-check" width="18" height="18"></i><h3 style="font-size:20px" data-i18n="trust_title"></h3></div>
    <div class="trust-items">
      ${items.map((i) => `<div class="trust-item"><i data-lucide="${i.icon}" width="20" height="20"></i><span data-i18n="${i.key}"></span></div>`).join("")}
    </div>`;
  avoraApplyTranslations();
  avoraRenderIcons();
}

function avoraRenderMap(container, complex) {
  if (complex.latitude == null || complex.longitude == null) { container.classList.add("hidden"); return; }
  const apiKey = AVORA_CONFIG.GOOGLE_MAPS_API_KEY;
  const embedSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${complex.latitude},${complex.longitude}&zoom=14`
    : `https://maps.google.com/maps?q=${complex.latitude},${complex.longitude}&z=14&output=embed`;
  const externalUrl = complex.google_maps_url || `https://www.google.com/maps?q=${complex.latitude},${complex.longitude}`;

  container.innerHTML = `
    <div class="map-embed"><iframe src="${embedSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
    <a class="map-link" href="${externalUrl}" target="_blank" rel="noopener noreferrer">
      <span data-i18n="open_in_maps"></span><i data-lucide="external-link" width="14" height="14"></i>
    </a>`;
  avoraApplyTranslations();
  avoraRenderIcons();
}

function avoraRenderLeadForm(container, { complexId, apartmentId, developerLeadUrl }) {
  container.innerHTML = `
    <form id="avora-lead-form">
      <input class="form-field" id="lead-name" required data-i18n-placeholder="form_name" />
      <input class="form-field" id="lead-phone" required data-i18n-placeholder="form_phone" />
      <input class="form-field" type="email" id="lead-email" data-i18n-placeholder="form_email" />
      <textarea class="form-field" id="lead-message" rows="3" data-i18n-placeholder="form_message"></textarea>
      <button type="submit" class="btn-gold" id="lead-submit-btn">
        <span data-i18n="send_lead"></span> <i data-lucide="send" width="15" height="15"></i>
      </button>
    </form>`;
  avoraApplyTranslations();
  avoraRenderIcons();

  const form = container.querySelector("#avora-lead-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = container.querySelector("#lead-submit-btn");
    btn.disabled = true;
    const payload = {
      name: container.querySelector("#lead-name").value,
      phone: container.querySelector("#lead-phone").value,
      email: container.querySelector("#lead-email").value || null,
      message: container.querySelector("#lead-message").value || null,
      complex_id: complexId || null,
      apartment_id: apartmentId || null,
      status: "new",
    };
    const { error } = await supabaseClient.from("leads").insert(payload);
    if (!error) {
      container.innerHTML = `<div style="display:flex;align-items:center;gap:8px;border:1px solid rgba(198,161,91,0.4);background:rgba(198,161,91,0.1);color:var(--gold-soft);padding:16px 20px;border-radius:12px;">
        <i data-lucide="check" width="16" height="16"></i><span data-i18n="form_sent"></span>
      </div>`;
      avoraApplyTranslations();
      avoraRenderIcons();
      if (developerLeadUrl) window.open(developerLeadUrl, "_blank", "noopener,noreferrer");
    } else {
      btn.disabled = false;
    }
  });
}
