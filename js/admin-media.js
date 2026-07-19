(async function () {
  const user = await avoraRequireAdmin();
  if (!user) return;
  avoraRenderAdminShell("admin-complexes.html");
  const content = document.getElementById("admin-content");

  const params = new URLSearchParams(window.location.search);
  const ownerType = params.get("owner_type"); // 'complex' | 'apartment'
  const ownerId = params.get("owner_id");
  const ownerName = params.get("name") || "";

  if (!ownerType || !ownerId) {
    content.innerHTML = `<p>Missing owner_type / owner_id in URL.</p>`;
    return;
  }

  const backHref = ownerType === "complex" ? "admin-complexes.html" : "javascript:history.back()";

  content.innerHTML = `
    <a href="${backHref}" style="display:inline-flex;align-items:center;gap:6px;font-size:14px;color:rgba(247,247,245,0.6);margin-bottom:16px">
      <i data-lucide="chevron-left" width="15" height="15"></i>Back
    </a>
    <h1 class="font-display" style="font-size:32px">Media — ${avoraEscapeHtml(ownerName)}</h1>
    <p style="margin-top:8px;font-size:14px;color:rgba(247,247,245,0.5)">Up to 15 photos and 10 videos.</p>

    <div style="margin-top:24px;border:1px solid var(--line);border-radius:14px;padding:24px">
      <h3 style="font-size:18px;margin-bottom:12px">Photos <span id="photo-count" class="meta"></span></h3>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <button type="button" id="photo-upload-btn" class="btn-outline-gold" style="width:auto;padding:10px 20px">Upload photo</button>
        <input type="file" id="photo-upload-input" accept="image/*" multiple class="hidden" />
        <span id="photo-upload-status" style="font-size:12px;color:rgba(247,247,245,0.5)"></span>
      </div>
      <div id="photo-grid" class="media-thumb-grid"></div>
    </div>

    <div style="margin-top:24px;border:1px solid var(--line);border-radius:14px;padding:24px">
      <h3 style="font-size:18px;margin-bottom:12px">Videos <span id="video-count" class="meta"></span></h3>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <button type="button" id="video-upload-btn" class="btn-outline-gold" style="width:auto;padding:10px 20px">Upload video</button>
        <input type="file" id="video-upload-input" accept="video/*" multiple class="hidden" />
        <span id="video-upload-status" style="font-size:12px;color:rgba(247,247,245,0.5)"></span>
      </div>
      <div id="video-grid" class="media-thumb-grid"></div>
    </div>
  `;
  avoraRenderIcons();

  async function loadMedia() {
    const { data } = await supabaseClient
      .from("media")
      .select("*")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
      .order("sort_order", { ascending: true });

    const photos = (data || []).filter((m) => m.kind === "image");
    const videos = (data || []).filter((m) => m.kind === "video");

    document.getElementById("photo-count").textContent = `(${photos.length}/15)`;
    document.getElementById("video-count").textContent = `(${videos.length}/10)`;

    document.getElementById("photo-grid").innerHTML = photos
      .map((m) => `<div class="media-thumb"><img src="${m.url}" /><button data-delete="${m.id}"><i data-lucide="x" width="12" height="12"></i></button></div>`)
      .join("");
    document.getElementById("video-grid").innerHTML = videos
      .map((m) => `<div class="media-thumb"><video src="${m.url}" muted></video><button data-delete="${m.id}"><i data-lucide="x" width="12" height="12"></i></button></div>`)
      .join("");
    avoraRenderIcons();

    document.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await supabaseClient.from("media").delete().eq("id", btn.dataset.delete);
        loadMedia();
      })
    );

    return { photoCount: photos.length, videoCount: videos.length };
  }

  function wireUploader(buttonId, inputId, statusId, kind, folder, limit, getCurrentCount) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    const status = document.getElementById(statusId);

    button.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      const currentCount = await getCurrentCount();
      if (currentCount + files.length > limit) {
        alert(`Limit is ${limit}. You currently have ${currentCount}.`);
        input.value = "";
        return;
      }

      for (let i = 0; i < files.length; i++) {
        status.textContent = `Uploading ${i + 1}/${files.length}…`;
        try {
          const url = await avoraUploadFile(files[i], folder);
          await supabaseClient.from("media").insert({
            owner_type: ownerType,
            owner_id: ownerId,
            kind,
            url,
            sort_order: currentCount + i,
          });
        } catch (err) {
          alert("Upload failed: " + err.message);
        }
      }
      status.textContent = "";
      input.value = "";
      loadMedia();
    });
  }

  wireUploader("photo-upload-btn", "photo-upload-input", "photo-upload-status", "image", "media/photos", 15, async () => (await loadMedia()).photoCount);
  wireUploader("video-upload-btn", "video-upload-input", "video-upload-status", "video", "media/videos", 10, async () => (await loadMedia()).videoCount);

  loadMedia();
})();
