// Проверка кода в [code]: JSON, XML/HTML и JavaScript. Язык — из [code=json] или по виду текста;
// незнакомый код не проверяется (лучше промолчать, чем ругать Kotlin за то, что он не JavaScript).

const LANGUAGES = { json: "json", jsonc: "json", xml: "xml", svg: "xml", xaml: "xml", html: "html", htm: "html", js: "javascript", javascript: "javascript", mjs: "javascript", cjs: "javascript", node: "javascript" };

function detect(code) {
  const text = code.trim();
  if (!text) return null;
  // An object starting with a quoted key, or an array of values: JSON (closed or not).
  if (/^\{\s*("|\})/.test(text) || (/^\[\s*("|\{|\[|-?\d|true\b|false\b|null\b|\])/.test(text) && !/^\[\w+\]\s*$/m.test(text))) return "json";
  if (/^<\?xml\b/i.test(text)) return "xml";
  if (/^<!doctype html|^<html[\s>]/i.test(text)) return "html";
  if (/^<[A-Za-z][\w.:-]*[\s>/]/.test(text) && />$/.test(text)) return /<(manifest|resources|LinearLayout|RelativeLayout|androidx?\.|layout|selector|vector|PreferenceScreen)\b/.test(text) || /xmlns(:\w+)?=/.test(text) ? "xml" : "html";
  // JavaScript only when it is unmistakable.
  if (/\b(console\.(log|error|warn)|document\.(getElementById|querySelector)|addEventListener\(|module\.exports|require\(['"]|export default|=>\s*[{(])/.test(text) && !/^\s*(#include|package |import java|using System|fun |def |public class)/m.test(text)) return "javascript";
  return null;
}

// ---- JSON ----
function checkJson(code) {
  let at = 0;
  const problems = [];
  const fail = (message, offset = at, length = 1) => { throw { offset: Math.min(offset, code.length ? code.length - 1 : 0), length: code.length ? length : 0, message }; };
  const space = () => {
    for (;;) {
      while (at < code.length && /\s/.test(code[at])) at++;
      if (code.startsWith("//", at) || code.startsWith("/*", at)) {
        const end = code.startsWith("//", at) ? (code.indexOf("\n", at) + 1 || code.length) : code.indexOf("*/", at + 2) + 2;
        if (end < 2) fail("Незакрытый комментарий");
        problems.push({ offset: at, length: Math.max(2, Math.min(end, code.length) - at), message: "Комментарии в JSON не допускаются (только в JSONC)", severity: "warning" });
        at = end;
      } else return;
    }
  };
  const string = () => {
    const start = at++;
    while (at < code.length && code[at] !== '"') {
      if (code[at] === "\n") fail("Строка не закрыта до конца строки", start, at - start);
      if (code[at] === "\\") { at++; if (!/["\\/bfnrtu]/.test(code[at] || "")) fail(`Неверная escape-последовательность \\${code[at] || ""}`, at - 1, 2); if (code[at] === "u" && !/^[0-9a-fA-F]{4}$/.test(code.slice(at + 1, at + 5))) fail("После \\u нужны 4 шестнадцатеричные цифры", at - 1, 6); }
      at++;
    }
    if (at >= code.length) fail("Строка не закрыта", start, 1);
    at++;
  };
  const value = () => {
    space();
    const c = code[at];
    if (c === "{") {
      at++; space();
      if (code[at] === "}") { at++; return; }
      for (;;) {
        space();
        if (code[at] === "}") fail("Лишняя запятая перед }", code.lastIndexOf(",", at), 1);
        if (code[at] === "'") fail("Ключ в одинарных кавычках: в JSON нужны двойные");
        if (code[at] !== '"') fail(at >= code.length ? "Объект не закрыт: нет }" : "Ожидался ключ в двойных кавычках");
        string(); space();
        if (code[at] !== ":") fail("Ожидалось двоеточие после ключа");
        at++; value(); space();
        if (code[at] === ",") { at++; continue; }
        if (code[at] === "}") { at++; return; }
        fail(at >= code.length ? "Объект не закрыт: нет }" : "Ожидалась запятая или }");
      }
    }
    if (c === "[") {
      at++; space();
      if (code[at] === "]") { at++; return; }
      for (;;) {
        space();
        if (code[at] === "]") fail("Лишняя запятая перед ]", code.lastIndexOf(",", at), 1);
        value(); space();
        if (code[at] === ",") { at++; continue; }
        if (code[at] === "]") { at++; return; }
        fail(at >= code.length ? "Массив не закрыт: нет ]" : "Ожидалась запятая или ]");
      }
    }
    if (c === '"') return string();
    if (c === "'") fail("Строка в одинарных кавычках: в JSON нужны двойные");
    const literal = /^(true|false|null|-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?)/.exec(code.slice(at));
    if (literal) { at += literal[0].length; return; }
    fail(at >= code.length ? "Неожиданный конец JSON" : `Неожиданный символ «${c}»`);
  };
  try {
    value(); space();
    if (at < code.length) fail("Лишний текст после JSON", at, Math.min(20, code.length - at));
  } catch (error) {
    if (error && typeof error.offset === "number") problems.push({ ...error, severity: "error" });
    else throw error;
  }
  return problems;
}

// ---- XML / HTML ----
const VOID = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
const OPTIONAL_END = new Set("p li dt dd option optgroup tr td th thead tbody tfoot colgroup rt rp".split(" "));
function checkMarkup(code, html) {
  const problems = [], stack = [];
  const problem = (offset, length, message, severity = "error") => problems.push({ offset, length: Math.max(1, length), message, severity });
  let at = 0;
  while (at < code.length) {
    const open = code.indexOf("<", at);
    if (open < 0) break;
    if (!html) {
      const text = code.slice(at, open), amp = text.search(/&(?![a-zA-Z][\w.-]*;|#\d+;|#x[0-9a-fA-F]+;)/);
      if (amp >= 0) problem(at + amp, 1, "Символ & нужно записать как &amp;", "warning");
    }
    const skip = (start, end, what) => { const close = code.indexOf(end, open + start.length); if (close < 0) { problem(open, start.length, `${what} не закрыт`); return code.length; } return close + end.length; };
    if (code.startsWith("<!--", open)) { at = skip("<!--", "-->", "Комментарий"); continue; }
    if (code.startsWith("<![CDATA[", open)) { at = skip("<![CDATA[", "]]>", "Блок CDATA"); continue; }
    if (code.startsWith("<?", open)) { at = skip("<?", "?>", "Инструкция <?…?>"); continue; }
    if (code.startsWith("<!", open)) { at = skip("<!", ">", "Объявление <!…>"); continue; }
    const tag = /^<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^\s=/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/.exec(code.slice(open));
    if (!tag) {
      if (html && !/^<[A-Za-z/!?]/.test(code.slice(open))) { at = open + 1; continue; }
      const end = code.indexOf(">", open);
      problem(open, (end < 0 ? Math.min(code.length, open + 20) : end + 1) - open, end < 0 ? "Тег не закрыт: нет >" : "Неверный тег (атрибут без кавычек или лишний символ?)");
      at = end < 0 ? code.length : end + 1;
      continue;
    }
    const [whole, closing, rawName, attributes, selfClosing] = tag, name = html ? rawName.toLowerCase() : rawName;
    if (!html) {
      const unquoted = /\s([^\s=/>"']+)\s*=\s*([^\s"'>]+)/.exec(attributes);
      if (unquoted) problem(open, whole.length, `Значение атрибута ${unquoted[1]} без кавычек`);
      const names = [...attributes.matchAll(/\s([^\s=/>"']+)/g)].map((item) => item[1]);
      const repeated = names.find((item, index) => names.indexOf(item) !== index);
      if (repeated) problem(open, whole.length, `Атрибут ${repeated} повторяется`);
    }
    if (closing) {
      const index = stack.map((item) => item.name).lastIndexOf(name);
      if (index < 0) { if (!(html && VOID.has(name))) problem(open, whole.length, `Закрывающий </${rawName}> без открывающего`); }
      else {
        for (const item of stack.slice(index + 1)) if (!(html && OPTIONAL_END.has(item.name))) problem(item.offset, item.length, `<${item.raw}> не закрыт до </${rawName}>`);
        stack.length = index;
      }
    } else if (!selfClosing && !(html && VOID.has(name))) {
      stack.push({ name, raw: rawName, offset: open, length: whole.length });
      // Script and style contents are not markup.
      if (html && (name === "script" || name === "style")) {
        const end = code.toLowerCase().indexOf(`</${name}`, open + whole.length);
        at = end < 0 ? code.length : end;
        continue;
      }
    }
    at = open + whole.length;
  }
  for (const item of stack) if (!(html && OPTIONAL_END.has(item.name))) problem(item.offset, item.length, `<${item.raw}> не закрыт`);
  return problems.slice(0, 50);
}

// ---- JavaScript ----
function checkJavaScript(code) {
  for (const sourceType of ["module", "script"]) {
    try { acorn.parse(code, { ecmaVersion: "latest", sourceType, allowHashBang: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); return []; }
    catch (error) {
      if (sourceType === "module") continue;
      const message = String(error.message || error).replace(/\s*\(\d+:\d+\)$/, "");
      return [{ offset: Math.min(error.pos ?? 0, Math.max(0, code.length - 1)), length: 1, message: `Синтаксическая ошибка: ${message}`, severity: "error" }];
    }
  }
  return [];
}

exports.check = async (bb, { code, language }) => {
  const kind = (language && LANGUAGES[language.toLowerCase()]) || (language ? null : detect(code));
  if (kind === "json") return checkJson(code);
  if (kind === "xml") return checkMarkup(code, false);
  if (kind === "html") return checkMarkup(code, true);
  if (kind === "javascript") return checkJavaScript(code);
  return [];
};
exports._detect = detect;
