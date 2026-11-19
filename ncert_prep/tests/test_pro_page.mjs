// Checks the no-install page pro/index.html in Chromium (no server, no key): the section choices,
// the practice-test counts and the prompt they produce.   node ncert_prep/tests/test_pro_page.mjs
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.join(here, "..", "pro", "index.html");
const assert = (ok, msg) => { if (!ok) { console.error("FAILED:", msg); process.exitCode = 1; throw new Error(msg); } };

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // offline test: fonts are optional
  await page.goto(url);
  const prompt = () => page.inputValue("#prompt");
  const ticked = () => page.$$eval("input[name=sec]:checked", e => e.map(x => x.value));

  assert(JSON.stringify(await ticked()) === JSON.stringify(["summary_basic", "summary", "key_points", "formulas", "one_mark", "short_answer", "long_answer"]), "defaults match the app: " + await ticked());
  let p = await prompt();
  for (const w of ["SUMMARY NOTES", "KEY POINTS TO REMEMBER", "FORMULA SUMMARY", "ONE MARK QUESTIONS", "2 AND 3 MARK", "5 MARK QUESTIONS"]) assert(p.includes(w), "default prompt has " + w);
  for (const w of ["QUICK REVISION", "DIFFERENCES", "CASE-BASED", "PRACTICE TEST"]) assert(!p.includes(w), "default prompt lacks " + w);
  assert(!await page.isVisible("#testbox"), "count boxes hidden until the practice test is ticked");
  assert(p.includes("Class 10, Science") && p.includes("Chapter 1"), "chapter in the prompt");

  // everything ticked: case-based and the practice test (drawn from the question sections)
  await page.check("input[value=revision_table]"); await page.check("input[value=differences]");
  await page.check("input[value=case_based]"); await page.check("#sec-test");
  assert(await page.isVisible("#testbox"), "count boxes shown");
  p = await prompt();
  assert(p.includes("10 one-mark (Section A), 4 two-mark, 4 three-mark, 3 five-mark, 2 case-based"), "default counts: " + p.slice(p.indexOf("PRACTICE")));
  assert(p.includes("Pick the questions from your question sections above") && !p.includes("IMPORTANT: include ONLY"), "paper drawn from the banks");

  // the practice test on its own, with chosen counts
  for (const v of await ticked()) if (v !== "practice_test") await page.uncheck(`input[value=${v}]`);
  await page.fill("#tc-m1", "6"); await page.fill("#tc-m2", "0"); await page.fill("#tc-m3", "2"); await page.fill("#tc-m5", "1"); await page.fill("#tc-case", "0");
  p = await prompt();
  assert(p.includes("a practice question paper with: 6 one-mark (Section A), 2 three-mark, 1 five-mark."), "chosen counts: " + p);
  assert(p.includes("Write fresh questions") && p.includes("IMPORTANT: include ONLY the practice test paper and its answer key"), "stand-alone wording");
  assert(!p.includes("SUMMARY NOTES") && !p.includes("ONE MARK QUESTIONS WITH ANSWERS"), "no notes or banks asked for");
  assert(p.includes("1. PRACTICE TEST WITH ANSWER KEY"), "numbered from 1");
  assert(!await page.isDisabled("#copy"), "copy enabled");

  // refusals
  for (const k of ["m1", "m3", "m5"]) await page.fill(`#tc-${k}`, "0");
  assert(await page.isDisabled("#copy") && (await page.textContent("#secmsg")).includes("count above 0"), "all counts 0 is refused");
  await page.uncheck("#sec-test");
  assert(await page.isDisabled("#copy") && (await page.textContent("#secmsg")).includes("at least one section"), "nothing ticked is refused");

  // several chapters: one combined paper
  await page.check("input[value=summary]"); await page.check("#sec-test"); await page.fill("#tc-m1", "5");
  await page.selectOption("#cht", "3");
  p = await prompt();
  assert(p.includes("Chapters 1 to 3") && p.includes("one combined paper"), "combined paper over several chapters");
  assert(!errors.length, "no script errors: " + errors.join(" | "));
  console.log("OK - pro page: sections, formula summary, practice test counts and stand-alone paper");
} finally { await browser.close(); }
