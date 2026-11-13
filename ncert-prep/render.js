// Turn the AI's material into a printable document (HTML; the browser saves it as PDF).
// A port of the desktop app's pdf_render.py: same sections, order, diagrams and practice test.
// Everything the AI wrote is escaped before it goes into the page.
import { DATA } from "./data.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const strip = s => String(s ?? "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/`/g, "");

// Answers: lines starting with "- " become bullets, other lines paragraphs.
function answer(text) {
  const lines = String(text ?? "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return "";
  let html = '<div class="ans"><span class="ans-label">Ans.</span> ', inList = false;
  lines.forEach((line, i) => {
    const m = line.match(/^[-•–]\s+(.*)$/);
    if (m) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${esc(strip(m[1]))}</li>`; }
    else { if (inList) { html += "</ul>"; inList = false; } html += (i ? "<p>" : "<span>") + esc(strip(line)) + (i ? "</p>" : "</span>"); }
  });
  return html + (inList ? "</ul>" : "") + "</div>";
}

function question(label, text, tag = "", options = [], ans = "") {
  const opts = (options || []).map((o, i) => {
    o = String(o).trim();
    const prefix = /^\(?[a-dA-D][).]/.test(o) ? "" : `(${"abcd"[i] ?? i + 1}) `;
    return `<div class="opt">${esc(strip(prefix + o))}</div>`;
  }).join("");
  return `<div class="q keep"><div class="qtext"><b>${esc(label)}</b> ${esc(strip(text))}${tag ? ` <span class="tag">[${esc(tag)}]</span>` : ""}</div>${opts}${ans ? answer(ans) : ""}</div>`;
}

// ------------------------------------------------------------------ diagrams

function nodeHtml(n, withNum = "") {
  const details = (n.details || []).map(d => String(d).trim()).filter(Boolean);
  return `<b>${esc(withNum + (n.label || ""))}</b>${details.length ? "<br>" + details.map(esc).join("<br>") : ""}`;
}

function flow(nodes) {
  return `<div class="flow">${nodes.map((n, i) => `${i ? '<div class="arrow-down" aria-hidden="true"></div>' : ""}<div class="node">${nodeHtml(n)}</div>`).join("")}</div>`;
}

function cycle(nodes) {
  const n = nodes.length, W = 640, H = 300, cx = W / 2, cy = H / 2, rx = 230, ry = 105, bw = n <= 5 ? 150 : 124, bh = 46;
  const pts = nodes.map((_, i) => { const a = Math.PI / 2 - (2 * Math.PI * i) / n; return [cx + rx * Math.cos(a), cy - ry * Math.sin(a)]; });
  const edge = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const t = Math.min(dx ? bw / 2 / Math.abs(dx) : 1e9, dy ? bh / 2 / Math.abs(dy) : 1e9); return [a[0] + dx * t, a[1] + dy * t]; };
  let arrows = "";
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], s = edge(a, b), e = edge(b, a);
    arrows += `<line x1="${s[0].toFixed(1)}" y1="${s[1].toFixed(1)}" x2="${e[0].toFixed(1)}" y2="${e[1].toFixed(1)}" marker-end="url(#ah)"/>`;
  }
  const boxes = nodes.map((nd, i) => `<div class="cnode" style="left:${((pts[i][0] - bw / 2) / W * 100).toFixed(2)}%;top:${((pts[i][1] - bh / 2) / H * 100).toFixed(2)}%;width:${(bw / W * 100).toFixed(2)}%">${esc(`${i + 1}. ${nd.label || ""}`)}</div>`).join("");
  const legend = nodes.map((nd, i) => (nd.details || []).length ? `<li><b>${i + 1}. ${esc(nd.label || "")}:</b> ${esc(nd.details.join("; "))}</li>` : "").join("");
  return `<div class="cycle" style="aspect-ratio:${W}/${H}"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>${arrows}</svg>${boxes}</div>${legend ? `<ul class="legend">${legend}</ul>` : ""}`;
}

function conceptMap(title, nodes) {
  let out = "";
  for (let i = 0; i < nodes.length; i += 5) {
    const chunk = nodes.slice(i, i + 5);
    out += `<div class="cmap"><div class="croot">${esc(title)}</div><div class="cbranches" style="grid-template-columns:repeat(${chunk.length},1fr)">${chunk.map(n => `<div class="cbranch"><div class="ctitle">${esc(n.label || "")}</div><ul>${(n.details || []).map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>`).join("")}</div></div>`;
  }
  return out;
}

function diagram(dg) {
  const nodes = (dg.nodes || []).filter(n => String(n.label || "").trim());
  if (!nodes.length) return "";
  const body = dg.kind === "concept_map" ? conceptMap(dg.title || "", nodes)
    : dg.kind === "cycle" && nodes.length >= 3 && nodes.length <= 8 ? cycle(nodes) : flow(nodes);
  return `<figure class="diagram keep"><h4>${esc(dg.title || "")}</h4>${body}${dg.caption ? `<figcaption>${esc(dg.caption)}</figcaption>` : ""}</figure>`;
}

function grid(header, rows, firstBold = true) {
  return `<table class="grid"><thead><tr>${header.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${firstBold && !i ? ' class="b"' : ""}>${esc(strip(c))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function caseBlock(label, c, answers = true, totalTag = false) {
  const qs = c.questions || [];
  const total = qs.reduce((s, q) => s + (+q.marks || 0), 0);
  let html = `<div class="keep"><div class="qtext"><b>${esc(label)}</b> Read the passage and answer the questions that follow.${totalTag && total ? ` <span class="tag">[${total} marks]</span>` : ""}</div><div class="passage">${esc(c.passage || "")}</div></div>`;
  qs.forEach((q, j) => {
    const m = +q.marks || 0;
    html += question(`(${"abcdefgh"[j] ?? j + 1})`, q.question || "", m ? `${m} mark${m === 1 ? "" : "s"}` : "", q.options, answers ? q.answer : "");
  });
  return html;
}

// ------------------------------------------------------------------ chapter

function chapterHtml(ch, sections) {
  let n = 0;
  const bar = t => `<h3 class="bar">${++n}. ${esc(t)}</h3>`;
  let html = `<section class="chapter"><h2>Chapter ${esc(ch.number)}: ${esc(ch.chapter_title || "")}</h2>`;
  if (ch.page_note) html += `<p class="muted">${esc(ch.page_note)}</p>`;
  html += `<p class="src">Source: ${esc(ch.url)}</p>`;
  for (const key of sections) {
    const items = ch[key] || [];
    if (key === "summary") {
      html += bar("Summary Notes") + items.map(b => `<div class="topic"><h4>${esc(b.topic)}</h4><ul>${(b.points || []).map(p => `<li>${esc(strip(p))}</li>`).join("")}</ul></div>`).join("");
    } else if (key === "diagrams") {
      html += bar("Diagrams to Understand the Chapter") + items.map(diagram).join("");
    } else if (key === "key_points") {
      html += bar("Key Points to Remember") + (items.length ? `<ul class="keypoints">${items.map(k => `<li>${esc(strip(k))}</li>`).join("")}</ul>` : "");
    } else if (key === "revision_table") {
      html += bar("Quick Revision Table") + (items.length ? grid(["Topic", "In short", "Remember"], items.map(r => [r.topic, r.in_short, r.remember])) : "");
    } else if (key === "differences") {
      html += bar("Differences") + items.map(d => `<div class="keep"><h4>Difference between ${esc(d.a)} and ${esc(d.b)}</h4>${grid(["Basis", d.a, d.b], (d.rows || []).map(r => [r.basis, r.a, r.b]))}</div>`).join("");
    } else if (key === "one_mark") {
      html += bar("One Mark Questions (1 mark each)") + items.map((q, i) => question(`${i + 1}.`, q.question, q.kind, q.options, q.answer)).join("");
    } else if (key === "short_answer") {
      html += bar("Short Answer Questions (2 / 3 marks)") + [...items].sort((a, b) => a.marks - b.marks).map((q, i) => question(`${i + 1}.`, q.question, `${q.marks} marks`, [], q.answer)).join("");
    } else if (key === "long_answer") {
      html += bar("Long Answer Questions (5 marks)") + items.map((q, i) => question(`${i + 1}.`, q.question, "5 marks", [], q.answer)).join("");
    } else if (key === "case_based") {
      html += bar("Case-Based Questions") + items.map((c, i) => caseBlock(`${i + 1}.`, c, true, true)).join("");
    }
  }
  return html + "</section>";
}

// ------------------------------------------------------------------ practice test

const spread = (items, k) => items.length <= k ? [...items] : Array.from({ length: k }, (_, i) => items[Math.floor(i * items.length / k)]);

export function practicePaper(chapters, sections) {
  const pool = {};
  for (const k of DATA.questionSections) if (sections.includes(k)) pool[k] = chapters.flatMap(c => c[k] || []);
  const paper = [];
  if (pool.one_mark?.length) paper.push(["1 mark each", 1, spread(pool.one_mark, 10).map(q => ["one", q])]);
  const sa = pool.short_answer || [];
  const two = spread(sa.filter(q => q.marks === 2), 4), three = spread(sa.filter(q => q.marks === 3), 4);
  if (two.length) paper.push(["2 marks each", 2, two.map(q => ["plain", q])]);
  if (three.length) paper.push(["3 marks each", 3, three.map(q => ["plain", q])]);
  if (pool.long_answer?.length) paper.push(["5 marks each", 5, spread(pool.long_answer, 3).map(q => ["plain", q])]);
  if (pool.case_based?.length) paper.push(["Case-based questions", 0, spread(pool.case_based, 2).map(c => ["case", c])]);
  return paper.map(([h, m, qs], i) => [`Section ${"ABCDE"[i]}: ${h}`, m, qs]);
}

function practiceHtml(chapters, sections) {
  const paper = practicePaper(chapters, sections);
  if (!paper.length) return "";
  const total = paper.reduce((s, [, m, qs]) => s + (m ? m * qs.length : qs.reduce((t, [, c]) => t + (c.questions || []).reduce((u, x) => u + (+x.marks || 0), 0), 0)), 0);
  let test = `<section class="chapter pagebreak"><h3 class="bar">Practice Test</h3><p>Chapter${chapters.length > 1 ? "s" : ""} ${esc(chapters.map(c => c.number).join(", "))} · Maximum marks: ${total} · Answer all questions. The answer key is on the pages after the test.</p>`;
  let key = `<section class="chapter pagebreak"><h3 class="bar">Practice Test: Answer Key</h3>`, num = 0;
  for (const [heading, , qs] of paper) {
    test += `<h4>${esc(heading)}</h4>`;
    for (const [kind, q] of qs) {
      num++;
      if (kind === "case") { test += caseBlock(`${num}.`, q, false, true); key += caseBlock(`${num}.`, q, true); continue; }
      test += question(`${num}.`, q.question, kind === "one" ? q.kind : "", q.options, "");
      key += question(`${num}.`, q.question, "", [], q.answer);
    }
  }
  return test + "</section>" + key + "</section>";
}

// ------------------------------------------------------------------ document

export function documentHtml(meta, chapters, options) {
  const practice = options.includes(DATA.practiceTest);
  const sections = DATA.order.filter(k => options.includes(k));
  const contents = sections.map(k => DATA.sections[k].label).concat(practice ? ["Practice test with answer key"] : []);
  const names = { one_mark: "one-mark", short_answer: "short-answer", long_answer: "long-answer", case_based: "case-based" };
  const counts = DATA.questionSections.filter(k => sections.includes(k)).map(k => `${chapters.reduce((s, c) => s + (c[k] || []).length, 0)} ${names[k]}`);
  const qline = counts.length > 1 ? counts.slice(0, -1).join(", ") + " and " + counts.at(-1) : counts.join("");
  const bookPart = meta.book.trim().toLowerCase() === meta.subject.trim().toLowerCase() ? "" : ` · ${meta.book}`;
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  let html = `<section class="cover"><div class="cover-in"><p class="kick">CBSE Exam Preparation</p><h1>Class ${esc(meta.cls)} ${esc(meta.subject)}${esc(bookPart)}</h1>
    <p class="chs">${esc(chapters.map(c => `Ch ${c.number}: ${c.chapter_title || ""}`).join(", "))}</p>
    <p class="muted">Contents: ${esc(contents.map((c, i) => `${i + 1}. ${c}`).join("  ·  "))}</p>
    ${qline ? `<p class="muted">${esc(qline)} questions with answers</p>` : ""}
    <p class="muted small">Based on the official NCERT textbook (ncert.nic.in). Prepared ${esc(today)} with ${esc(meta.ai)}.</p></div></section>`;
  for (const ch of chapters) html += chapterHtml(ch, sections);
  if (practice) html += practiceHtml(chapters, sections);
  return html;
}
