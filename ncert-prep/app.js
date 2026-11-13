// NCERT Exam Prep in the browser: choose a chapter, download it from NCERT, hand the file to the
// page, and the AI (the user's own Claude API key or Gemini key) writes the material, which the
// browser prints or saves as a PDF. Nothing is sent anywhere except to the chosen AI.
import { DATA } from "./data.js";
import { CLAUDE_MODELS, Stopped, UsageLimit, claude, gemini, geminiModels } from "./ai.js";
import { documentHtml, esc } from "./render.js";

const $ = id => document.getElementById(id);
const opt = (sel, items) => { sel.innerHTML = items.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join(""); };

// ------------------------------------------------------------------ settings (this browser only)
const SAVED = "ncert-prep-settings", KEYS = "ncert-prep-keys";
const store = {
  get(k, area = localStorage) { try { return JSON.parse(area.getItem(k) || "{}"); } catch { return {}; } },
  set(k, v, area = localStorage) { try { area.setItem(k, JSON.stringify(v)); } catch { /* private mode: keep in memory */ } },
  drop(k, area = localStorage) { try { area.removeItem(k); } catch { /* ignore */ } },
};
let S = { engine: "claude", claudeModel: CLAUDE_MODELS[0].id, geminiModel: "", geminiOutputLimit: 0, split: 0,
          sections: DATA.defaultSections, remember: false, ...store.get(SAVED) };
let K = { claude: "", gemini: "", ...store.get(KEYS, S.remember ? localStorage : sessionStorage) };
const saveSettings = () => store.set(SAVED, S);
function saveKeys() {
  store.drop(KEYS, localStorage); store.drop(KEYS, sessionStorage);
  store.set(KEYS, K, S.remember ? localStorage : sessionStorage);
}

// ------------------------------------------------------------------ chapter picker
const C = DATA.catalog;
const clsLabel = c => c === "11-12" ? "Class 11–12 (combined)" : `Class ${c}`;
const book = () => (C[$("cls").value]?.[$("subject").value] || []).find(b => b[0] === $("book").value);
const chapterCode = () => { const b = book(), n = +$("chapter").value; return `${b[0]}${String(n).padStart(2, "0")}`; };
const chapterUrl = () => DATA.chapterUrl.replace("{code}", book()[0]).replace("{nn}", String(+$("chapter").value).padStart(2, "0"));
function fillClasses() { opt($("cls"), Object.keys(C).map(c => [c, clsLabel(c)])); $("cls").value = C["10"] ? "10" : Object.keys(C)[0]; fillSubjects(); }
function fillSubjects() { opt($("subject"), Object.keys(C[$("cls").value]).sort().map(s => [s, s])); if (C[$("cls").value].Science) $("subject").value = "Science"; fillBooks(); }
function fillBooks() { opt($("book"), C[$("cls").value][$("subject").value].map(b => [b[0], b[1]])); fillChapters(); }
function fillChapters() { const b = book(), chs = []; for (let i = b[2]; i <= b[3]; i++) chs.push([i, `Chapter ${i}`]); opt($("chapter"), chs); chapterChanged(); }
function chapterChanged() {
  $("dl").href = chapterUrl();
  $("dl").textContent = `Download chapter ${+$("chapter").value} from NCERT`;
  $("dlname").textContent = `${chapterCode()}.pdf`;
  $("wantname").textContent = `${chapterCode()}.pdf`;
  if (PDF) showFile();
}
$("cls").onchange = fillSubjects; $("subject").onchange = fillBooks; $("book").onchange = fillChapters; $("chapter").onchange = chapterChanged;

// ------------------------------------------------------------------ the chapter file
let PDF = null;   // { name, bytes: Uint8Array, pages }
async function useFile(file) {
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") { showFileMsg(`“${file.name}” is not a PDF file. Choose the chapter PDF you downloaded.`, true); return; }
  let pages = 0;
  try { pages = (await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount(); }
  catch { showFileMsg(`“${file.name}” could not be read as a PDF. Download it again from NCERT.`, true); return; }
  PDF = { name: file.name, bytes, pages };
  showFile();
}
function showFile() {
  const want = `${chapterCode()}.pdf`;
  const same = PDF.name.toLowerCase().replace(/\s*\(\d+\)(?=\.pdf$)/, "") === want;
  showFileMsg(`<b>${esc(PDF.name)}</b> · ${(PDF.bytes.length / 1e6).toFixed(1)} MB · ${PDF.pages} pages` +
    (same ? " ✓" : `<br>This is not the file NCERT names <b>${esc(want)}</b>. If it is the right chapter you can continue; otherwise choose ${esc(want)}.`), !same);
}
function showFileMsg(html, warn) { $("filebox").innerHTML = html; $("filebox").hidden = false; $("filebox").classList.toggle("warn", !!warn); }

$("choose").onclick = async () => {
  if (window.showOpenFilePicker) {        // Chrome / Edge on a computer: open straight in Downloads
    try {
      const [h] = await window.showOpenFilePicker({ startIn: "downloads", types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }] });
      return useFile(await h.getFile());
    } catch (e) { if (e.name === "AbortError") return; }
  }
  $("file").click();
};
$("file").onchange = () => useFile($("file").files[0]);
const box = $("getpdf");
box.addEventListener("dragover", e => { e.preventDefault(); box.classList.add("drop"); });
box.addEventListener("dragleave", () => box.classList.remove("drop"));
box.addEventListener("drop", e => { e.preventDefault(); box.classList.remove("drop"); useFile(e.dataTransfer.files[0]); });

// ------------------------------------------------------------------ sections
const SEC = () => [...document.querySelectorAll("input[name=sec]")];
const chosen = () => SEC().filter(b => b.checked).map(b => b.value);
function checkSections() {
  const c = chosen(), hasQ = c.some(v => DATA.questionSections.includes(v)), test = $("sec-test");
  test.disabled = !hasQ; if (!hasQ) test.checked = false;
  test.closest("label").classList.toggle("off", !hasQ);
  return chosen().some(v => v !== DATA.practiceTest);
}
SEC().forEach(b => { b.checked = S.sections.includes(b.value); b.onchange = () => { checkSections(); S.sections = chosen(); saveSettings(); }; });
checkSections();

// ------------------------------------------------------------------ AI card + settings
function aiCard() {
  const ready = S.engine === "claude" ? !!K.claude : !!(K.gemini && S.geminiModel);
  const model = S.engine === "claude" ? (CLAUDE_MODELS.find(m => m.id === S.claudeModel)?.name || S.claudeModel) : (S.geminiModel || "no model yet");
  $("ainame").textContent = S.engine === "claude" ? "Claude API" : "Google Gemini";
  $("aidot").className = "dot " + (ready ? "ok" : "warn");
  $("aidetail").textContent = ready ? `Model: ${model}. Your key is saved in this browser only${S.remember ? "" : " (until you close this tab)"}.`
    : `Add your ${S.engine === "claude" ? "Anthropic API key" : "Gemini API key"} in Settings to start.`;
  $("aisetup").textContent = ready ? "Change AI" : "Set up the AI";
  $("eng-claude").checked = S.engine === "claude"; $("eng-gem").checked = S.engine === "gemini";
  $("opt-claude").classList.toggle("sel", S.engine === "claude"); $("opt-gem").classList.toggle("sel", S.engine === "gemini");
  $("claude-state").textContent = K.claude ? `A key is saved (…${K.claude.slice(-4)}).` : "No key saved yet.";
  $("gem-state").textContent = K.gemini ? `A key is saved (…${K.gemini.slice(-4)}).${S.geminiModel ? ` Model: ${S.geminiModel}.` : ""}` : "No key saved yet.";
  $("remember").checked = !!S.remember; $("split").value = String(S.split || 0);
}
opt($("claudemodel"), CLAUDE_MODELS.map(m => [m.id, m.name]));
$("claudemodel").value = S.claudeModel;
const priceNote = () => { $("claudeprice").textContent = `Price (Anthropic list price, Nov 2026): ${CLAUDE_MODELS.find(m => m.id === $("claudemodel").value).price}.`; };
priceNote();
$("claudemodel").onchange = () => { S.claudeModel = $("claudemodel").value; saveSettings(); priceNote(); aiCard(); };
const say = (m, bad) => { $("smsg").textContent = m; $("smsg").className = "msg " + (bad ? "bad" : "ok"); };
const openPanel = () => { $("shade").hidden = false; aiCard(); $("close").focus(); };
const closePanel = () => { $("shade").hidden = true; $("btnsettings").focus(); };
$("btnsettings").onclick = openPanel; $("aisetup").onclick = openPanel; $("close").onclick = closePanel;
$("shade").onclick = e => { if (e.target === $("shade")) closePanel(); };
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("shade").hidden) closePanel(); });
document.querySelectorAll("input[name=engine]").forEach(r => r.onchange = () => { S.engine = r.value; saveSettings(); aiCard(); });
$("saveclaude").onclick = () => {
  const k = $("claudekey").value.trim();
  if (k && !k.startsWith("sk-ant-")) return say("That doesn't look like an Anthropic API key (it should start with sk-ant-).", true);
  K.claude = k; S.engine = "claude"; saveKeys(); saveSettings(); $("claudekey").value = ""; say(k ? "Claude API key saved." : "Claude API key removed."); aiCard();
};
function showGemModels(models) {
  opt($("gemmodel"), models.map(m => [m.id, m.name === m.id ? m.id : `${m.name} (${m.id})`]));
  $("gemmodel").value = S.geminiModel; $("gem-model-row").hidden = !models.length;
  $("gemmodel").onchange = () => { const m = models.find(x => x.id === $("gemmodel").value); S.geminiModel = m.id; S.geminiOutputLimit = m.outputLimit; saveSettings(); aiCard(); };
}
$("savegem").onclick = async () => {
  const k = $("gemkey").value.trim();
  if (!k) { K.gemini = ""; S.geminiModel = ""; saveKeys(); saveSettings(); say("Gemini key removed."); return aiCard(); }
  $("savegem").disabled = true; say("Checking the key with Google…");
  try {
    const models = await geminiModels(k);
    if (!models.length) throw new Error("This key works but Google lists no Gemini text models for it.");
    K.gemini = k; S.engine = "gemini"; S.geminiModel = models[0].id; S.geminiOutputLimit = models[0].outputLimit;
    saveKeys(); saveSettings(); showGemModels(models); $("gemkey").value = ""; say(`Gemini key saved. Model: ${S.geminiModel}.`);
  } catch (e) { say(e.message, true); }
  $("savegem").disabled = false; aiCard();
};
$("remember").onchange = () => { S.remember = $("remember").checked; saveSettings(); saveKeys(); aiCard(); };
$("forget").onclick = () => { K = { claude: "", gemini: "" }; store.drop(KEYS, localStorage); store.drop(KEYS, sessionStorage); say("Saved keys forgotten."); aiCard(); };
$("split").onchange = () => { S.split = +$("split").value; saveSettings(); };
if (K.gemini) geminiModels(K.gemini).then(showGemModels).catch(() => {});

// ------------------------------------------------------------------ console
const lines = [];
let live = "";
function show() {
  const c = $("console");
  c.innerHTML = lines.map(l => `<div class="${/  Error: /.test(l) ? "err" : /  (Done\.|Claude finished|Gemini finished)/.test(l) ? "ok" : /  (AI: |The AI writes|The page does without AI)/.test(l) ? "ai" : ""}">${esc(l)}</div>`).join("")
    + (live ? `<div class="live">… ${esc(live)}</div>` : "");
  c.scrollTop = c.scrollHeight;
}
const log = m => { lines.push(`${new Date().toLocaleTimeString("en-GB")}  ${m}`); live = ""; show(); };
const progress = m => { live = m; show(); };

// ------------------------------------------------------------------ prepare
const b64 = bytes => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
async function cut(bytes, from, to) {        // pages from..to (1-based) as a new PDF
  const src = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFLib.PDFDocument.create();
  const pages = await out.copyPages(src, Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i));
  pages.forEach(p => out.addPage(p));
  return await out.save();
}
function merge(parts, keys) {
  const merged = { chapter_title: parts[0].chapter_title };
  for (const k of keys) {
    const seen = new Set(), items = [];
    for (const p of parts) for (const it of p[k] || []) { const sig = JSON.stringify(it).toLowerCase(); if (!seen.has(sig)) { seen.add(sig); items.push(it); } }
    merged[k] = items;
  }
  return merged;
}
const fmt = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

let running = null;
$("stop").onclick = () => { running?.abort(); $("stop").disabled = true; };
function finish(msg, ok) {
  running = null; live = ""; show();
  $("state").innerHTML = ok ? esc(msg) : `<span class="error">${esc(msg)}</span>`;
  $("go").disabled = false; $("stop").hidden = true;
}

$("f").onsubmit = async e => {
  e.preventDefault();
  const fail = m => { $("status").hidden = false; $("state").innerHTML = `<span class="error">${esc(m)}</span>`; $("status").scrollIntoView({ block: "center" }); };
  if (S.engine === "claude" && !K.claude) return (openPanel(), say("Add your Anthropic API key first.", true));
  if (S.engine === "gemini" && !(K.gemini && S.geminiModel)) return (openPanel(), say("Add your Gemini key first.", true));
  if (!PDF) return fail("First download the chapter from NCERT, then press “Next: use the downloaded file” and choose it.");
  if (!checkSections()) return fail("Tick at least one section.");
  const total = PDF.pages, pf = +$("pf").value || 1, pt = +$("pt").value || total;
  if (pf < 1 || pt > total || pf > pt) return fail(`Pages must be between 1 and ${total}, and “From” not after “To”.`);

  const options = chosen(), keys = DATA.order.filter(k => options.includes(k));
  const b = book(), number = +$("chapter").value, cls = $("cls").value, subject = $("subject").value;
  const schema = { type: "object", additionalProperties: false, required: ["chapter_title", ...keys],
                   properties: { chapter_title: { type: "string", description: "Official chapter title as printed in the book" },
                                 ...Object.fromEntries(keys.map(k => [k, DATA.sections[k].schema])) } };
  const items = keys.map((k, i) => `${i + 1}. ${DATA.sections[k].prompt}`).join("\n");
  const outro = keys.some(k => DATA.questionSections.includes(k)) ? DATA.outro : "";

  lines.length = 0; live = ""; $("status").hidden = false; $("actions").innerHTML = ""; $("doc").hidden = true;
  $("go").disabled = true; $("stop").hidden = false; $("stop").disabled = false;
  const t0 = Date.now();
  const ticker = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $("state").innerHTML = `<span class="spinner"></span>Working… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }, 1000);
  running = new AbortController();
  const signal = running.signal;
  const aiName = S.engine === "claude" ? `Claude API, model ${S.claudeModel}` : `Google Gemini, model ${S.geminiModel}`;
  log(`AI: ${aiName} (your own key, from this browser).`);
  log(`The AI writes: ${keys.map(k => k === "diagrams" ? "diagram outlines" : DATA.sections[k].label.toLowerCase()).join(", ")}.`);
  log(`The page does without AI: cutting pages${S.split ? " and splitting the chapter" : ""}, drawing diagrams${options.includes(DATA.practiceTest) ? ", building the practice test" : ""}, laying out the document.`);
  try {
    let bytes = PDF.bytes;
    if (pf !== 1 || pt !== total) { log(`Keeping pages ${pf}–${pt} of ${total}.`); bytes = await cut(PDF.bytes, pf, pt); }
    const size = pt - pf + 1, step = S.split && size > S.split ? S.split : size;
    const pieces = [];
    for (let a = 0; a < size; a += step) pieces.push([a + 1, Math.min(size, a + step)]);
    const results = [];
    for (const [i, [a, z]] of pieces.entries()) {
      if (signal.aborted) throw new Stopped("Stopped.");
      const part = pieces.length > 1 ? await cut(bytes, a, z) : bytes;
      const first = pf + a - 1, last = pf + z - 1;
      const note = first !== 1 || last !== total ? `, pages ${first}–${last} of ${total}` : "";
      log(`Writing the material for chapter ${number}${pieces.length > 1 ? ` (part ${i + 1} of ${pieces.length})` : ""}${note} …`);
      const prompt = fmt(DATA.intro, { cls, subject, book: b[1], chapter: number, pages_note: note }) + items + outro;
      const args = { pdfBase64: b64(part), prompt, system: DATA.system, schema, log, progress, signal, title: `${b[1]} - Chapter ${number}` };
      const res = S.engine === "claude"
        ? await claude({ ...args, apiKey: K.claude, model: S.claudeModel })
        : await gemini({ ...args, apiKey: K.gemini, model: S.geminiModel, outputLimit: S.geminiOutputLimit });
      for (const k of keys) res.data[k] ??= [];
      log(`Chapter ${number}${note}: ${keys.map(k => `${res.data[k].length} ${DATA.countWords[k]}`).join(", ")} (${res.usage}).`);
      results.push(res.data);
    }
    const data = results.length > 1 ? merge(results, keys) : results[0];
    data.chapter_title ||= `Chapter ${number}`;
    Object.assign(data, { number, url: chapterUrl(), page_note: pf !== 1 || pt !== total ? `Pages ${pf}–${pt} of the chapter PDF` : "" });
    log("Laying out the document …");
    $("doc").innerHTML = documentHtml({ cls: clsLabel(cls).replace(/^Class /, ""), subject, book: b[1], ai: aiName }, [data], options);
    $("doc").hidden = false;
    log("Done. Press “Print / Save as PDF” (on a phone: Share → Print → Save as PDF).");
    clearInterval(ticker);
    finish(`Ready in ${Math.max(1, Math.round((Date.now() - t0) / 60000))} min.`, true);
    $("actions").innerHTML = '<button type="button" class="primary" id="print">Print / Save as PDF</button><button type="button" id="view">View the document</button>';
    $("print").onclick = () => window.print();
    $("view").onclick = () => $("doc").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    clearInterval(ticker);
    if (err instanceof Stopped) { log("Stopped."); finish("Stopped.", false); return; }
    const msg = err instanceof UsageLimit ? `Usage limit reached: ${err.message} Try again later, or choose another model in Settings.` : err.message;
    log(`Error: ${msg}`);
    finish(msg, false);
  }
};

fillClasses();
aiCard();
if (!(S.engine === "claude" ? K.claude : K.gemini)) setTimeout(openPanel, 400);
