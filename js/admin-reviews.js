function avoraAdminStarsHTML(rating) {
  let html = '<span style="display:inline-flex;gap:2px;color:var(--gold)">';
  for (let i = 1; i <= 5; i++) {
    html += `<i data-lucide="star" width="14" height="14" fill="${i <= rating ? "currentColor" : "none"}" style="${i > rating ? "color:rgba(247,247,245,0.25)" : ""}"></i>`;
  }
  return html + "</span>";
}

(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-reviews.html");
  const content = document.getElementById("admin-content");

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Отзывы</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">
      Новые отзывы попадают в «На модерации». Одобрите — появится на сайте, отклоните — удалится без возможности восстановления.
    </p>

    <div class="leads-board" style="margin-top:32px">
      <div>
        <h2 style="font-size:14px;text-transform:uppercase;color:rgba(247,247,245,0.5);margin-bottom:12px">На модерации</h2>
        <div id="col-pending"></div>
      </div>
      <div>
        <h2 style="font-size:14px;text-transform:uppercase;color:rgba(247,247,245,0.5);margin-bottom:12px">Опубликованы</h2>
        <div id="col-published"></div>
      </div>
      <div>
        <h2 style="font-size:14px;text-transform:uppercase;color:rgba(247,247,245,0.5);margin-bottom:12px">Скрыты</h2>
        <div id="col-hidden"></div>
      </div>
    </div>
  `;

  async function loadReviews() {
    const { data } = await supabaseClient.from("reviews").select("*").order("created_at", { ascending: false });
    const reviews = data || [];

    function renderColumn(elId, status, actionsHTML) {
      const el = document.getElementById(elId);
      const list = reviews.filter((r) => r.status === status);
      el.innerHTML = list.length
        ? list
            .map(
              (r) => `
        <div class="lead-card">
          ${avoraAdminStarsHTML(r.rating)}
          <p style="margin-top:6px">${avoraEscapeHtml(r.author_name)}</p>
          <p style="font-size:12px;margin-top:6px;color:rgba(247,247,245,0.7)">${avoraEscapeHtml(r.review_text)}</p>
          <p style="font-size:10px;margin-top:8px;color:rgba(247,247,245,0.3)">${new Date(r.created_at).toLocaleString()}</p>
          <div class="move-btns" data-id="${r.id}">${actionsHTML}</div>
        </div>`
            )
            .join("")
        : `<p style="font-size:12px;color:rgba(247,247,245,0.3)">Пусто.</p>`;
    }

    renderColumn(
      "col-pending",
      "pending",
      `<button data-action="approve" class="chip-toggle">Опубликовать</button><button data-action="reject" class="chip-toggle" style="color:#f87171">Отклонить</button>`
    );
    renderColumn(
      "col-published",
      "published",
      `<button data-action="hide" class="chip-toggle">Скрыть</button><button data-action="delete" class="chip-toggle" style="color:#f87171">Удалить</button>`
    );
    renderColumn(
      "col-hidden",
      "hidden",
      `<button data-action="approve" class="chip-toggle">Показать снова</button><button data-action="delete" class="chip-toggle" style="color:#f87171">Удалить</button>`
    );

    avoraRenderIcons();

    document.querySelectorAll("[data-id]").forEach((wrap) => {
      const id = wrap.dataset.id;
      wrap.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const action = btn.dataset.action;
          if (action === "approve") {
            await supabaseClient.from("reviews").update({ status: "published" }).eq("id", id);
          } else if (action === "hide") {
            await supabaseClient.from("reviews").update({ status: "hidden" }).eq("id", id);
          } else if (action === "reject" || action === "delete") {
            if (!confirm("Удалить этот отзыв без возможности восстановления?")) return;
            await supabaseClient.from("reviews").delete().eq("id", id);
          }
          loadReviews();
        });
      });
    });
  }

  loadReviews();
})();
