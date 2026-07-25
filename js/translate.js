// ============================================================
// AVORA — автоперевод RU → EN
//
// Основной движок — бесплатный публичный endpoint Google
// Translate (без ключей и регистрации, у него нет маленького
// дневного лимита в 5000 символов, как у MyMemory). Если он
// вдруг недоступен — используется MyMemory как запасной
// вариант. Любой результат проверяется: если это на самом деле
// не перевод (сервисное сообщение, лимит, ошибка) — на сайт
// такой текст не попадает, вместо него остаётся русский текст,
// чтобы страница никогда не показала посетителю мусор.
// ============================================================

function avoraLooksUntranslated(original, translated) {
  if (!translated) return true;
  const t = translated.trim();
  if (!t) return true;

  // Служебные сообщения об ошибках/лимитах от разных переводчиков —
  // если хоть что-то из этого встретилось, перевод не засчитывается.
  const errorPhrases = [
    "QUERY LENGTH LIMIT",
    "INVALID SOURCE LANGUAGE",
    "INVALID TARGET LANGUAGE",
    "IS AN INVALID",
    "MYMEMORY WARNING",
    "USED ALL AVAILABLE",
    "USAGELIMITS",
    "TRANSLATE MORE",
    "NEXT AVAILABLE IN",
  ];
  if (errorPhrases.some((p) => t.toUpperCase().includes(p))) return true;

  // Если "перевод" стал заметно длиннее исходника — почти
  // наверняка это служебное сообщение, а не текст.
  if (t.length > original.length * 3 + 60) return true;

  // Если в переводе всё ещё остались кириллические буквы и он
  // совпадает с исходником — перевод не произошёл вообще.
  const hasCyrillic = /[а-яА-ЯёЁ]/.test(t);
  const originalHasCyrillic = /[а-яА-ЯёЁ]/.test(original);
  if (originalHasCyrillic && hasCyrillic && t === original.trim()) return true;

  return false;
}

function avoraSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function avoraTranslateViaGoogle(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("google translate http " + res.status);
  const data = await res.json();
  const translated = (data?.[0] || []).map((seg) => seg[0]).join("");
  if (!translated) throw new Error("empty google response");
  return translated;
}

async function avoraTranslateViaMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ru|en`;
  const res = await fetch(url);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (!translated) throw new Error("empty mymemory response");
  return translated;
}

async function avoraTranslateChunk(text) {
  if (!text || !text.trim()) return { ok: true, text };

  // Пробуем Google, при неудаче — MyMemory как запасной вариант.
  for (const translator of [avoraTranslateViaGoogle, avoraTranslateViaMyMemory]) {
    try {
      const translated = await translator(text);
      if (!avoraLooksUntranslated(text, translated)) {
        return { ok: true, text: translated };
      }
    } catch (e) {
      // пробуем следующий движок
    }
  }
  return { ok: false, text };
}

// Разбивает длинный текст на куски по абзацам, чтобы не
// превышать разумную длину одного запроса.
async function avoraTranslateRuToEn(text) {
  if (!text || !text.trim()) return { ok: true, text: "" };
  const lines = text.split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).length > 1500) {
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
    await avoraSleep(150);
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
    if (result.ok) {
      enEl.value = result.text;
    } else {
      // Не перезаписываем поле мусором — оставляем как было,
      // а если там ничего не было, подставляем русский текст,
      // чтобы страница не осталась пустой.
      if (!enEl.value.trim()) enEl.value = ruEl.value;
      anyFailed = true;
    }
  }
  if (statusEl) {
    statusEl.textContent = anyFailed
      ? "Часть текста не удалось перевести автоматически — проверьте английские поля вручную или сохраните ещё раз позже."
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
