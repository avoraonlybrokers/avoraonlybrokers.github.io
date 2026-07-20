// ============================================================
// AVORA — виджет управления фото/видео.
// Можно вставить в любой контейнер: avoraRenderMediaManager(el, 'complex', id)
// ============================================================

function avoraRenderMediaManager(container, ownerType, ownerId) {
  container.innerHTML = `
    <div style="border:1px solid var(--line);border-radius:14px;padding:24px;margin-top:12px">
      <h3 style="font-size:16px;margin-bottom:4px">Дополнительные фотографии <span id="photo-count" class="meta"></span></h3>
      <p style="font-size:12px;color:rgba(247,247,245,0.45);margin-bottom:12px">Показываются в галерее на странице комплекса (не путать с главной обложкой выше — она задаётся отдельным полем). До 15 штук.</p>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <button type="button" id="photo-upload-btn" class="btn-outline-gold" style="width:auto;padding:10px 20px">Загрузить фото</button>
        <input type="file" id="photo-upload-input" accept="image/*" multiple class="hidden" />
        <span id="photo-upload-status" style="font-size:12px;color:rgba(247,247,245,0.5)"></span>
      </div>
      <div id="photo-grid" class="media-thumb-grid"></div>
    </div>

    <div style="border:1px solid var(--line);border-radius:14px;padding:24px;margin-top:16px">
      <h3 style="font-size:16px;margin-bottom:4px">Видео <span id="video-count" class="meta"></span></h3>
      <p style="font-size:12px;color:rgba(247,247,245,0.45);margin-bottom:12px">До 10 видео.</p>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <button type="button" id="video-upload-btn" class="btn-outline-gold" style="width:auto;padding:10px 20px">Загрузить видео</button>
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

    container.querySelector("#photo-count").textContent = `(${photos.length}/15)`;
    container.querySelector("#video-count").textContent = `(${videos.length}/10)`;

    container.querySelector("#photo-grid").innerHTML = photos
      .map(
        (m) =>
          `<div class="media-thumb"><img src="${m.url}" /><button data-delete="${m.id}"><i data-lucide="x" width="12" height="12"></i></button></div>`
      )
      .join("");
    container.querySelector("#video-grid").innerHTML = videos
      .map((m) => `<div class="media-thumb"><video src="${m.url}" muted></video><button data-delete="${m.id}"><i data-lucide="x" width="12" height="12"></i></button></div>`)
      .join("");
    avoraRenderIcons();

    container.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        await supabaseClient.from("media").delete().eq("id", btn.dataset.delete);
        loadMedia();
      })
    );

    return { photoCount: photos.length, videoCount: videos.length };
  }

  function wireUploader(buttonId, inputId, statusId, kind, folder, limit, getCurrentCount) {
    const button = container.querySelector(`#${buttonId}`);
    const input = container.querySelector(`#${inputId}`);
    const status = container.querySelector(`#${statusId}`);

    button.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      const currentCount = await getCurrentCount();
      if (currentCount + files.length > limit) {
        alert(`Максимум ${limit}. Сейчас загружено: ${currentCount}.`);
        input.value = "";
        return;
      }

      for (let i = 0; i < files.length; i++) {
        status.textContent = `Загрузка ${i + 1}/${files.length}…`;
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
          alert("Не удалось загрузить файл: " + err.message);
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
}
