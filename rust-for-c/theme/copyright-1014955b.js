// Appends a copyright footer to the end of every page's content.
(function () {
  var main = document.querySelector(".content main");
  if (!main || main.querySelector(".rc-copyright")) return;
  var f = document.createElement("footer");
  f.className = "rc-copyright";
  f.innerHTML =
    "<p>© 2026 Gopu Sugumar. <em>Rust for C Programmers</em> is free software, " +
    "licensed under the GNU General Public License, version 3 or (at your option) any later version " +
    "(GPL-3.0-or-later).</p>" +
    "<p>Rust, C and other product names are used only to identify the technologies being taught; " +
    "this book is not affiliated with or endorsed by their owners.</p>";
  main.appendChild(f);
})();
