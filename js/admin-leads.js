const LEAD_COLUMNS = [
  { key: "new", label: "Новые" },
  { key: "in_progress", label: "В работе" },
  { key: "closed", label: "Закрытые" },
];

(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-leads.html");
  const content = document.getElementById("admin-content");

  content.innerHTML = `
    <h1 class="font-display" style="font-size:32px">Leads</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">Inquiries submitted from complex and apartment pages.</p>
    <div class="leads-board" style="margin-top:32px">
      ${LEAD_COLUMNS.map((col) => `
        <div>
          <h2 style="font-size:14px;text-transform:uppercase;color:rgba(247,247,245,0.5);margin-bottom:12px">${col.label}</h2>
          <div id="col-${col.key}"></div>
        </div>`).join("")}
    </div>
  `;

  async function loadLeads() {
    const { data } = await supabaseClient
      .from("leads")
      .select("*, complex:complexes(name_en), apartment:apartments(name_en)")
      .order("created_at", { ascending: false });

    const leads = data || [];

    LEAD_COLUMNS.forEach((col) => {
      const columnLeads = leads.filter((l) => l.status === col.key);
      const el = document.getElementById(`col-${col.key}`);
      el.innerHTML = columnLeads.length
        ? columnLeads
            .map(
              (lead) => `
        <div class="lead-card">
          <p>${avoraEscapeHtml(lead.name)}</p>
          <p class="meta">${avoraEscapeHtml(lead.phone || "")}${lead.email ? " · " + avoraEscapeHtml(lead.email) : ""}</p>
          ${lead.apartment?.name_en || lead.complex?.name_en ? `<p style="font-size:12px;color:var(--gold-soft);margin-top:4px">${avoraEscapeHtml(lead.apartment?.name_en || lead.complex?.name_en)}</p>` : ""}
          ${lead.message ? `<p style="font-size:12px;margin-top:8px;color:rgba(247,247,245,0.7)">${avoraEscapeHtml(lead.message)}</p>` : ""}
          <p style="font-size:10px;margin-top:8px;color:rgba(247,247,245,0.3)">${new Date(lead.created_at).toLocaleString()}</p>
          <div class="move-btns">
            ${LEAD_COLUMNS.filter((c) => c.key !== col.key)
              .map((c) => `<button data-move="${lead.id}" data-to="${c.key}" class="chip-toggle">→ ${c.label}</button>`)
              .join("")}
          </div>
        </div>`
            )
            .join("")
        : `<p style="font-size:12px;color:rgba(247,247,245,0.3)">No leads.</p>`;
    });

    document.querySelectorAll("[data-move]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await supabaseClient.from("leads").update({ status: btn.dataset.to }).eq("id", btn.dataset.move);
        loadLeads();
      })
    );
  }

  loadLeads();
})();
