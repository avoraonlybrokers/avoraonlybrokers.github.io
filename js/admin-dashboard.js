(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;

  avoraRenderAdminShell("admin.html");
  const content = document.getElementById("admin-content");

  const [{ count: complexesCount }, { count: guidesCount }, { count: pendingReviewsCount }] = await Promise.all([
    supabaseClient.from("complexes").select("id", { count: "exact", head: true }),
    supabaseClient.from("guides").select("id", { count: "exact", head: true }),
    supabaseClient.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Панель управления</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">Здесь управляется весь сайт AVORA.</p>
    <div class="dash-cards" style="margin-top:32px">
      <a href="admin-complexes.html" class="dash-card"><p class="num">${complexesCount ?? 0}</p><p style="margin-top:4px;font-size:14px;color:rgba(247,247,245,0.6)">Комплексы</p></a>
      <a href="admin-guides.html" class="dash-card"><p class="num">${guidesCount ?? 0}</p><p style="margin-top:4px;font-size:14px;color:rgba(247,247,245,0.6)">Гайды</p></a>
      <a href="admin-reviews.html" class="dash-card"><p class="num">${pendingReviewsCount ?? 0}</p><p style="margin-top:4px;font-size:14px;color:rgba(247,247,245,0.6)">Отзывов на модерации</p></a>
    </div>
  `;
})();
