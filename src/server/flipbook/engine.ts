/**
 * The page-turning book inside the standalone HTML download, as plain
 * browser JavaScript. It builds the desktop spread from the phone reader's
 * pages (so the file carries each page once), and handles the contents,
 * thumbnails, zoom, full screen, keyboard and #page=N deep links.
 *
 * Kept as a string rather than a function's source: a bundler is free to
 * rewrite a function, and this has to reach the reader's browser as written.
 * No template literals inside — the string is itself one.
 */
export const ENGINE_JS = String.raw`(function () {
  var d = document;
  d.documentElement.classList.remove("no-js");
  var data = JSON.parse(d.getElementById("fb-data").textContent);
  var shell = d.getElementById("fb");
  var reader = d.getElementById("fb-reader");
  var pages = Array.prototype.slice.call(reader.children);
  var total = pages.length;
  var S = Math.ceil(total / 2);
  var book = d.getElementById("fb-book");
  var zoomBox = d.getElementById("fb-zoom");
  var label = d.getElementById("fb-label");
  var prev = d.querySelector('[data-act="prev"]');
  var next = d.querySelector('[data-act="next"]');
  var desktop = window.matchMedia("(min-width: 768px)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var flipped = 0, turning = null, timer = 0, readerIndex = 0;

  // Links into the site leave this file: open them beside it.
  d.querySelectorAll(".fbp a[href]:not([data-goto])").forEach(function (a) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });

  function faceOf(index) {
    var source = pages[index] && pages[index].firstElementChild;
    return source ? source.cloneNode(true) : d.createElement("div");
  }
  function shade() {
    var span = d.createElement("span");
    span.className = "fb-shade";
    span.setAttribute("aria-hidden", "true");
    return span;
  }
  function followLink(event) {
    var anchor = event.target.closest("a");
    if (!anchor) return false;
    var goto = anchor.getAttribute("data-goto");
    if (goto) {
      event.preventDefault();
      jump(Number(goto) - 1);
    }
    return true;
  }

  var sheets = [];
  for (var i = 0; i < S; i += 1) {
    var sheet = d.createElement("div");
    sheet.className = "fb-sheet";
    if (reduce) sheet.style.transition = "none";
    var front = d.createElement("div");
    front.className = "fb-face r";
    front.setAttribute("role", "button");
    front.setAttribute("aria-label", "Turn page forward");
    front.append(faceOf(2 * i), shade());
    front.addEventListener("click", function (event) {
      if (!followLink(event)) go(flipped + 1);
    });
    var back = d.createElement("div");
    back.className = "fb-face l";
    back.setAttribute("role", "button");
    back.setAttribute("aria-label", "Turn page back");
    if (2 * i + 1 < total) back.append(faceOf(2 * i + 1));
    back.append(shade());
    back.addEventListener("click", function (event) {
      if (!followLink(event)) go(flipped - 1);
    });
    sheet.append(front, back);
    book.append(sheet);
    sheets.push(sheet);
  }

  function spreadLabel() {
    if (flipped === 0) return "Cover";
    if (flipped >= S) return "Back cover";
    return flipped * 2 + "–" + (flipped * 2 + 1) + " / " + total;
  }

  function paint() {
    sheets.forEach(function (sheet, i) {
      var isFlipped = i < flipped;
      sheet.style.zIndex = String(turning === i ? S + 2 : isFlipped ? i + 1 : S - i);
      sheet.style.transform = "rotateY(" + (isFlipped ? -180 : 0) + "deg)";
    });
    prev.disabled = flipped === 0;
    next.disabled = flipped >= S;
    label.textContent = desktop.matches ? spreadLabel() : "Page " + (readerIndex + 1) + " / " + total;
    book.setAttribute("aria-label", "Catalogue, " + spreadLabel());
    renderThumbState();
  }

  function remember(page) {
    var url = location.href.split("#")[0];
    try {
      history.replaceState(null, "", page > 0 ? url + "#page=" + page : url);
    } catch (e) {
      // Some file:// contexts refuse history writes; the book still turns.
    }
  }

  function go(target) {
    var clamped = Math.max(0, Math.min(S, target));
    if (clamped === flipped) return;
    turning = clamped > flipped ? flipped : flipped - 1;
    flipped = clamped;
    paint();
    clearTimeout(timer);
    timer = setTimeout(function () {
      turning = null;
      paint();
    }, reduce ? 0 : 850);
    remember(clamped * 2);
  }

  function showReaderPage(index, smooth) {
    var page = pages[Math.max(0, Math.min(total - 1, index))];
    reader.scrollTo({
      left: page.offsetLeft - (reader.clientWidth - page.clientWidth) / 2,
      behavior: smooth && !reduce ? "smooth" : "auto",
    });
  }

  function jump(index) {
    go(Math.ceil(index / 2));
    if (!desktop.matches) showReaderPage(index, true);
    d.querySelectorAll("dialog[open]").forEach(function (dialog) { dialog.close(); });
  }

  reader.addEventListener("click", followLink);

  if ("IntersectionObserver" in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) readerIndex = pages.indexOf(entry.target);
      });
      if (!desktop.matches) label.textContent = "Page " + (readerIndex + 1) + " / " + total;
    }, { root: reader, threshold: 0.6 });
    pages.forEach(function (page) { seen.observe(page); });
  }
  desktop.addEventListener("change", paint);

  d.querySelectorAll("#fb-toc [data-goto]").forEach(function (button) {
    button.addEventListener("click", function () { jump(Number(button.getAttribute("data-goto")) - 1); });
  });

  // Thumbnails are built on first open, so the file carries each page once.
  var grid = d.getElementById("fb-thumb-grid");
  var thumbs = [];
  function buildThumbs() {
    if (thumbs.length) return;
    thumbs = pages.map(function (_, i) {
      var button = d.createElement("button");
      button.type = "button";
      button.className = "fb-thumb";
      button.setAttribute("aria-label", "Go to page " + (i + 1));
      var face = faceOf(i);
      face.setAttribute("inert", "");
      var number = d.createElement("span");
      number.className = "fb-thumb-n";
      number.textContent = String(i + 1);
      button.append(face, number);
      button.addEventListener("click", function () { jump(i); });
      grid.append(button);
      return button;
    });
    renderThumbState();
  }
  function renderThumbState() {
    var right = flipped * 2;
    thumbs.forEach(function (button, i) {
      var current = desktop.matches ? right === i || right - 1 === i : readerIndex === i;
      button.classList.toggle("on", current);
    });
  }

  function open(id) {
    if (id === "fb-thumbs") buildThumbs();
    d.getElementById(id).showModal();
  }
  d.querySelectorAll("dialog").forEach(function (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.querySelector(".fb-close").addEventListener("click", function () { dialog.close(); });
  });

  function setOn(button, on) { button.toggleAttribute("data-on", on); }

  d.querySelectorAll("[data-act]").forEach(function (button) {
    button.addEventListener("click", function () {
      var act = button.getAttribute("data-act");
      if (act === "prev") go(flipped - 1);
      if (act === "next") go(flipped + 1);
      if (act === "toc") open("fb-toc");
      if (act === "thumbs") open("fb-thumbs");
      if (act === "zoom") {
        var zoomed = zoomBox.classList.toggle("on");
        setOn(button, zoomed);
        button.setAttribute("aria-label", zoomed ? "Zoom out" : "Zoom in");
        button.title = button.getAttribute("aria-label");
      }
      if (act === "fullscreen") {
        try {
          if (d.fullscreenElement) d.exitFullscreen();
          else if (shell.requestFullscreen) shell.requestFullscreen();
        } catch (e) {
          // Unsupported (iOS Safari): zoom still works.
        }
      }
      if (act === "share") {
        var page = desktop.matches ? flipped * 2 : readerIndex + 1;
        var url = data.site + "/catalogue/flipbook" + (page > 0 ? "?page=" + page : "");
        if (navigator.share) {
          navigator.share({ title: data.title, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            setOn(button, true);
            setTimeout(function () { setOn(button, false); }, 1600);
          }, function () { window.prompt("Copy this link", url); });
        } else {
          window.prompt("Copy this link", url);
        }
      }
    });
  });
  d.addEventListener("fullscreenchange", function () {
    var button = d.querySelector('[data-act="fullscreen"]');
    var on = Boolean(d.fullscreenElement);
    setOn(button, on);
    button.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    button.title = button.getAttribute("aria-label");
  });

  window.addEventListener("keydown", function (event) {
    if (d.querySelector("dialog[open]")) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    var step = event.key === "ArrowRight" ? 1 : -1;
    if (desktop.matches) go(flipped + step);
    else showReaderPage(readerIndex + step, true);
  });

  // Deep link: #page=12 (or ?page=12, as the site's share links read) opens
  // on pages 12-13, the spread the site would show.
  var match = /(?:^#|[?&#])page=(\d+)/.exec(location.hash);
  var wanted = Number(match ? match[1] : new URLSearchParams(location.search).get("page") || 0);
  if (isFinite(wanted) && wanted > 0) {
    flipped = Math.min(S, Math.ceil(wanted / 2));
    readerIndex = Math.min(total - 1, wanted - 1);
    requestAnimationFrame(function () { showReaderPage(readerIndex, false); });
  }
  paint();
})();`;
