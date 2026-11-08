(function () {
  "use strict";
  var S = window.SURVEY, R = S.respondents;

  // Questions, in the same order as the Analysis sheet.
  var QUESTIONS = [
    { key: "languages",    title: "Spoken language at home (cleaned)", note: "Each language named in a response is counted once, so “Nepali & English” counts for both. Nepali includes Nepalese; Chinese includes Mandarin, Cantonese and Chinese-Mandarin; Russian includes Russia.", noFilter: true },
    { key: "fiction",      title: "Fiction genres", q: "Fiction Genres" },
    { key: "fictionTypes", title: "Fiction types (items wanted in your language)", q: "What types of items would you like to see in your language?" },
    { key: "nonfiction",   title: "Non-fiction subjects", q: "Non-fiction – subjects", wide: true },
    { key: "junior",       title: "Junior preferences", q: "Junior preferences" },
    { key: "format",       title: "Format preferences", q: "Format preferences" }
  ];
  // Display fixes for typos in the source option labels.
  var LABEL_FIX = { "Digitial eBooks": "Digital eBooks", "Popular, well-know authors": "Popular, well-known authors" };
  var fix = function (s) { return LABEL_FIX[s] || s; };

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var $ = function (id) { return document.getElementById(id); };

  // ---- language groups ------------------------------------------------------
  var langCounts = {};
  R.forEach(function (r) { r.languages.forEach(function (l) { langCounts[l] = (langCounts[l] || 0) + 1; }); });
  var languages = Object.keys(langCounts).sort(function (a, b) { return langCounts[b] - langCounts[a] || a.localeCompare(b); });
  var COMPARE_MIN = 5;
  var compareLangs = languages.filter(function (l) { return langCounts[l] >= COMPARE_MIN; });

  var state = { view: "overview", lang: "All" };
  try { var h = decodeURIComponent(location.hash.slice(1)); if (h && (h === "compare" || languages.indexOf(h) > -1)) { if (h === "compare") state.view = "compare"; else state.lang = h; } } catch (e) {}

  // ---- counting -------------------------------------------------------------
  function subset(lang) { return lang === "All" ? R : R.filter(function (r) { return r.languages.indexOf(lang) > -1; }); }
  function tally(rows, key) {
    var counts = {}, answered = 0;
    rows.forEach(function (r) {
      var v = r[key]; if (!v || !v.length) return; answered++;
      v.forEach(function (o) { counts[o] = (counts[o] || 0) + 1; });
    });
    return { counts: counts, answered: answered };
  }
  // Fixed option order = descending count across ALL respondents (as in the workbook), so
  // every language view lists the same options in the same order.
  var optionOrder = {};
  QUESTIONS.forEach(function (q) {
    var t = tally(R, q.key).counts;
    optionOrder[q.key] = Object.keys(t).sort(function (a, b) { return t[b] - t[a] || a.localeCompare(b); });
  });

  // ---- rendering ------------------------------------------------------------
  function qnote(q, answered, total) {
    if (q.note) return q.note + " " + (function () { var m = 0; R.forEach(function (r) { m += r.languages.length; }); return m; })() + " mentions from " + total + " responses.";
    return "Question: " + q.q + ". " + answered + " of " + total + " respondents answered. Multi-select, each option counted.";
  }

  function overviewCard(q, rows, isAll) {
    var t = tally(rows, q.key), total = rows.length, max = 0;
    var opts = optionOrder[q.key];
    opts.forEach(function (o) { max = Math.max(max, t.counts[o] || 0); });
    var note = q.noFilter && !isAll ? "Languages named by the selected respondents (they may also speak others)." : qnote(q, t.answered, total);
    var body = opts.map(function (o) {
      var c = t.counts[o] || 0;
      if (q.noFilter && !isAll && !c) return "";
      var w = max ? Math.round(c / max * 100) : 0;
      var pct = t.answered ? Math.round(c / t.answered * 100) : 0;
      return "<tr><td>" + esc(fix(o)) + '</td><td class="barcell"><div class="bar" style="width:' + w + '%" role="presentation"></div></td>' +
        '<td class="num"><strong>' + c + '</strong> <span class="pct">(' + pct + "%)</span></td></tr>";
    }).join("");
    return '<section class="card' + (q.wide ? " wide" : "") + '"><h2>' + esc(q.title) + '</h2><p class="qnote">' + esc(note) + "</p>" +
      '<div class="tablewrap"><table><thead><tr><th scope="col">Option</th><th scope="col"><span class="sr" hidden>Bar</span></th><th scope="col" class="num">Count</th></tr></thead><tbody>' +
      (t.answered ? body : '<tr><td colspan="3" class="empty">No respondents in this group answered this question.</td></tr>') + "</tbody></table></div></section>";
  }

  function renderOverview() {
    var rows = subset(state.lang), isAll = state.lang === "All";
    var st = isAll ? "Showing all <strong>" + rows.length + "</strong> responses."
      : "Showing <strong>" + rows.length + "</strong> respondent" + (rows.length === 1 ? "" : "s") + " who speak <strong>" + esc(state.lang) + "</strong> at home" +
        " (" + Math.round(rows.length / R.length * 100) + "% of " + R.length + "). Percentages are of those in this group who answered each question.";
    $("status").innerHTML = st;
    var html = (!isAll && rows.length < 10 ? '<p class="warn">Small group (n = ' + rows.length + "): treat these percentages as indicative only.</p>" : "") +
      '<div class="grid">' + QUESTIONS.filter(function (q) { return !(q.noFilter && isAll === false && false); }).map(function (q) { return overviewCard(q, rows, isAll); }).join("") + "</div>";
    $("content").innerHTML = html;
  }

  function compareCard(q) {
    var groups = [{ name: "All", rows: R }].concat(compareLangs.map(function (l) { return { name: l, rows: subset(l) }; }));
    groups.forEach(function (g) { g.t = tally(g.rows, q.key); });
    var head = groups.map(function (g) { return '<th scope="col" class="num">' + esc(g.name) + '<br><span class="pct">n=' + g.t.answered + "</span></th>"; }).join("");
    var body = optionOrder[q.key].map(function (o) {
      return "<tr><td>" + esc(fix(o)) + "</td>" + groups.map(function (g) {
        var c = g.t.counts[o] || 0, p = g.t.answered ? Math.round(c / g.t.answered * 100) : 0;
        return '<td class="num' + (c ? "" : " lowcell") + '">' + c + ' <span class="pct">(' + p + "%)</span></td>";
      }).join("") + "</tr>";
    }).join("");
    return '<section class="card wide"><h2>' + esc(q.title) + '</h2><p class="qnote">Counts and % of respondents in each group who answered (n shown in header).</p>' +
      '<div class="tablewrap"><table><thead><tr><th scope="col">Option</th>' + head + "</tr></thead><tbody>" + body + "</tbody></table></div></section>";
  }

  function renderCompare() {
    $("status").innerHTML = "Comparing the " + compareLangs.length + " language groups with at least " + COMPARE_MIN + " respondents (" + compareLangs.map(esc).join(", ") +
      "). Other languages are in the Overview filter. Groups overlap when a respondent names more than one language.";
    $("content").innerHTML = '<p class="warn">Group sizes are small (e.g. Macedonian n = ' + langCounts["Macedonian"] + "); differences between groups are indicative, not statistically conclusive.</p>" +
      '<div class="grid">' + QUESTIONS.filter(function (q) { return !q.noFilter; }).map(compareCard).join("") + "</div>";
  }

  function renderThemes() {
    var rows = state.view === "compare" ? R : subset(state.lang), ids = {};
    rows.forEach(function (r) { ids[r.id] = r; });
    var filtered = state.view === "overview" && state.lang !== "All";
    var html = '<h2 id="themes-h">Free-text themes</h2><p class="small">' + esc(S.themesIntro || "") + "</p>" +
      (filtered ? '<p class="small">Themes are written across all respondents; only quotes from ' + esc(state.lang) + "-speaking respondents are shown below.</p>" : "");
    S.themes.forEach(function (th) {
      var qs = th.quotes.filter(function (q) { return ids[q.id]; });
      html += '<article class="theme"><h3>' + esc(th.title) + '</h3><p class="sum">' + esc(th.summary) + "</p>" +
        (qs.length ? qs.map(function (q) {
          return "<blockquote><p>“" + esc(q.text) + "”</p><footer>Response Id " + q.id + " · " + esc(q.field) + (filtered ? "" : " · " + esc(ids[q.id].languages.join(", "))) + "</footer></blockquote>";
        }).join("") : '<p class="empty">No quoted responses from this language group.</p>') + "</article>";
    });
    $("themes").innerHTML = html;
  }

  function renderChips() {
    var all = [{ name: "All", n: R.length }].concat(languages.map(function (l) { return { name: l, n: langCounts[l] }; }));
    $("chips").innerHTML = all.map(function (c) {
      return '<button type="button" class="chip" data-lang="' + esc(c.name) + '" aria-pressed="' + (state.lang === c.name) + '">' + esc(c.name) + '<span class="n">' + c.n + "</span></button>";
    }).join("");
  }

  function render() {
    document.querySelectorAll(".viewswitch button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.view === state.view); });
    $("filterbar").hidden = state.view === "compare";
    if (state.view === "compare") renderCompare(); else { renderChips(); renderOverview(); }
    renderThemes();
    var hash = state.view === "compare" ? "compare" : (state.lang === "All" ? "" : state.lang);
    try { history.replaceState(null, "", hash ? "#" + encodeURIComponent(hash) : location.pathname + location.search); } catch (e) {}
  }

  // ---- init -----------------------------------------------------------------
  $("note").textContent = S.meta.note;
  $("source").textContent = S.meta.source;
  document.addEventListener("click", function (e) {
    var v = e.target.closest(".viewswitch button"), c = e.target.closest(".chip");
    if (v) { state.view = v.dataset.view; render(); }
    else if (c) { state.lang = c.dataset.lang; render(); var b = document.querySelector('.chip[data-lang="' + c.dataset.lang.replace(/"/g, '\\"') + '"]'); if (b) b.focus(); }
  });
  render();
})();
