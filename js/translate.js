// ============================================================
// AVORA — автоперевод RU → EN
//
// Использует бесплатный MyMemory Translation API (без ключей,
// без регистрации). Переводит ВСЕГДА при сохранении — если в
// поле EN уже что-то было, оно перезаписывается свежим
// переводом текущего RU-текста.
//
// MyMemory иногда возвращает HTTP 200 с текстом ошибки внутри
// (лимит запроса, лимит в день) вместо самого перевода — это
// проверяется отдельно, чтобы такой "перевод" не долетал сайту
// как настоящий английский текст.
// ============================================================

function avoraLooksUntranslated(original, translated) {
  if (!translated) return true;
  const t = translated.trim();
  if (!t) return true;
  // MyMemory иногда отвечает служебным текстом при превышении лимита.
  const errorPhrases = ["QUERY LENGTH LIMIT", "INVALID SOURCE LANGUAGE", "INVALID TARGET LANGUAGE", "IS AN INVALID"];
  if (errorPhrases.some((p) => t.toUpperCase().includes(p))) return true;
  // Если в "переводе" всё ещё остались кириллические буквы —
  // значит перевод не удался (кроме случаев, когда исходник
  // короткий и это, например, просто цифры/название на латинице).
  const hasCyrillic = /[а-яА-ЯёЁ]/.test(t);
  const originalHasCyrillic = /[а-яА-ЯёЁ]/.test(original);
  if (originalHasCyrillic && hasCyrillic && t === original.trim()) return true;
  return false;
}

function avoraSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function avoraTranslateChunk(text) {
  if (!text || !text.trim()) return { ok: true, text };
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ru|en`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (avoraLooksUntranslated(text, translated)) {
      return { ok: false, text };
    }
    return { ok: true, text: translated };
  } catch (e) {
    return { ok: false, text };
  }
}

// Разбивает длинный текст на куски по абзацам, не превышая
// ~450 символов на запрос (ограничение бесплатного API).
async function avoraTranslateRuToEn(text) {
  if (!text || !text.trim()) return { ok: true, text: "" };
  const lines = text.split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).length > 450) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);

  const translatedChunks = [];
  let allOk = true;
  for (const chunk of chunks) {
    const result = await avoraTranslateChunk(chunk);
    if (!result.ok) allOk = false;
    translatedChunks.push(result.text);
    await avoraSleep(250); // не долбим бесплатный API слишком часто
  }
  return { ok: allOk, text: translatedChunks.join("\n") };
}

/**
 * Переводит RU-поля в соответствующие EN-поля ВСЕГДА, когда в
 * RU что-то написано — перезаписывая то, что было в EN раньше.
 * pairs: [[ruFieldId, enFieldId], ...]
 * Возвращает true, если хотя бы одно поле не удалось перевести
 * (тогда там останется русский текст, чтобы сайт не остался
 * пустым — но статус покажет предупреждение).
 */
async function avoraAutoFillTranslations(pairs, statusEl) {
  let anyFailed = false;
  for (const [ruId, enId] of pairs) {
    const ruEl = document.getElementById(ruId);
    const enEl = document.getElementById(enId);
    if (!ruEl || !enEl) continue;
    if (!ruEl.value.trim()) continue;

    if (statusEl) statusEl.textContent = "Перевод на английский…";
    const result = await avoraTranslateRuToEn(ruEl.value);
    enEl.value = result.text;
    if (!result.ok) anyFailed = true;
  }
  if (statusEl) {
    statusEl.textContent = anyFailed
      ? "Часть текста не удалось перевести автоматически (лимит сервиса) — проверьте английские поля вручную."
      : "";
  }
  return anyFailed;
}

// Простая транслитерация RU → латиница для авто-генерации slug.
function avoraTransliterate(text) {
  const map = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  return text
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
