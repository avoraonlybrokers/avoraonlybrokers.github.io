(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;

  avoraRenderAdminShell("admin.html");
  const content = document.getElementById("admin-content");

  const [{ count: complexesCount }, { count: developersCount }, { count: guidesCount }, { count: visitsCount }] = await Promise.all([
    supabaseClient.from("complexes").select("id", { count: "exact", head: true }),
    supabaseClient.from("developers").select("id", { count: "exact", head: true }),
    supabaseClient.from("guides").select("id", { count: "exact", head: true }),
    supabaseClient.from("site_visits").select("id", { count: "exact", head: true }),
  ]);

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Панель управления</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">Здесь управляется весь сайт AVORA.</p>
    <div class="dash-cards" style="margin-top:32px">
      <a href="admin-complexes.html" class="dash-card"><p class="num">${complexesCount ?? 0}</p><p style="margin-top:4px;font-size:14px;color:rgba(247,247,245,0.6)">Комплексы</p></a>
      <a href="admin-developers.html" class="dash-card"><p class="num">${developersCount ?? 0}</p><p style="margin-top:4px;font-size:14px;color:rgba(247,247,245,0.6)">Застройщики</p></a>
      <a href="admin-guides.html" class="dash-card"><p class="num">${guidesCount ?? 0}</p><p style="margin-top:4px;font-size:14px;color:rgba(247,247,245,0.6)">Гайды</p></a>
      <div class="dash-card"><p class="num">${visitsCount ?? 0}</p><p style="margin-top:4px;font-size:14px;color:rgba(247,247,245,0.6)">Посещений сайта</p></div>
    </div>
  `;
})();
