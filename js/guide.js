async function avoraLoadGuide() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  if (!slug) return;

  const { data: guide } = await supabaseClient
    .from("guides")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!guide) {
    document.querySelector("main").innerHTML = `<div class="container page-main"><p>Guide not found.</p></div>`;
    return;
  }

  const title = avoraPick(guide, "title") || guide.title_ru;
  const subtitle = avoraPick(guide, "subtitle") || guide.subtitle_ru;
  const content = avoraPick(guide, "content") || guide.content_ru;
  const dateLabel = guide.published_date
    ? new Date(guide.published_date).toLocaleDateString(avoraGetLocale() === "ru" ? "ru-RU" : "en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  document.title = `${guide.title_en || guide.title_ru} — AVORA`;

  const heroEl = document.getElementById("guide-hero");
  heroEl.classList.remove("hidden");
  if (guide.cover_image_url) {
    heroEl.innerHTML = `<img src="${guide.cover_image_url}" alt="${avoraEscapeHtml(title)}" style="width:100%;height:100%;object-fit:cover" />`;
  } else {
    heroEl.innerHTML = avoraGuideCoverHTML(guide);
  }
  heroEl.insertAdjacentHTML("beforeend", `<div class="guide-hero-scrim"></div>`);

  document.getElementById("guide-header").innerHTML = `
    <p class="guide-date">${avoraEscapeHtml(dateLabel)}</p>
    <h1 class="font-display" style="font-size:38px;margin-top:8px;line-height:1.25">${avoraEscapeHtml(title)}</h1>
    ${subtitle ? `<p style="margin-top:14px;color:rgba(247,247,245,0.65);font-size:16px;line-height:1.6">${avoraEscapeHtml(subtitle)}</p>` : ""}
  `;

  avoraRenderLiteMarkdown(document.getElementById("guide-content"), content);
  avoraApplyTranslations();
  avoraRenderIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  avoraLoadGuide();
  document.addEventListener("avora:locale-changed", avoraLoadGuide);
});
