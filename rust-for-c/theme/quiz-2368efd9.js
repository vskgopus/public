// Makes the quiz page interactive. Without this script the page still works: every
// question has its own collapsed "Answer".
(function () {
  var qs = document.querySelectorAll(".content main .quiz-q");
  if (!qs.length) return;
  var banner = document.querySelector(".quiz-score");
  var total = qs.length, right = 0, answered = 0;

  function render() {
    if (!banner) return;
    banner.hidden = false;
    banner.innerHTML = "";
    var t = document.createElement("span");
    t.textContent = answered === total
      ? "Final score: " + right + " of " + total
      : "Score: " + right + " of " + answered + " answered (" + total + " questions)";
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = "Reset";
    b.addEventListener("click", reset);
    banner.appendChild(t);
    banner.appendChild(b);
  }

  function reset() {
    right = 0; answered = 0;
    qs.forEach(function (q) {
      q.classList.remove("done");
      q.querySelectorAll("li").forEach(function (li) { li.classList.remove("picked", "right", "wrong"); });
      var d = q.querySelector("details");
      if (d) d.open = false;
    });
    render();
  }

  qs.forEach(function (q) {
    var answer = q.getAttribute("data-answer");
    q.classList.add("live");
    q.querySelectorAll("ul > li").forEach(function (li, i) {
      var letter = "abcd".charAt(i);
      li.setAttribute("tabindex", "0");
      li.setAttribute("role", "button");
      function pick() {
        if (q.classList.contains("done")) return;
        q.classList.add("done");
        answered++;
        li.classList.add("picked");
        if (letter === answer) { right++; li.classList.add("right"); }
        else {
          li.classList.add("wrong");
          var good = q.querySelectorAll("ul > li")["abcd".indexOf(answer)];
          if (good) good.classList.add("right");
        }
        var d = q.querySelector("details");
        if (d) d.open = true;
        render();
      }
      li.addEventListener("click", pick);
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
      });
    });
  });
  render();
})();
