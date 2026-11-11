/* ifsc.niveshsahayak.in, App edition: the bank details checker of the Nivesh Sahayak App.
   Data is read from ifsc.shareyourgroup.com (one copy of the lists). ?data=<address> points it somewhere else for a local test. */
(function () {
  'use strict';
  var d = document, N = window.NSL, esc = N.esc, $ = function (s, r) { return (r || d).querySelector(s); };
  var m0 = /[?&]data=([^&#]+)/.exec(location.search);
  var BASE = m0 ? decodeURIComponent(m0[1]) : 'https://ifsc.shareyourgroup.com';
  var index = null, from = null;
  function getIndex() { return index || (index = N.json(BASE + '/data/index.json')); }
  var form = $('[data-ifsc-form]'), out = $('[data-ifsc-out]');
  if (!form) return;
  function say(html) { out.innerHTML = '<div class="result rise">' + html + '</div>'; }
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function oldCode(ix, code, otherwise) {
    var bank4 = code.slice(0, 4);
    if (!ix.old || !ix.old[bank4]) { otherwise(); return; }
    return N.json(BASE + '/data/old/' + bank4 + '.json').then(function (j) {
      var r = j[code.slice(4)];
      if (!r) { otherwise(); return; }
      var ev = r[0] >= 0 ? ix.ev[r[0]] : null, last = r[6] ? MON[+r[6].slice(5, 7) - 1] + ' ' + r[6].slice(0, 4) : '';
      var what, ask = '';
      if (ev && ev.k === 'merged') {
        what = esc(ev.old) + ' merged into ' + esc(ev.into) + (/^the /.test(ev.on) ? ' in ' : ' on ') + esc(ev.on) + '. ' + (ev.stop ? 'Its old IFSC codes stopped working on ' + esc(ev.stop) + '.' : 'This code is no longer in the list of the Reserve Bank.');
      } else if (ev) {
        what = esc(ev.how);
      } else {
        what = 'This code of ' + esc(r[1]) + ' is no longer in the list of the Reserve Bank. A bank takes a code out when it closes a branch, joins it with another branch or gives it a new code.';
      }
      if (r[7]) {
        ask = '<p class="ask"><b>' + (ev && ev.k === 'merged' ? 'Do you want the new IFSC code of this branch?' : 'A current branch has the same name in the same place. Do you want its code?') + '</b></p>' +
          '<div class="acts"><button class="btn" type="button" data-new="' + esc(r[7]) + '" data-old="' + code + '" data-why="' + (r[8] === 1 ? 'Worked out by the rule the bank published, and present in the current list.' : 'Matched by branch name and place: confirm it with the account holder.') + '">Yes, show the new code</button></div>';
      } else {
        ask = '<p>We could not match it to one current branch. Ask the account holder for the code on a new cheque book or passbook.</p>';
      }
      say('<p class="tags"><span class="tag no">Do not use: no longer in use</span></p><h2>' + esc(r[1]) + '</h2><p class="big" style="text-decoration:line-through">' + code + '</p>' +
        '<p><b>' + esc(r[2]) + '</b>' + (r[3] ? ', ' + esc(r[3]) : '') + '</p><p><b>What happened:</b> ' + what + '</p>' + ask +
        '<p class="hint">' + (last ? 'Last listed in ' + last + '. ' : '') + 'Old codes come from the lists published since ' + esc(ix.since || '2016') + '.</p>');
    });
  }

  function check(raw, quiet) {
    var code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) { if (!quiet) say('<h2>Type a code first</h2><p>An IFSC code has 11 characters, for example SBIN0000691.</p>'); return; }
    if (code.length === 11 && code.charAt(4) === 'O') code = code.slice(0, 4) + '0' + code.slice(5);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      var why = code.length !== 11 ? 'It has ' + code.length + ' characters; an IFSC code has exactly 11.' : !/^[A-Z]{4}/.test(code) ? 'The first 4 characters must be letters (the bank).' : 'The 5th character must be the digit zero.';
      say('<h2>This is not a valid IFSC code</h2><p class="big">' + esc(code) + '</p><p>' + why + '</p>'); return;
    }
    out.innerHTML = '<div class="shim" style="height:150px;margin-top:14px"></div>';
    getIndex().then(function (ix) {
      var bank4 = code.slice(0, 4), part = ix.parts[bank4];
      var none = function () { say('<h2>Not found</h2><p class="big">' + esc(code) + '</p><p>No bank branch has this code in the current list (data as of ' + esc(ix.asof) + ') or in the older lists. Check it with the account holder before you use it.</p>'); };
      if (part == null) return oldCode(ix, code, none);
      return N.json(BASE + '/data/' + bank4 + (part ? '-' + (code.slice(4).split('').reduce(function (n, c) { return n + c.charCodeAt(0); }, 0) % part) : '') + '.json').then(function (j) {
        var r = j[code.slice(4)];
        if (!r) return oldCode(ix, code, none);
        var b = ix.banks[r[0]], s = ix.states[r[3]] || ['', ''];
        var place = (r[2] && r[1].toLowerCase().indexOf(r[2].toLowerCase()) < 0 ? r[2] : '');
        var lines = 'Bank: ' + b[0] + '\nBranch: ' + r[1] + (place ? ', ' + place : '') + '\nIFSC: ' + code + (r[5] ? '\nMICR: ' + r[5] : '');
        var was = from && from.n === code ? '<p class="note">This code replaced the old code <b class="mono">' + esc(from.o) + '</b>. ' + esc(from.w) + '</p>' : '';
        from = null;
        say(was + '<p class="tags"><span class="tag yes">In the current list</span></p><h2>' + esc(b[0]) + '</h2><p class="big">' + code + '</p><p><b>' + esc(r[1]) + '</b>' + (place ? ', ' + esc(place) : '') + (s[0] ? ', ' + esc(s[0]) : '') + '</p>' +
          '<dl class="facts"><dt>Address</dt><dd>' + esc(r[4] || 'Not given') + '</dd><dt>MICR code</dt><dd>' + esc(r[5] || 'None for this branch') + '</dd>' + (r[7] ? '<dt>SWIFT code</dt><dd>' + esc(r[7]) + '</dd>' : '') + '</dl>' +
          '<div class="acts"><button class="btn" type="button" data-copy="' + esc(lines) + '" data-done="Bank details copied">Copy bank details</button>' +
          '<button class="btn ghost" type="button" data-copy="' + code + '" data-done="' + code + ' copied">Copy code only</button></div>' +
          '<p class="hint">Paste the details into your business or party bank details, then add the account number and account holder name yourself. Data as of ' + esc(ix.asof) + '.</p>');
        N.recent('nsl-ifsc', { u: code, t: b[0] + ', ' + r[1] });
        recent();
      });
    }).catch(function () { say('<h2>The data did not load</h2><p>Check your internet connection and press Check again.</p>'); });
  }
  function recent() {
    var box = $('[data-recent]'), list = N.recent('nsl-ifsc');
    if (!box || !list.length) return;
    box.innerHTML = '<p class="hint">Checked lately (kept only in this browser): ' + list.map(function (x) { return '<a href="#" data-again="' + esc(x.u) + '" title="' + esc(x.t) + '" class="mono">' + esc(x.u) + '</a>'; }).join(' · ') + '</p>';
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-new],[data-again]');
    if (!b) return;
    e.preventDefault();
    if (b.hasAttribute('data-new')) from = { n: b.getAttribute('data-new'), o: b.getAttribute('data-old'), w: b.getAttribute('data-why') };
    var c = b.getAttribute('data-new') || b.getAttribute('data-again');
    form.ifsc.value = c; check(c);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); check(form.ifsc.value); });
  var m = /[?&]ifsc=([A-Za-z0-9]{11})/.exec(location.search);
  if (m) { form.ifsc.value = m[1].toUpperCase(); check(m[1], true); }
  recent();
})();
