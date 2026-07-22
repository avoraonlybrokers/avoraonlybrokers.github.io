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

const GUIDE_COUNTRY_ICON = {
  uae: "landmark",
  bali: "palm-tree",
  thailand: "waves",
};

function avoraGuideCoverHTML(guide) {
  if (guide.cover_image_url) {
    return `<img src="${guide.cover_image_url}" alt="${avoraEscapeHtml(avoraPick(guide, "title") || guide.title_ru)}" loading="lazy" />`;
  }
  const icon = GUIDE_COUNTRY_ICON[guide.country] || "book-open";
  return `<div class="guide-cover-fallback country-${guide.country || "uae"}"><i data-lucide="${icon}" width="34" height="34"></i></div>`;
}

function avoraGuideExcerpt(text, maxLen) {
  if (!text) return "";
  const plain = text.replace(/^##.*$/gm, "").replace(/\*\*/g, "").replace(/^- /gm, "").replace(/\n+/g, " ").trim();
  return plain.length > maxLen ? plain.slice(0, maxLen).trim() + "…" : plain;
}

function avoraGuideCardHTML(guide) {
  const title = avoraPick(guide, "title") || guide.title_ru;
  const subtitle = avoraPick(guide, "subtitle") || guide.subtitle_ru;
  const content = avoraPick(guide, "content") || guide.content_ru;
  const dateLabel = guide.published_date
    ? new Date(guide.published_date).toLocaleDateString(avoraGetLocale() === "ru" ? "ru-RU" : "en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return `
    <a href="guide.html?slug=${encodeURIComponent(guide.slug)}" class="guide-card reveal">
      <div class="guide-cover">
        ${avoraGuideCoverHTML(guide)}
        <span class="guide-cover-tag">${avoraEscapeHtml((guide.country || "").toUpperCase())}</span>
      </div>
      <div class="guide-body">
        <p class="guide-date">${avoraEscapeHtml(dateLabel)}</p>
        <h3 class="guide-title font-display">${avoraEscapeHtml(title)}</h3>
        <p class="guide-excerpt">${avoraEscapeHtml(subtitle || avoraGuideExcerpt(content, 110))}</p>
        <span class="guide-readmore"><span data-i18n="guides_read_more"></span><i data-lucide="arrow-up-right" width="13" height="13"></i></span>
      </div>
    </a>`;
}

// Very small "lite markdown" renderer used for guide content:
// "## " starts a subheading, "- " starts a list item, "**bold**"
// renders as <strong>, blank lines separate paragraphs.
function avoraInlineFormat(str) {
  let escaped = avoraEscapeHtml(str);
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return escaped;
}

function avoraRenderLiteMarkdown(container, text) {
  if (!text) { container.innerHTML = ""; return; }
  const lines = text.split("\n");
  let html = "";
  let inList = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") {
      if (inList) { html += "</ul>"; inList = false; }
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<h3>${avoraInlineFormat(line.slice(3))}</h3>`;
    } else if (line.startsWith("- ")) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${avoraInlineFormat(line.slice(2))}</li>`;
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${avoraInlineFormat(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  container.innerHTML = html;
}

// ============================================================
// Reusable render helpers shared by complex.js and apartment.js
// ============================================================

const AMENITY_MAP = {
  pool: { icon: "waves", ru: "Бассейн", en: "Pool" },
  spa: { icon: "sparkles", ru: "Спа и велнес", en: "Spa & Wellness" },
  gym: { icon: "dumbbell", ru: "Фитнес-зал", en: "Fitness" },
  security: { icon: "shield-check", ru: "Круглосуточная охрана", en: "24/7 Security" },
  concierge: { icon: "concierge-bell", ru: "Консьерж-сервис", en: "Concierge" },
  park: { icon: "trees", ru: "Частный парк", en: "Private Park" },
  cafe: { icon: "coffee", ru: "Кафе", en: "Cafe" },
  restaurant: { icon: "utensils-crossed", ru: "Ресторан", en: "Restaurant" },
  parking: { icon: "car-front", ru: "Частная парковка", en: "Private Parking" },
  kids: { icon: "baby", ru: "Детская игровая зона", en: "Kids Area" },
  wifi: { icon: "wifi", ru: "Wi-Fi", en: "Wi-Fi" },
  lobby: { icon: "building", ru: "Лобби", en: "Lobby" },
  bbq: { icon: "flame", ru: "Зона барбекю", en: "BBQ Area" },
  smart_home: { icon: "cpu", ru: "Система Умный дом", en: "Smart Home" },
  yoga: { icon: "flower-2", ru: "Йога пространство", en: "Yoga Space" },
  surf: { icon: "wind", ru: "Серф-волна", en: "Surf Wave" },
  coworking: { icon: "laptop", ru: "Коворкинг", en: "Coworking" },
  art_bridge: { icon: "palette", ru: "Арт-мост", en: "Art Bridge" },
  event_space: { icon: "calendar", ru: "Event-пространство", en: "Event Space" },
  cinema: { icon: "clapperboard", ru: "Кинозал", en: "Cinema Room" },
  rooftop: { icon: "sunrise", ru: "Терраса на крыше", en: "Rooftop Terrace" },
  private_beach: { icon: "umbrella", ru: "Доступ к частному пляжу", en: "Private Beach Access" },
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
        return `<div class="amenity-item reveal"><i data-lucide="${a.icon}" width="18" height="18"></i><span>${locale === "ru" ? a.ru : a.en}</span></div>`;
      }).join("")}
    </div>`;
  avoraApplyTranslations();
  avoraRenderIcons();
  avoraObserveNewReveals(container);
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
    { enabled: complex.trust_history_enabled, icon: "scroll-text", key: "trust_history", text: complex.trust_history_text },
    { enabled: complex.trust_legal_enabled, icon: "file-search", key: "trust_legal", text: complex.trust_legal_text },
    { enabled: complex.trust_construction_enabled, icon: "hard-hat", key: "trust_construction", text: complex.trust_construction_text },
    { enabled: complex.trust_contract_enabled, icon: "badge-check", key: "trust_contract", text: complex.trust_contract_text },
  ].filter((i) => i.enabled);

  if (items.length === 0) { container.classList.add("hidden"); return; }

  container.innerHTML = `
    <div class="trust-head"><i data-lucide="badge-check" width="18" height="18"></i><h3 style="font-size:20px" data-i18n="trust_title"></h3></div>
    <div class="trust-items">
      ${items.map((i) => `<div class="trust-item reveal"><i data-lucide="${i.icon}" width="20" height="20"></i><span data-i18n="${i.key}"></span>${i.text ? `<p class="trust-item-text">${avoraEscapeHtml(i.text)}</p>` : ""}</div>`).join("")}
    </div>`;
  avoraApplyTranslations();
  avoraRenderIcons();
  avoraObserveNewReveals(container);
}

function avoraRenderMap(container, complex) {
  const hasCoords = complex.latitude != null && complex.longitude != null;
  const hasAddress = !!(complex.map_address && complex.map_address.trim());

  if (!hasCoords && !hasAddress && !complex.google_maps_url) {
    container.classList.add("hidden");
    return;
  }

  const query = hasCoords ? `${complex.latitude},${complex.longitude}` : hasAddress ? complex.map_address : null;
  const apiKey = AVORA_CONFIG.GOOGLE_MAPS_API_KEY;

  let embedHTML = "";
  if (query) {
    const embedSrc = apiKey
      ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(query)}`
      : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
    embedHTML = `<div class="map-embed"><iframe src="${embedSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
  }

  const externalUrl = complex.google_maps_url || `https://www.google.com/maps?q=${encodeURIComponent(query)}`;

  container.innerHTML = `
    ${embedHTML}
    <a class="map-link" href="${externalUrl}" target="_blank" rel="noopener noreferrer">
      <span data-i18n="open_in_maps"></span><i data-lucide="external-link" width="14" height="14"></i>
    </a>`;
  avoraApplyTranslations();
  avoraRenderIcons();
}

function avoraRenderLeadForm(container, { developerLeadUrl }) {
  if (!developerLeadUrl) {
    container.classList.add("hidden");
    return;
  }
  container.innerHTML = `
    <a href="${developerLeadUrl}" target="_blank" rel="noopener noreferrer" class="btn-gold" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none">
      <span data-i18n="send_lead"></span> <i data-lucide="send" width="15" height="15"></i>
    </a>`;
  avoraApplyTranslations();
  avoraRenderIcons();
}

// ============================================================
// Reviews
// ============================================================

function avoraStarRowHTML(rating, size) {
  const s = size || 15;
  let html = '<span class="star-row">';
  for (let i = 1; i <= 5; i++) {
    html += `<i data-lucide="star" width="${s}" height="${s}" ${i > rating ? 'class="empty"' : ""} fill="${i <= rating ? "currentColor" : "none"}"></i>`;
  }
  return html + "</span>";
}

function avoraReviewCardHTML(review) {
  return `
    <div class="review-card reveal">
      ${avoraStarRowHTML(review.rating)}
      <p class="review-card-text">${avoraEscapeHtml(review.review_text)}</p>
      <p class="review-card-name">${avoraEscapeHtml(review.author_name)}</p>
    </div>`;
}

async function avoraLoadReviews(gridId, emptyId, limit) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid) return;

  let query = supabaseClient.from("reviews").select("*").eq("status", "published").order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    if (empty) empty.classList.remove("hidden");
    return;
  }
  if (empty) empty.classList.add("hidden");
  grid.innerHTML = data.map(avoraReviewCardHTML).join("");
  avoraRenderIcons();
  avoraObserveNewReveals(grid);
}

function avoraWireReviewModal() {
  const trigger = document.getElementById("avora-review-trigger");
  const overlay = document.getElementById("avora-review-overlay");
  if (!trigger || !overlay) return;

  let selectedRating = 0;

  function renderStarPicker() {
    const picker = document.getElementById("review-star-picker");
    picker.innerHTML = [1, 2, 3, 4, 5]
      .map((n) => `<button type="button" data-star="${n}" class="${n <= selectedRating ? "active" : ""}"><i data-lucide="star" width="26" height="26" fill="${n <= selectedRating ? "currentColor" : "none"}"></i></button>`)
      .join("");
    avoraRenderIcons();
    picker.querySelectorAll("[data-star]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedRating = Number(btn.dataset.star);
        renderStarPicker();
      });
    });
  }

  trigger.addEventListener("click", () => {
    overlay.classList.add("open");
    selectedRating = 0;
    renderStarPicker();
  });

  overlay.querySelector(".modal-close").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

  const form = document.getElementById("review-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("review-form-error");
    errorEl.classList.add("hidden");

    if (selectedRating === 0) {
      errorEl.textContent = avoraGetLocale() === "ru" ? "Пожалуйста, выберите оценку." : "Please choose a rating.";
      errorEl.classList.remove("hidden");
      return;
    }

    const submitBtn = document.getElementById("review-submit-btn");
    submitBtn.disabled = true;

    const { error } = await supabaseClient.from("reviews").insert({
      author_name: document.getElementById("review-name").value,
      rating: selectedRating,
      review_text: document.getElementById("review-text").value,
      status: "pending",
    });

    submitBtn.disabled = false;

    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove("hidden");
      return;
    }

    document.getElementById("review-form-wrap").classList.add("hidden");
    document.getElementById("review-success-wrap").classList.remove("hidden");
    setTimeout(() => {
      overlay.classList.remove("open");
      form.reset();
      selectedRating = 0;
      renderStarPicker();
      document.getElementById("review-form-wrap").classList.remove("hidden");
      document.getElementById("review-success-wrap").classList.add("hidden");
    }, 1800);
  });
}
