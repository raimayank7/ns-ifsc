/* ifsc.niveshsahayak.in: code checker, bank search, page filters, tap-to-copy. Everything runs in the browser. */
(function () {
  'use strict';
  var d = document, N = window.NSL, esc = N.esc, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  var index = null;
  function getIndex() { return index || (index = N.json('/data/index.json')); }

  /* tap an IFSC code in a table to copy it */
  d.addEventListener('click', function (e) {
    var td = e.target.closest('[data-ifsc-table] td.mono');
    if (td) N.copy(td.textContent.trim(), td.textContent.trim() + ' copied');
  });
  $$('[data-ifsc-table] td.mono').slice(0, 400).forEach(function (td) { td.title = 'Tap to copy'; });
  var st = d.createElement('style'); st.textContent = '[data-ifsc-table] td.mono{cursor:pointer;color:var(--link);font-weight:500}'; d.head.appendChild(st);

  /* filter the branch rows of this page */
  var flt = $('[data-filter]');
  if (flt) {
    var rows = $$('[data-ifsc-table] tbody tr'), text = null, note = $('[data-filter-n]'), first = note ? note.textContent : '';
    flt.addEventListener('input', function () {
      if (!text) text = rows.map(function (r) { return r.textContent.toLowerCase(); });
      var words = flt.value.toLowerCase().split(/\s+/).filter(Boolean), n = 0;
      rows.forEach(function (r, i) { var ok = words.every(function (w) { return text[i].indexOf(w) > -1; }); r.hidden = !ok; if (ok) n++; });
      $$('[data-ifsc-groups] h2').forEach(function (h) {
        var box = h.nextElementSibling, any = box && $$('tbody tr', box).some(function (r) { return !r.hidden; });
        h.hidden = !any; if (box) box.hidden = !any;
      });
      if (note) note.textContent = words.length ? (n ? n + (n === 1 ? ' branch matches.' : ' branches match.') + ' Tap a code to copy it.' : 'No branch on this page matches. Check the spelling, or try fewer letters.') : first;
    });
  }
  /* filter a list of links (banks, places) */
  $$('[data-list-filter]').forEach(function (inp) {
    var items = null;
    inp.addEventListener('input', function () {
      if (!items) items = $$(inp.getAttribute('data-list-filter')).reduce(function (a, ul) { return a.concat($$('li', ul)); }, []).map(function (li) { return [li, li.textContent.toLowerCase()]; });
      var words = inp.value.toLowerCase().split(/\s+/).filter(Boolean);
      items.forEach(function (x) { x[0].hidden = !words.every(function (w) { return x[1].indexOf(w) > -1; }); });
      $$('[data-banks]').forEach(function (ul) { var any = $$('li', ul).some(function (li) { return !li.hidden; }); ul.hidden = !any; if (ul.previousElementSibling) ul.previousElementSibling.hidden = !any; });
    });
  });

  /* bank search on the home page */
  var bq = $('[data-bank-search]'), bout = $('[data-bank-out]');
  if (bq) {
    var run = function () {
      var words = bq.value.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.length) { bout.hidden = true; return; }
      getIndex().then(function (ix) {
        var hits = ix.banks.filter(function (b) { var n = b[0].toLowerCase(); return words.every(function (w) { return n.indexOf(w) > -1; }); })
          .sort(function (a, b) { return b[2] - a[2]; }).slice(0, 12);
        bout.innerHTML = hits.length ? hits.map(function (b) { return '<li><a href="/bank/' + b[1] + '/">' + esc(b[0]) + ' <small>' + b[2].toLocaleString('en-IN') + (b[2] === 1 ? ' branch' : ' branches') + '</small></a></li>'; }).join('')
          : '<li>No bank with that name. Try fewer letters, or see <a href="/banks/">all banks</a>.</li>';
        bout.hidden = false;
      }).catch(function () { bout.innerHTML = '<li>The bank list did not load. Check your connection and try again.</li>'; bout.hidden = false; });
    };
    bq.addEventListener('input', run);
    bq.addEventListener('focus', function () { getIndex().catch(function () {}); }, { once: true });
  }

  /* IFSC checker */
  var form = $('[data-ifsc-form]'), out = $('[data-ifsc-out]');
  function say(html) { out.innerHTML = '<div class="result rise">' + html + '</div>'; }
  function check(raw, quiet) {
    var code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) { if (!quiet) say('<h2>Type a code first</h2><p>An IFSC code has 11 characters, for example SBIN0000691.</p>'); return; }
    if (code.length === 11 && code.charAt(4) === 'O') code = code.slice(0, 4) + '0' + code.slice(5);   // letter O typed for the zero
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      var why = code.length !== 11 ? 'It has ' + code.length + ' characters; an IFSC code has exactly 11.' : !/^[A-Z]{4}/.test(code) ? 'The first 4 characters must be letters (the bank).' : 'The 5th character must be the digit zero.';
      say('<h2>This is not a valid IFSC code</h2><p class="big">' + esc(code) + '</p><p>' + why + '</p>'); return;
    }
    out.innerHTML = '<div class="shim" style="height:150px;margin-top:14px"></div>';
    getIndex().then(function (ix) {
      var bank4 = code.slice(0, 4), part = ix.parts[bank4];
      if (part == null) { say('<h2>No bank uses the code ' + esc(bank4) + '</h2><p class="big">' + esc(code) + '</p><p>The first four letters do not belong to any bank in our list (data as of ' + esc(ix.asof) + '). Check the letters with the person who gave you the code.</p>'); return; }
      return N.json('/data/' + bank4 + (part ? '-' + (code.slice(4).split('').reduce(function (n, c) { return n + c.charCodeAt(0); }, 0) % part) : '') + '.json').then(function (j) {
        var r = j[code.slice(4)];
        if (!r) { say('<h2>Branch not found</h2><p class="big">' + esc(code) + '</p><p>The bank code ' + esc(bank4) + ' exists, but no branch has this exact code in our list (data as of ' + esc(ix.asof) + '). It may be mistyped, very new, or closed after a merger. Check it on the cheque book or with the bank.</p>'); return; }
        var b = ix.banks[r[0]], s = ix.states[r[3]] || ['', ''], f = r[8];
        if (r[2] && r[1].toLowerCase().indexOf(r[2].toLowerCase()) > -1) r[2] = '';   // the place is already in the branch name
        var tag = function (on, name) { return '<span class="tag ' + (on ? 'yes' : 'no') + '">' + name + '</span>'; };
        var line = b[0] + ', ' + r[1] + ' branch' + (r[2] ? ', ' + r[2] : '') + ': IFSC ' + code + (r[5] ? ', MICR ' + r[5] : '');
        say('<h2>' + esc(b[0]) + '</h2><p class="big">' + code + '</p><p><b>' + esc(r[1]) + '</b>' + (r[2] ? ', ' + esc(r[2]) : '') + (s[0] ? ', ' + esc(s[0]) : '') + '</p>' +
          '<dl class="facts"><dt>Address</dt><dd>' + esc(r[4] || 'Not given') + '</dd><dt>MICR code</dt><dd>' + esc(r[5] || 'None for this branch') + '</dd>' +
          (r[6] ? '<dt>Phone</dt><dd>' + esc(r[6]) + '</dd>' : '') + (r[7] ? '<dt>SWIFT code</dt><dd>' + esc(r[7]) + '</dd>' : '') + '</dl>' +
          '<div class="tags">' + tag(f & 1, 'NEFT') + tag(f & 2, 'RTGS') + tag(f & 4, 'IMPS') + (f & 8 ? tag(1, 'UPI') : '') + '</div>' +
          '<div class="acts"><button class="btn" type="button" data-copy="' + code + '" data-done="' + code + ' copied">Copy code</button>' +
          '<button class="btn ghost" type="button" data-share="' + esc(line) + '" data-url="https://ifsc.niveshsahayak.in/?ifsc=' + code + '">Share</button>' +
          (s[1] ? '<a class="btn ghost" href="/bank/' + b[1] + '/' + s[1] + '/">More ' + esc(b[0]) + ' branches</a>' : '') + '</div>' +
          '<p class="hint">Data as of ' + esc(ix.asof) + '. Confirm the code and account number before a large payment.</p>');
        N.recent('nsl-ifsc', { u: code, t: b[0] + ', ' + r[1] });
        recent();
        try { history.replaceState(null, '', location.pathname + '?ifsc=' + code + '#check'); } catch (e) {}
      });
    }).catch(function () { say('<h2>The data did not load</h2><p>Check your internet connection and press Check code again.</p>'); });
  }
  function recent() {
    var box = $('[data-recent]'), list = N.recent('nsl-ifsc');
    if (!box || !list.length) return;
    box.innerHTML = '<p class="hint">Codes you checked lately (kept only in this browser): ' + list.map(function (x) { return '<a href="/?ifsc=' + esc(x.u) + '#check" title="' + esc(x.t) + '" class="mono">' + esc(x.u) + '</a>'; }).join(' · ') + '</p>';
  }
  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); check(form.ifsc.value); });
    var m = /[?&]ifsc=([A-Za-z0-9]{11})/.exec(location.search);
    if (m) { form.ifsc.value = m[1].toUpperCase(); check(m[1], true); }
    recent();
  }
})();
