// Checks the no-install claude.ai page pro/index.html in Chromium, offline: a fake claude.ai "sample" capability stands in
// for Claude and a fake pdf.js for the PDF reader. Choosing, the file step, Prepare, the document, the practice test,
// the retry when an answer is cut off, and the usage-limit message.   node ncert_prep/tests/test_pro_page.mjs
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const PRO = path.join(here, "..", "pro");
const url = "http://pro.test/index.html";   // served from pro/ by page.route below, so vendor/pdf.js can be swapped for the fake
const SAMPLE = { ...JSON.parse(readFileSync(path.join(here, "..", "samples", "class10_science_ch1.json"))),
                 ...JSON.parse(readFileSync(path.join(here, "sample_extras.json"))) };
const assert = (ok, msg) => { if (!ok) { console.error("FAILED:", msg); process.exitCode = 1; throw new Error(msg); } };

const FAKE_PDFJS = `export const GlobalWorkerOptions = {};
export function getDocument() { return { promise: Promise.resolve({ numPages: 3, getPage: async n => ({ getTextContent: async () =>
  ({ items: [{ str: "Magnesium ribbon burns in air with a dazzling white flame and forms magnesium oxide. Page " + n + " of the sample chapter. ".repeat(4), hasEOL: true }] }) }) }) }; }`;

const FAKE_WORKER = "export const WorkerMessageHandler = {};";
async function serve(page, { fakePdf }) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.route(/^http:\/\/pro\.test\//, r => {
    const p = new URL(r.request().url()).pathname;
    if (fakePdf && p.endsWith("/pdf.min.mjs")) return r.fulfill({ body: FAKE_PDFJS, contentType: "text/javascript" });
    if (fakePdf && p.endsWith("/pdf.worker.min.mjs")) return r.fulfill({ body: FAKE_WORKER, contentType: "text/javascript" });
    try { return r.fulfill({ body: readFileSync(path.join(PRO, p)), contentType: p.endsWith(".html") ? "text/html" : "text/javascript" }); }
    catch { return r.fulfill({ status: 404, body: "" }); }
  });
}

// The fake Claude answers each section from the sample material. window.FAIL = ["invalid_json", ...] makes the next calls fail in turn.
const fakeClaude = sample => {
  window.PROMPTS = []; window.FAIL = [];
  const fake = { limits: async () => ({ maxPromptBytes: 500000 }),
    json: async (prompt, o) => {
      window.PROMPTS.push(prompt);
      const code = window.FAIL.shift();
      if (code) throw Object.assign(new Error(code), { code });
      const k = prompt.match(/"required":\["chapter_title","(\w+)"\]/)[1];
      o.onText({ text: "{}" });
      return { chapter_title: "Chemical Reactions and Equations", [k]: sample[k] || [] };
    } };
  window.claude = { use: async n => n === "sample" ? fake : null };
};

const browser = await chromium.launch();
try {
  // 1. outside claude.ai (no window.claude): the page explains, and choosing still works
  let page = await browser.newPage();
  await serve(page, { fakePdf: true });
  await page.goto(url);
  await page.waitForFunction(() => document.getElementById("gohint").textContent.length > 0);
  assert((await page.textContent("#gohint")).includes("Open this page on claude.ai"), "outside claude.ai the page says where to open it");
  await page.close();

  // 2. inside claude.ai (fake)
  page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await serve(page, { fakePdf: true });
  await page.addInitScript(fakeClaude, SAMPLE);
  await page.goto(url);
  const ticked = () => page.$$eval("input[name=sec]:checked", e => e.map(x => x.value));
  const prompts = () => page.evaluate(() => window.PROMPTS);
  const run = async () => { await page.click("#go"); await page.waitForFunction(() => !document.getElementById("go").disabled && document.getElementById("state").textContent.length > 0, null, { timeout: 15000 }); };

  assert(JSON.stringify(await ticked()) === JSON.stringify(["summary_basic", "summary", "key_points", "formulas", "one_mark", "short_answer", "long_answer"]), "defaults match the app: " + await ticked());
  assert(!await page.isVisible("#testbox"), "count boxes hidden until the practice test is ticked");
  assert(!await page.$("#prompt") && !await page.$("#copy"), "no prompt to copy any more");

  await run();
  assert((await page.textContent("#state")).includes("jesc101.pdf"), "Prepare without the file asks for it: " + await page.textContent("#state"));
  assert((await prompts()).length === 0, "nothing sent without the file");

  await page.setInputFiles("#pdfs", { name: "jesc101.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fake") });
  assert((await page.textContent("#files")).includes("✓ Chosen"), "file matched to chapter 1 by its name");
  await run();
  let p = await prompts();
  assert(p.length === 7, "one request per ticked section: " + p.length);
  assert(p.every(x => x.includes("Reply with ONLY one JSON object") && x.includes("--- Page 1 ---") && x.includes("Magnesium ribbon burns")), "each request has the format and the chapter text");
  assert(p[0].includes("Class 10, Science") && p[0].includes("Chapter 1"), "chapter in the request");
  assert(await page.isVisible("#doc") && (await page.textContent("#doc")).includes("Chapter 1: Chemical Reactions and Equations"), "document shown");
  for (const h of ["Summary Notes (Basic)", "Key Points to Remember", "Formula Summary", "One Mark Questions", "Long Answer Questions"]) assert((await page.textContent("#doc")).includes(h), "document has " + h);
  assert(await page.isVisible("#print") && await page.isVisible("#download"), "Save as PDF and Download offered");

  // the practice test on its own: only the question kinds the paper needs are written, and only the paper is printed
  for (const v of await ticked()) await page.uncheck(`input[value=${v}]`);
  await page.check("#sec-test");
  await page.fill("#tc-m1", "4"); await page.fill("#tc-m2", "0"); await page.fill("#tc-m3", "2"); await page.fill("#tc-m5", "1"); await page.fill("#tc-case", "0");
  await page.fill("#pf", "1"); await page.fill("#pt", "2");   // other pages, so nothing comes from the run above
  await page.evaluate(() => { window.PROMPTS.length = 0; });
  await run();
  p = await prompts();
  assert(p[0].includes("pages 1–2 of 3") && !p[0].includes("--- Page 3 ---"), "page range kept");
  await page.fill("#pf", ""); await page.fill("#pt", "");
  const asked = p.map(x => x.match(/"required":\["chapter_title","(\w+)"\]/)[1]).sort();
  assert(JSON.stringify(asked) === JSON.stringify(["long_answer", "one_mark", "short_answer"]), "paper kinds only: " + asked);
  const doc = await page.textContent("#doc");
  assert(doc.includes("Practice Test") && doc.includes("Answer Key") && !doc.includes("One Mark Questions (1 mark each)"), "only the paper and key printed");

  // an answer cut off by the length limit is asked again once, for less
  await page.check("input[value=key_points]"); await page.uncheck("#sec-test");
  await page.selectOption("#chf", "2"); await page.selectOption("#cht", "2");
  await page.setInputFiles("#pdfs", { name: "jesc102.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fake") });
  await page.evaluate(() => { window.PROMPTS.length = 0; window.FAIL = ["invalid_json"]; });
  await run();
  p = await prompts();
  assert(p.length === 2 && p[1].includes("about half as many items") && await page.isVisible("#doc"), "retried once for less, then done");

  // usage limit: a clear message
  await page.selectOption("#chf", "1"); await page.selectOption("#cht", "1"); await page.check("input[value=differences]");
  await page.evaluate(() => { window.FAIL = ["rate_limited"]; });
  await run();
  assert((await page.textContent("#state")).includes("usage limit"), "usage limit explained: " + await page.textContent("#state"));
  assert(!errors.length, "no script errors: " + errors.join(" | "));
  console.log("OK - pro page: writes the material with the claude.ai sample capability (fake), document, practice test, retry, usage limit");
} finally { await browser.close(); }
