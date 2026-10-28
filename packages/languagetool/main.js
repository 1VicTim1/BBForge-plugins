// LanguageTool (https://languagetool.org): grammar, punctuation and style of the text between tags.
// BBForge calls check() with new paragraphs; settings live in the plugin's storage.
const PUBLIC = "https://api.languagetool.org/v2/check";
const PREMIUM = "https://api.languagetoolplus.com/v2/check";
// The free server takes at most 20 KB per request and 20 requests a minute.
const MAX_CHUNK = 6000, PER_MINUTE = 20;

const settings = async (bb) => ({ server: "", language: "auto", premium: null, spelling: true, picky: false, ...(await bb.storage.get("settings")) });
// New settings: earlier answers no longer hold, BBForge checks again.
const save = async (bb, value) => { await bb.storage.set("settings", value); await show(bb, value); await bb.checks.refresh(); };
const show = (bb, value) => Promise.all([
  bb.commands.update("bbforge.languagetool.spelling", { title: `LanguageTool: опечатки — ${value.spelling ? "показывать" : "не показывать"}` }),
  bb.commands.update("bbforge.languagetool.picky", { title: `LanguageTool: строгая проверка — ${value.picky ? "вкл" : "выкл"}` }),
]);
exports.activate = async (bb) => show(bb, await settings(bb));

/** Endpoint: the user's own server, Premium, or the free one. */
const endpoint = (value) => value.server ? value.server.replace(/\/+$/, "").replace(/(\/v2\/check)?$/, "/v2/check") : value.premium ? PREMIUM : PUBLIC;

// Requests of the last minute, to stay within the free server's limit.
const sent = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function pace(value) {
  if (value.server || value.premium) return;
  for (;;) {
    const now = Date.now();
    while (sent.length && now - sent[0] > 60_000) sent.shift();
    if (sent.length < PER_MINUTE) { sent.push(now); return; }
    await sleep(60_000 - (now - sent[0]) + 50);
  }
}

const KIND = { misspelling: "spelling", style: "style", register: "style", "locale-violation": "style", inconsistency: "style" };

async function request(bb, value, text) {
  await pace(value);
  const form = { text, language: value.language || "auto" };
  if (form.language === "auto") form.preferredVariants = "en-US,de-DE,pt-BR,ca-ES";
  if (value.picky) form.level = "picky";
  if (value.premium && !value.server) { form.username = value.premium.username; form.apiKey = value.premium.apiKey; }
  const response = await bb.http.post(endpoint(value), { form });
  if (response.status === 429) throw new Error("сервер LanguageTool просит подождать (лимит запросов)");
  if (response.status === 413) throw new Error("слишком большой текст для сервера LanguageTool");
  if (response.status !== 200) throw new Error(`сервер LanguageTool ответил ${response.status}: ${response.text.slice(0, 200)}`);
  let data;
  try { data = JSON.parse(response.text); } catch { throw new Error("сервер ответил не JSON — это точно LanguageTool?"); }
  return (data.matches || []).flatMap((match) => {
    const type = match.rule && match.rule.issueType;
    // Spaces around tags are not the author's: whitespace remarks would be noise.
    if (type === "whitespace") return [];
    const kind = KIND[type] || "grammar";
    if (kind === "spelling" && !value.spelling) return [];
    return [{
      offset: match.offset, length: match.length, kind,
      message: match.message || match.shortMessage || (match.rule && match.rule.description) || "",
      replacements: (match.replacements || []).slice(0, 6).map((item) => item.value),
    }];
  });
}

/** Paragraphs come joined with blank lines; long texts go in parts cut at those lines. */
exports.check = async (bb, { text }) => {
  const value = await settings(bb);
  if (value.server && !(await bb.network.allowed(value.server))) throw new Error(`нет разрешения на ${value.server}: выберите сервер заново («LanguageTool: сервер…»)`);
  const matches = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(text.length, start + MAX_CHUNK);
    if (end < text.length) { const cut = text.lastIndexOf("\n\n", end); if (cut > start) end = cut + 2; }
    for (const match of await request(bb, value, text.slice(start, end))) matches.push({ ...match, offset: match.offset + start });
    start = end;
  }
  return matches;
};

exports.chooseServer = async (bb) => {
  const value = await settings(bb);
  const answer = await bb.ui.prompt({
    title: "Сервер LanguageTool", label: "Адрес сервера", value: value.server, placeholder: "пусто — бесплатный сервер languagetool.org",
    hint: "Свой сервер: например http://localhost:8081 (docker run -p 8081:8010 erikvl87/languagetool). Пустое поле — бесплатный сервер languagetool.org (или Premium, если задан ключ).",
  });
  if (answer === null) return;
  const server = answer.trim();
  if (server && !(await bb.network.allow(server, "Сервер LanguageTool: туда будут отправляться абзацы проверяемого текста."))) return;
  await save(bb, { ...value, server });
  bb.ui.notify(server ? `сервер: ${server}` : "бесплатный сервер languagetool.org");
};

exports.chooseLanguage = async (bb) => {
  const value = await settings(bb);
  const answer = await bb.ui.prompt({ title: "Язык проверки", label: "Код языка", value: value.language, hint: "auto — определять по тексту; или код: ru-RU, en-US, en-GB, uk-UA, de-DE…" });
  if (answer === null) return;
  const language = answer.trim() || "auto";
  if (!/^(auto|[a-z]{2,3}(-[A-Za-z0-9]{2,8})*)$/.test(language)) throw new Error(`неверный код языка: ${language}`);
  await save(bb, { ...value, language });
};

exports.choosePremium = async (bb) => {
  const value = await settings(bb);
  const username = await bb.ui.prompt({ title: "LanguageTool Premium", label: "Имя пользователя (e-mail)", value: value.premium ? value.premium.username : "", hint: "Пустое поле — забыть ключ и пользоваться бесплатным сервером." });
  if (username === null) return;
  if (!username.trim()) { await save(bb, { ...value, premium: null }); bb.ui.notify("ключ Premium забыт"); return; }
  const apiKey = await bb.ui.prompt({ title: "LanguageTool Premium", label: "API-ключ", hint: "Ключ из настроек аккаунта languagetool.org (раздел «Access tokens»)." });
  if (!apiKey) return;
  await save(bb, { ...value, premium: { username: username.trim(), apiKey: apiKey.trim() } });
  bb.ui.notify("ключ Premium сохранён");
};

exports.toggleSpelling = async (bb) => { const value = await settings(bb); await save(bb, { ...value, spelling: !value.spelling }); };
exports.togglePicky = async (bb) => { const value = await settings(bb); await save(bb, { ...value, picky: !value.picky }); };
