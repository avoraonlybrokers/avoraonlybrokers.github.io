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

  avoraRenderTrustBlock(document.getElementById("block-trust"), complex);
  avoraRenderMap(document.getElementById("block-map"), complex);

  // ---- Передаём комплекс в loadApartments ----
  await loadApartments(complex);

  // ---- Форма заявки для всего комплекса (если нет конкретного апартамента) ----
  avoraRenderLeadForm(document.getElementById("block-lead"), {
    complexId: complex.id,
    developerLeadUrl: complex.developer_lead_url,
  });

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
// Апартаменты — при клике раскрывается кнопка "Отправить заявку"
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

  const container = document.getElementById("apartments-list");
  container.innerHTML = apartments
    .map((apt, index) => {
      const name = avoraPick(apt, "name") || apt.name_en;
      const area = avoraFormatArea(apt.area_from_sqm);
      const price = avoraFormatUsd(apt.price_usd);
      const bedroomsLabel =
        apt.bedrooms != null
          ? `${apt.bedrooms} ${avoraT("bedrooms").toLowerCase()}`
          : "";

      return `
        <div class="apt-card" data-index="${index}" data-apt-id="${apt.id}" data-complex-id="${complex.id}">
          <div class="apt-card-main" style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:12px;padding:16px 20px;cursor:pointer;transition:border-color 0.2s">
            <div style="display:flex;align-items:center;gap:12px">
              <i data-lucide="layers" width="16" height="16" style="color:var(--gold-soft)"></i>
              <div>
                <p>${avoraEscapeHtml(name)}</p>
                <p style="font-size:12px;color:rgba(247,247,245,0.5)">
                  ${[area ? `${avoraT("listing_from")} ${area}` : "", bedroomsLabel].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            ${price ? `<span style="color:var(--gold-soft);font-size:14px">${price}</span>` : ""}
          </div>
          <div class="apt-card-expand" style="max-height:0;overflow:hidden;transition:max-height 0.4s ease, padding 0.3s ease;padding:0 20px;">
            <div style="display:flex;justify-content:flex-end;padding:12px 0 16px 0;">
              <button class="btn-gold apt-lead-btn" data-apt-id="${apt.id}" data-complex-id="${complex.id}" style="width:auto;padding:10px 28px;font-size:14px;">
                <i data-lucide="send" width="16" height="16"></i>
                <span data-i18n="send_lead"></span>
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // --- Анимация раскрытия/скрытия ---
  document.querySelectorAll(".apt-card-main").forEach((header, idx) => {
    header.addEventListener("click", () => {
      const card = header.closest(".apt-card");
      const expand = card.querySelector(".apt-card-expand");
      const isOpen = expand.style.maxHeight && expand.style.maxHeight !== "0px";

      // Закрываем все остальные
      document.querySelectorAll(".apt-card-expand").forEach((el) => {
        if (el !== expand) {
          el.style.maxHeight = "0px";
          el.style.padding = "0 20px";
        }
      });

      if (isOpen) {
        expand.style.maxHeight = "0px";
        expand.style.padding = "0 20px";
      } else {
        expand.style.maxHeight = expand.scrollHeight + 40 + "px";
        expand.style.padding = "12px 20px 16px 20px";
      }
    });
  });

  // --- Обработка кнопок "Отправить заявку" ---
  document.querySelectorAll(".apt-lead-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const aptId = btn.dataset.aptId;
      const complexId = btn.dataset.complexId;

      // Находим форму заявки и подставляем apartment_id
      const leadForm = document.getElementById("avora-lead-form");
      if (leadForm) {
        // Добавляем скрытое поле apartment_id, если его нет
        let hiddenInput = leadForm.querySelector('input[name="apartment_id"]');
        if (!hiddenInput) {
          hiddenInput = document.createElement("input");
          hiddenInput.type = "hidden";
          hiddenInput.name = "apartment_id";
          leadForm.prepend(hiddenInput);
        }
        hiddenInput.value = aptId;

        // Прокручиваем к форме
        leadForm.scrollIntoView({ behavior: "smooth", block: "center" });

        // Меняем текст кнопки формы, чтобы было понятно
        const submitBtn = leadForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          const aptName = btn.closest(".apt-card").querySelector(".apt-card-main p")?.textContent || "";
          submitBtn.textContent = `Отправить заявку на ${aptName}`;
          // Через секунду возвращаем обратно
          setTimeout(() => {
            submitBtn.innerHTML = `<i data-lucide="send" width="15" height="15"></i> ${avoraT("send_lead")}`;
            avoraRenderIcons();
          }, 3000);
        }
      }
    });
  });

  avoraRenderIcons();
  avoraApplyTranslations();
}

document.addEventListener("DOMContentLoaded", () => {
  avoraLoadComplex();
  document.addEventListener("avora:locale-changed", avoraLoadComplex);
});
