const ADMIN_NAV = [
  { href: "admin.html", label: "Dashboard", icon: "layout-dashboard" },
  { href: "admin-complexes.html", label: "Complexes", icon: "building" },
  { href: "admin-developers.html", label: "Developers", icon: "users" },
  { href: "admin-leads.html", label: "Leads", icon: "share-2" },
  { href: "admin-settings.html", label: "Settings & Social", icon: "settings" },
];

// Resolves once the auth state is known. Redirects away if the
// session does not belong to the admin user. Every admin-*.html
// page must call this before rendering anything sensitive.
async function avoraRequireAdmin() {
  const { data } = await supabaseClient.auth.getUser();
  const role = data?.user?.user_metadata?.role;
  if (!data?.user || role !== "admin") {
    window.location.href = "index.html";
    return null;
  }
  return data.user;
}

function avoraRenderAdminShell(activeHref) {
  const shell = document.getElementById("admin-shell");
  if (!shell) return;

  const currentPage = activeHref || window.location.pathname.split("/").pop();

  shell.innerHTML = `
    <aside class="admin-sidebar">
      <a href="index.html" class="brand-logo">AVORA</a>
      ${ADMIN_NAV.map(
        (item) => `
        <a href="${item.href}" class="admin-nav-link ${item.href === currentPage ? "active" : ""}">
          <i data-lucide="${item.icon}" width="16" height="16"></i>${item.label}
        </a>`
      ).join("")}
      <a href="index.html" class="admin-nav-link" style="margin-top:auto">
        <i data-lucide="home" width="16" height="16"></i>View site
      </a>
      <button id="admin-logout-btn" class="admin-nav-link" style="border:none;background:none;text-align:left;color:rgba(247,247,245,0.5)">
        <i data-lucide="log-out" width="16" height="16"></i>Log out
      </button>
    </aside>
    <main class="admin-main" id="admin-content"></main>
  `;
  shell.classList.add("admin-shell");

  document.getElementById("admin-logout-btn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });

  avoraRenderIcons();
}

// Uploads a file to Supabase Storage and returns its public URL.
// bucket must already exist and be public (see README).
async function avoraUploadFile(file, folder) {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseClient.storage.from("avora-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseClient.storage.from("avora-media").getPublicUrl(path);
  return data.publicUrl;
}

function avoraWireUploadButton(buttonId, inputId, targetInputId, folder, onDone) {
  const button = document.getElementById(buttonId);
  const input = document.getElementById(inputId);
  if (!button || !input) return;
  button.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    button.textContent = "Uploading…";
    try {
      const url = await avoraUploadFile(file, folder);
      document.getElementById(targetInputId).value = url;
      if (onDone) onDone(url);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      button.textContent = "Upload";
      input.value = "";
    }
  });
}
