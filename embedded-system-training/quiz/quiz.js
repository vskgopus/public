(function () {
  "use strict";

  var PASS_MARK = 70; // percent
  var LEVEL_NAMES = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", all: "All levels" };
  var MODULES = window.QUIZ_MODULES;
  var BANK = window.QUIZ_QUESTIONS;

  var state = null; // { name, moduleKey, levelKey, questions: [{src, order}], answers: [], index, startedAt, finishedAt }

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // Escape, then render `inline code`.
  function fmt(s) {
    return escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  }
  function plain(s) { return String(s).replace(/`/g, ""); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function show(screen) {
    ["setup", "quiz", "results"].forEach(function (s) { $("screen-" + s).hidden = s !== screen; });
    window.scrollTo(0, 0);
  }

  function filteredPool() {
    var m = $("module-select").value, l = $("level-select").value;
    return BANK.filter(function (q) {
      return (m === "all" || q.module === m) && (l === "all" || q.level === l);
    });
  }

  function updatePoolInfo() {
    var n = filteredPool().length;
    $("pool-info").textContent = n + " question" + (n === 1 ? "" : "s") + " available for this selection.";
  }

  /* ---------- Setup ---------- */
  function initSetup() {
    $("pass-mark").textContent = PASS_MARK;
    var sel = $("module-select");
    sel.innerHTML = '<option value="all">All modules</option>' + Object.keys(MODULES).map(function (k) {
      return '<option value="' + k + '">' + escapeHtml(MODULES[k]) + "</option>";
    }).join("");

    var params = new URLSearchParams(window.location.search);
    if (params.get("module") && MODULES[params.get("module")]) sel.value = params.get("module");

    ["module-select", "level-select"].forEach(function (id) { $(id).addEventListener("change", updatePoolInfo); });
    updatePoolInfo();

    $("setup-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("learner-name").value.trim();
      if (!name) { $("name-error").hidden = false; $("learner-name").focus(); return; }
      $("name-error").hidden = true;

      var pool = shuffle(filteredPool());
      var count = parseInt($("count-select").value, 10);
      if (count > 0) pool = pool.slice(0, count);
      if (pool.length === 0) { $("pool-info").textContent = "No questions match this selection."; return; }

      state = {
        name: name,
        moduleKey: $("module-select").value,
        levelKey: $("level-select").value,
        questions: pool.map(function (q) { return { src: q, order: shuffle([0, 1, 2, 3]) }; }),
        answers: pool.map(function () { return null; }), // index into ORIGINAL options
        index: 0,
        startedAt: new Date(),
        finishedAt: null
      };
      renderQuestion();
      show("quiz");
    });
  }

  /* ---------- Quiz ---------- */
  function renderQuestion() {
    var i = state.index, total = state.questions.length, item = state.questions[i], q = item.src;
    $("progress-text").textContent = "Question " + (i + 1) + " of " + total;
    $("q-tags").innerHTML = '<span class="tag">' + escapeHtml(MODULES[q.module]) + '</span><span class="tag">' +
      LEVEL_NAMES[q.level] + "</span>";
    $("progress-bar").style.width = ((i + 1) / total * 100) + "%";
    $("q-text").innerHTML = fmt(q.q);

    var codeEl = $("q-code");
    if (q.code) { codeEl.hidden = false; codeEl.firstChild.textContent = q.code; } else { codeEl.hidden = true; }

    var fs = $("q-options");
    fs.querySelectorAll(".option").forEach(function (n) { n.remove(); });
    item.order.forEach(function (orig, pos) {
      var id = "opt-" + pos;
      var label = document.createElement("label");
      label.className = "option" + (state.answers[i] === orig ? " selected" : "");
      label.setAttribute("for", id);
      label.innerHTML = '<input type="radio" name="answer" id="' + id + '" value="' + orig + '"' +
        (state.answers[i] === orig ? " checked" : "") + "> <span>" + fmt(q.options[orig]) + "</span>";
      label.querySelector("input").addEventListener("change", function () {
        state.answers[i] = orig;
        fs.querySelectorAll(".option").forEach(function (n) { n.classList.remove("selected"); });
        label.classList.add("selected");
        $("unanswered-warning").hidden = true;
      });
      fs.appendChild(label);
    });

    $("btn-prev").disabled = i === 0;
    var last = i === total - 1;
    $("btn-next").hidden = last;
    $("btn-submit").hidden = !last;
    $("unanswered-warning").hidden = true;
  }

  function initQuizNav() {
    $("btn-prev").addEventListener("click", function () {
      if (state.index > 0) { state.index--; renderQuestion(); }
    });
    $("btn-next").addEventListener("click", function () {
      if (state.index < state.questions.length - 1) { state.index++; renderQuestion(); }
    });
    $("btn-submit").addEventListener("click", function () {
      var missing = [];
      state.answers.forEach(function (a, k) { if (a === null) missing.push(k + 1); });
      var warn = $("unanswered-warning");
      if (missing.length && warn.hidden) {
        warn.textContent = "Unanswered: question " + missing.join(", ") +
          ". Click Submit again to finish anyway (unanswered questions count as wrong).";
        warn.hidden = false;
        return;
      }
      state.finishedAt = new Date();
      renderResults();
      show("results");
    });
  }

  /* ---------- Results ---------- */
  function computeResults() {
    var correct = 0, perModule = {};
    var rows = state.questions.map(function (item, k) {
      var q = item.src, a = state.answers[k], ok = a === q.answer;
      if (ok) correct++;
      perModule[q.module] = perModule[q.module] || { correct: 0, total: 0 };
      perModule[q.module].total++;
      if (ok) perModule[q.module].correct++;
      return { q: q, given: a, ok: ok };
    });
    var total = rows.length, pct = Math.round(correct / total * 1000) / 10;
    return { rows: rows, correct: correct, total: total, pct: pct, passed: pct >= PASS_MARK, perModule: perModule };
  }

  function duration(ms) {
    var s = Math.round(ms / 1000), m = Math.floor(s / 60);
    return m + " min " + (s % 60) + " s";
  }

  function renderResults() {
    var r = computeResults();
    state.result = r;
    var meta = [
      ["Learner", state.name],
      ["Date / time", state.finishedAt.toLocaleString()],
      ["Module", state.moduleKey === "all" ? "All modules" : MODULES[state.moduleKey]],
      ["Level", LEVEL_NAMES[state.levelKey]],
      ["Time taken", duration(state.finishedAt - state.startedAt)],
      ["Pass mark", PASS_MARK + "%"]
    ];
    $("result-meta").innerHTML = meta.map(function (m) {
      return "<tr><th>" + m[0] + "</th><td>" + escapeHtml(m[1]) + "</td></tr>";
    }).join("");

    var box = $("score-box");
    box.className = "score-box " + (r.passed ? "pass" : "fail");
    box.textContent = "Score: " + r.correct + " / " + r.total + " (" + r.pct + "%) — " + (r.passed ? "PASS" : "NOT PASSED");

    $("module-breakdown").innerHTML = Object.keys(r.perModule).map(function (k) {
      var p = r.perModule[k];
      return "<tr><td>" + escapeHtml(MODULES[k]) + "</td><td>" + p.correct + " / " + p.total + "</td><td>" +
        Math.round(p.correct / p.total * 100) + "%</td></tr>";
    }).join("");

    $("review-list").innerHTML = r.rows.map(function (row) {
      var q = row.q;
      var given = row.given === null ? "<em>Not answered</em>" : fmt(q.options[row.given]);
      return "<li><div class=\"q\">" + fmt(q.q) + "</div>" +
        (q.code ? "<pre><code>" + escapeHtml(q.code) + "</code></pre>" : "") +
        "<div class=\"" + (row.ok ? "ok" : "bad") + "\">" + (row.ok ? "✔ Correct" : "✘ Incorrect") +
        " — your answer: " + given + "</div>" +
        (row.ok ? "" : "<div>Correct answer: " + fmt(q.options[q.answer]) + "</div>") +
        "<div class=\"expl\">" + fmt(q.explanation) + "</div></li>";
    }).join("");
  }

  function csvCell(v) {
    var s = String(v == null ? "" : v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function downloadCsv() {
    var r = state.result;
    var lines = [
      ["Learner", state.name],
      ["Date/time (ISO)", state.finishedAt.toISOString()],
      ["Module", state.moduleKey === "all" ? "All modules" : MODULES[state.moduleKey]],
      ["Level", LEVEL_NAMES[state.levelKey]],
      ["Time taken", duration(state.finishedAt - state.startedAt)],
      ["Score", r.correct + "/" + r.total],
      ["Percent", r.pct],
      ["Result", r.passed ? "PASS" : "NOT PASSED"],
      [],
      ["#", "Question ID", "Module", "Level", "Question", "Your answer", "Correct answer", "Result"]
    ];
    r.rows.forEach(function (row, k) {
      var q = row.q;
      lines.push([k + 1, q.id, MODULES[q.module], LEVEL_NAMES[q.level], plain(q.q),
        row.given === null ? "(not answered)" : plain(q.options[row.given]),
        plain(q.options[q.answer]), row.ok ? "Correct" : "Incorrect"]);
    });
    var csv = "﻿" + lines.map(function (l) { return l.map(csvCell).join(","); }).join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    var safeName = state.name.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 40) || "learner";
    a.href = URL.createObjectURL(blob);
    a.download = "quiz-result_" + safeName + "_" + state.finishedAt.toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function initResults() {
    $("btn-csv").addEventListener("click", downloadCsv);
    $("btn-print").addEventListener("click", function () { window.print(); });
    $("btn-retake").addEventListener("click", function () { updatePoolInfo(); show("setup"); });
  }

  initSetup();
  initQuizNav();
  initResults();
})();
