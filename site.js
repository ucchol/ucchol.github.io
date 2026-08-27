/* ===========================================================
   ASIF RAHMAN — site behaviour. One file, no dependencies.

   Everything here is progressive enhancement. With JavaScript
   disabled the site still reads correctly, every project and
   publication is visible, and no control appears that cannot
   work. Controls that need JS are injected by JS.

   Contents
     1. theme        light and dark, remembered
     2. quantal      lambda slider on the home figure
     3. filters      topic filtering on projects and publications
     4. cite         copy BibTeX from each publication
     5. mail         reassemble the address for the mailto link
     6. lightbox     click a result figure to enlarge it
     7. scrollspy    highlight the entry currently in view
   =========================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------------------------------------- 1. theme */
  // The initial value is applied by an inline snippet in <head> so the
  // page never flashes the wrong theme. Here we only wire the control.
  function initTheme() {
    var nav = document.querySelector(".nav ul");
    if (!nav) return;

    var li = document.createElement("li");
    var btn = document.createElement("button");
    btn.className = "themebtn";
    btn.type = "button";
    li.appendChild(btn);
    nav.appendChild(li);

    function label() {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      btn.textContent = dark ? "light" : "dark";
      btn.setAttribute("aria-label", "Switch to " + (dark ? "light" : "dark") + " theme");
    }

    btn.addEventListener("click", function () {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      var next = dark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      label();
    });

    label();
  }

  /* ----------------------------------------------- 2. quantal */
  // Redraws the quantal response curve from a rationality parameter.
  // P(pick A) = logistic(lambda * payoff advantage), advantage in [-1, 1].
  function initQuantal() {
    var curve = document.getElementById("qrcurve");
    var host = document.getElementById("qrslider");
    if (!curve || !host) return;

    var X0 = 70, X1 = 530, XC = 300, Y0 = 262, SPAN = 232;

    function points(lam) {
      var out = [], x, adv, p;
      for (x = X0; x <= X1; x += 4) {
        adv = (x - XC) / (X1 - XC);
        p = 1 / (1 + Math.exp(-lam * adv));
        out.push(x + "," + (Y0 - p * SPAN).toFixed(1));
      }
      return out.join(" ");
    }

    host.innerHTML =
      '<label for="lam">attacker rationality</label>' +
      '<input id="lam" type="range" min="0.2" max="20" step="0.2" value="4">' +
      '<output for="lam" id="lamout"></output>';

    var input = document.getElementById("lam");
    var out = document.getElementById("lamout");

    function render() {
      var lam = parseFloat(input.value);
      curve.setAttribute("points", points(lam));
      var word = lam < 1.2 ? "near random" : lam > 14 ? "near perfect" : "bounded";
      out.textContent = "\u03BB = " + lam.toFixed(1) + ", " + word;
    }

    // Let the intro animation finish before the slider takes over the path.
    curve.classList.remove("draw");
    input.addEventListener("input", render);
    render();
  }

  /* ----------------------------------------------- 3. filters */
  // Injects a filter bar built from the data-topic values actually
  // present, so adding an entry with a new topic needs no JS edit.
  function initFilters() {
    var list = document.querySelector("[data-filterable]");
    if (!list) return;

    var items = Array.prototype.slice.call(list.querySelectorAll("[data-topic]"));
    if (items.length < 2) return;

    var topics = [];
    items.forEach(function (el) {
      el.dataset.topic.split(/\s+/).forEach(function (t) {
        if (t && topics.indexOf(t) === -1) topics.push(t);
      });
    });
    if (topics.length < 2) return;
    topics.sort();

    var bar = document.createElement("div");
    bar.className = "filters";
    bar.innerHTML = '<span class="flabel">filter</span>';

    var empty = document.createElement("p");
    empty.className = "noresult is-hidden";
    empty.textContent = "Nothing under that topic yet.";

    function make(name, value) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fbtn";
      b.textContent = name;
      b.dataset.value = value;
      b.setAttribute("aria-pressed", value === "all" ? "true" : "false");
      b.addEventListener("click", function () { apply(value); });
      bar.appendChild(b);
      return b;
    }

    function apply(value) {
      var shown = 0;
      items.forEach(function (el) {
        var hit = value === "all" || el.dataset.topic.split(/\s+/).indexOf(value) > -1;
        el.classList.toggle("is-hidden", !hit);
        if (hit) shown++;
      });
      Array.prototype.forEach.call(bar.querySelectorAll(".fbtn"), function (b) {
        b.setAttribute("aria-pressed", b.dataset.value === value ? "true" : "false");
      });
      empty.classList.toggle("is-hidden", shown > 0);
      if (window.NDSpy) window.NDSpy();
    }

    make("all", "all");
    topics.forEach(function (t) { make(t.replace(/-/g, " "), t); });

    list.parentNode.insertBefore(bar, list);
    list.parentNode.insertBefore(empty, list.nextSibling);
  }

  /* -------------------------------------------------- 4. cite */
  // Each .pub may carry a <script type="text/bibtex"> holding its entry.
  function initCite() {
    var pubs = document.querySelectorAll(".pub");
    Array.prototype.forEach.call(pubs, function (pub) {
      var src = pub.querySelector('script[type="text/bibtex"]');
      var links = pub.querySelector(".pub-links");
      if (!src || !links) return;

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "citebtn";
      btn.textContent = "bibtex";
      btn.addEventListener("click", function () {
        var text = src.textContent.replace(/^\s*\n/, "").replace(/\s+$/, "");
        copy(text, function (ok) {
          btn.textContent = ok ? "copied" : "copy failed";
          btn.classList.add("ok");
          setTimeout(function () {
            btn.textContent = "bibtex";
            btn.classList.remove("ok");
          }, 1600);
        });
      });
      links.appendChild(btn);
    });
  }

  function copy(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        function () { done(true); },
        function () { done(fallbackCopy(text)); }
      );
    } else {
      done(fallbackCopy(text));
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  /* ------------------------------------------------- 5. mail */
  // The address is displayed in a spoken form that scrapers do not
  // parse, and reassembled here so the link still works on click. The
  // visible text never changes, so it reads the same with JS off.
  function initMail() {
    var els = document.querySelectorAll("a.mail[data-u][data-d]");
    Array.prototype.forEach.call(els, function (a) {
      a.setAttribute("href", "mailto:" + a.dataset.u + "@" + a.dataset.d);
    });
  }

  /* ---------------------------------------------- 6. lightbox */
  function initLightbox() {
    var figs = document.querySelectorAll(".fig.zoomable");
    if (!figs.length) return;

    var lb = document.createElement("div");
    lb.className = "lb";
    lb.hidden = true;
    lb.innerHTML = '<div class="lb-inner" role="dialog" aria-modal="true" aria-label="Enlarged figure">' +
                   '<button class="lb-close" type="button">close</button>' +
                   '<div class="lb-body"></div></div>';
    document.body.appendChild(lb);

    var body = lb.querySelector(".lb-body");
    var closeBtn = lb.querySelector(".lb-close");
    var opener = null;

    function open(fig) {
      body.innerHTML = "";
      var svg = fig.querySelector("svg");
      var cap = fig.querySelector("figcaption");
      if (svg) body.appendChild(svg.cloneNode(true));
      if (cap) body.appendChild(cap.cloneNode(true));
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      closeBtn.focus();
    }

    function close() {
      lb.hidden = true;
      body.innerHTML = "";
      document.body.style.overflow = "";
      if (opener) opener.focus();
    }

    Array.prototype.forEach.call(figs, function (fig) {
      fig.setAttribute("tabindex", "0");
      fig.setAttribute("role", "button");
      fig.setAttribute("aria-label", "Enlarge figure");
      fig.addEventListener("click", function () { opener = fig; open(fig); });
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          opener = fig;
          open(fig);
        }
      });
    });

    closeBtn.addEventListener("click", close);
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !lb.hidden) close();
    });
  }

  /* --------------------------------------------- 7. scrollspy */
  function initSpy() {
    var toc = document.querySelector(".toc");
    if (!toc) return;

    var links = Array.prototype.slice.call(toc.querySelectorAll("a[href^='#']"));
    if (!links.length) return;

    function targets() {
      return links.map(function (a) {
        var el = document.getElementById(a.getAttribute("href").slice(1));
        return el && !el.classList.contains("is-hidden") ? { a: a, el: el } : null;
      }).filter(Boolean);
    }

    function update() {
      var list = targets(), best = null, line = toc.getBoundingClientRect().bottom + 24;
      list.forEach(function (t) {
        if (t.el.getBoundingClientRect().top <= line) best = t;
      });
      if (!best && list.length) best = list[0];
      links.forEach(function (a) { a.classList.remove("active"); });
      if (best) best.a.classList.add("active");
      links.forEach(function (a) {
        var el = document.getElementById(a.getAttribute("href").slice(1));
        a.classList.toggle("is-hidden", !!(el && el.classList.contains("is-hidden")));
      });
    }

    window.NDSpy = update;
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* ------------------------------------------------ start up */
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    initTheme();
    initQuantal();
    initFilters();
    initCite();
    initMail();
    initLightbox();
    initSpy();
  });
})();
