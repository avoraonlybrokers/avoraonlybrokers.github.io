// ============================================================
// AVORA — автоперевод RU → EN
//
// Использует бесплатный MyMemory Translation API (без ключей,
// без регистрации). У него есть дневной лимит символов на IP
// (обычно достаточно для сайта такого размера), и лимит длины
// одного запроса — поэтому длинный текст режется на куски по
// абзацам и переводится по частям.
//
// Если перевод не удался (лимит, сеть) — просто возвращается
// исходный русский текст, ничего не ломается: EN-версия в
// таком случае будет временно совпадать с RU, и её всегда
// можно поправить вручную в admin-панели.
// ============================================================

async function avoraTranslateChunk(text) {
  if (!text || !text.trim()) return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ru|en`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated || data?.responseStatus !== 200) return text;
    return translated;
  } catch (e) {
    return text;
  }
}

// Разбивает длинный текст на куски по абзацам, не превышая
// ~450 символов на запрос (ограничение бесплатного API).
async function avoraTranslateRuToEn(text) {
  if (!text || !text.trim()) return "";
  const paragraphs = text.split("\n");
  const chunks = [];
  let current = "";

  for (const line of paragraphs) {
    if ((current + "\n" + line).length > 450) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);

  const translatedChunks = [];
  for (const chunk of chunks) {
    translatedChunks.push(await avoraTranslateChunk(chunk));
  }
  return translatedChunks.join("\n");
}

/**
 * Заполняет пустые EN-поля автопереводом соответствующих RU-полей.
 * pairs: [[ruFieldId, enFieldId], ...]
 * Если EN-поле уже что-то содержит — трогать не будет (админ мог
 * поправить перевод вручную, это никогда не перезаписывается).
 */
async function avoraAutoFillTranslations(pairs, statusEl) {
  for (const [ruId, enId] of pairs) {
    const ruEl = document.getElementById(ruId);
    const enEl = document.getElementById(enId);
    if (!ruEl || !enEl) continue;
    if (ruEl.value.trim() && !enEl.value.trim()) {
      if (statusEl) statusEl.textContent = "Перевод на английский…";
      enEl.value = await avoraTranslateRuToEn(ruEl.value);
    }
  }
  if (statusEl) statusEl.textContent = "";
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
