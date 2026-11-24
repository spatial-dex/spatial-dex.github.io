// Real-robot clips, comparison clips and the summary video get custom controls; the rest are
// plain looping clips. The summary video has audio and does not autoplay.
var CONTROLLED = '.var-grid .clip, .cmp-grid .clip, .player.clip';

function loadClip(v) {
  if (!v.src && v.dataset.src) v.src = v.dataset.src;
}

// Real-world task bar: jump links pinned while the tasks are on screen; the task
// under the bar is highlighted. After a click, wait for the scroll to settle.
(function () {
  var nav = document.querySelector('.task-nav');
  if (!nav) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
  var tasks = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var current = -1, ticking = false, lock = false, idle = 0;

  function mark(i) {
    if (i === current) return;
    current = i;
    links.forEach(function (a, j) {
      if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    var a = links[i];
    nav.scrollTo({ left: a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' });
  }
  function update() {
    ticking = false;
    var line = nav.getBoundingClientRect().bottom + 40, i = 0;
    tasks.forEach(function (t, j) { if (t.getBoundingClientRect().top <= line) i = j; });
    mark(i);
  }
  function release(ms) {
    clearTimeout(idle);
    idle = setTimeout(function () { lock = false; update(); }, ms);
  }

  window.addEventListener('scroll', function () {
    if (lock) return release(150);
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  links.forEach(function (a, i) {
    a.addEventListener('click', function () { mark(i); lock = true; release(1000); });
  });
  update();
})();

// Lazy-load muted clips and play them only while on screen.
// A clip the viewer paused (data-hold) stays paused when it scrolls back into view.
(function () {
  var clips = document.querySelectorAll('video.lazy');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    clips.forEach(function (v) {
      loadClip(v);
      if (!reduceMotion) v.play().catch(function () {});
      else if (!v.closest(CONTROLLED)) v.controls = true;
    });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        loadClip(v);
        if (!v.dataset.hold) v.play().catch(function () {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { rootMargin: '200px 0px', threshold: 0.15 });

  clips.forEach(function (v) { io.observe(v); });
})();

// Play/pause, seek bar, time and full screen. A clip marked data-audio also gets a mute button
// and a large play button until it is first played.
(function () {
  var ICON_PLAY = '<svg class="i-play" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
  var ICON_PAUSE = '<svg class="i-pause" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
  var ICON_FS = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';

  var ICON_VOL = '<svg class="i-vol" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/></svg>';
  var ICON_MUTED = '<svg class="i-muted" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';

  function fmt(t) {
    t = Math.max(0, Math.floor(t || 0));
    var s = t % 60;
    return Math.floor(t / 60) + ':' + (s < 10 ? '0' : '') + s;
  }

  document.querySelectorAll(CONTROLLED).forEach(function (clip) {
    var v = clip.querySelector('video');
    if (!v) return;
    clip.classList.add('ctl', 'paused');

    var bar = document.createElement('div');
    bar.className = 'vc';
    bar.innerHTML =
      '<button type="button" class="vc-play" aria-label="Play">' + ICON_PLAY + ICON_PAUSE + '</button>' +
      '<input class="vc-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek">' +
      '<span class="vc-time">0:00 / 0:00</span>' +
      '<button type="button" class="vc-fs" aria-label="Full screen">' + ICON_FS + '</button>';
    clip.appendChild(bar);

    if (clip.hasAttribute('data-audio')) {
      var mute = document.createElement('button');
      mute.type = 'button';
      mute.className = 'vc-mute';
      mute.setAttribute('aria-label', 'Mute');
      mute.innerHTML = ICON_VOL + ICON_MUTED;
      bar.insertBefore(mute, bar.querySelector('.vc-fs'));
      mute.addEventListener('click', function () {
        v.muted = !v.muted;
        clip.classList.toggle('muted', v.muted);
        mute.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute');
      });
      var big = document.createElement('button');
      big.type = 'button';
      big.className = 'vc-big';
      big.setAttribute('aria-label', 'Play video');
      big.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
      clip.appendChild(big);
      big.addEventListener('click', function () { toggle(); });
    }

    var btn = bar.querySelector('.vc-play');
    var seek = bar.querySelector('.vc-seek');
    var time = bar.querySelector('.vc-time');
    var dragging = false, raf = 0;

    function sync() {
      var d = v.duration;
      if (!isFinite(d) || d <= 0) return;
      var p = v.currentTime / d;
      if (!dragging) seek.value = Math.round(p * 1000);
      seek.style.setProperty('--p', (seek.value / 10) + '%');
      time.textContent = fmt(v.currentTime) + ' / ' + fmt(d);
      seek.setAttribute('aria-valuetext', time.textContent);
    }
    function tick() {
      sync();
      if (!v.paused) raf = requestAnimationFrame(tick);
    }
    function toggle() {
      loadClip(v);
      if (v.paused) {
        delete v.dataset.hold;
        v.play().catch(function () {});
      } else {
        v.dataset.hold = '1';
        v.pause();
      }
    }

    v.addEventListener('play', function () {
      clip.classList.remove('paused');
      clip.classList.add('started');
      btn.setAttribute('aria-label', 'Pause');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    });
    v.addEventListener('pause', function () {
      clip.classList.add('paused');
      btn.setAttribute('aria-label', 'Play');
      cancelAnimationFrame(raf);
      sync();
    });
    v.addEventListener('loadedmetadata', sync);
    v.addEventListener('seeked', sync);

    btn.addEventListener('click', toggle);
    v.addEventListener('click', toggle);

    seek.addEventListener('pointerdown', function () { dragging = true; });
    seek.addEventListener('input', function () {
      loadClip(v);
      var d = v.duration;
      seek.style.setProperty('--p', (seek.value / 10) + '%');
      if (isFinite(d) && d > 0) {
        v.currentTime = seek.value / 1000 * d;
        time.textContent = fmt(v.currentTime) + ' / ' + fmt(d);
      }
    });
    seek.addEventListener('change', function () { dragging = false; sync(); });
    seek.addEventListener('pointerup', function () { dragging = false; });

    bar.querySelector('.vc-fs').addEventListener('click', function () {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else if (clip.requestFullscreen) {
        clip.requestFullscreen().catch(function () {});
      } else if (clip.webkitRequestFullscreen) {
        clip.webkitRequestFullscreen();
      } else if (v.webkitEnterFullscreen) {
        loadClip(v);
        v.webkitEnterFullscreen();
      }
    });
  });
})();

// Bar chart hover. Each .bars[data-tasks] lists its task names ("A|B|C") and each row's data-v
// holds the per-task values. The SpatialDex row shows its per-task values. Any other row shows
// a bracket spanning the gap to the SpatialDex bar and a side-by-side per-task comparison.
(function () {
  var tip = document.getElementById('bar-tip');
  var rows = document.querySelectorAll('.bars[data-tasks] .bar-row');
  if (!tip || !rows.length) return;
  var gap = document.createElement('div');
  gap.className = 'bar-gap';
  gap.setAttribute('aria-hidden', 'true');
  gap.innerHTML = '<span></span>';
  var active = null;

  function nums(row) { return row.dataset.v.split(',').map(Number); }
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function name(row) { return row.querySelector('.name').innerHTML; }
  function shown(row) { return row.querySelector('.val').textContent; }

  function fill(row) {
    var chart = row.closest('.bars');
    var tasks = chart.dataset.tasks.split('|');
    var ours = chart.querySelector('.bar-row.ours');
    var vals = row.dataset.v.split(',');
    var html;
    if (!ours || row === ours) {
      html = '<div class="cmp-head"><span>' + name(row) + '</span></div>' +
        '<div class="cmp-score"><em>Mean</em><span>' + shown(row) + '</span></div>';
      tasks.forEach(function (t, i) {
        html += '<div class="cmp-row"><div class="cmp-num"><em>' + t + '</em><span>' + vals[i] + '</span></div>' +
          '<div class="cmp-bars"><i><b style="width:' + Number(vals[i]) + '%"></b></i></div></div>';
      });
      tip.classList.remove('is-vs');
      tip.classList.add('is-solo');
    } else {
      var ov = ours.dataset.v.split(',');
      html = '<div class="cmp-head"><span>' + name(row) + '</span><span>' + name(ours) + '</span></div>' +
        '<div class="cmp-score"><span>' + shown(row) + '</span><em>Mean</em><span>' + shown(ours) + '</span></div>';
      tasks.forEach(function (t, i) {
        var x = Number(vals[i]), y = Number(ov[i]);
        html += '<div class="cmp-row"><div class="cmp-num">' +
          '<span' + (x > y ? ' class="win"' : '') + '>' + vals[i] + '</span><em>' + t + '</em>' +
          '<span' + (y >= x ? ' class="win"' : '') + '>' + ov[i] + '</span></div>' +
          '<div class="cmp-bars"><i><b style="width:' + x + '%"></b></i><i><b style="width:' + y + '%"></b></i></div></div>';
      });
      tip.classList.add('is-vs');
      tip.classList.remove('is-solo');
    }
    tip.innerHTML = html;
  }
  function bracket(row) {
    var ours = row.closest('.bars').querySelector('.bar-row.ours');
    if (!ours || row === ours) return;
    var x = mean(nums(row)), y = mean(nums(ours));
    if (y - x < 0.05) return;
    gap.style.left = x + '%';
    gap.style.width = (y - x) + '%';
    gap.firstChild.textContent = '+' + (y - x).toFixed(1);
    row.querySelector('.track').appendChild(gap);
    row.classList.add('is-vs');
    active = row;
  }
  // The panel sits just below the hovered row so it never covers that bar or its bracket. It
  // goes above the row only when there is no room below in the window.
  function place(row, x) {
    var w = tip.offsetWidth, h = tip.offsetHeight, r = row.getBoundingClientRect();
    var left = Math.max(8, Math.min(x - w / 2, window.innerWidth - w - 8));
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8 && r.top - h - 6 >= 8) top = r.top - h - 6;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function show(row) {
    clear();
    fill(row);
    bracket(row);
    tip.classList.add('show');
  }
  function clear() {
    if (active) active.classList.remove('is-vs');
    active = null;
    if (gap.parentNode) gap.parentNode.removeChild(gap);
  }
  function hide() { tip.classList.remove('show'); clear(); }

  rows.forEach(function (row) {
    row.addEventListener('mouseenter', function () { show(row); });
    row.addEventListener('mousemove', function (e) { place(row, e.clientX); });
    row.addEventListener('mouseleave', hide);
    row.addEventListener('focus', function () {
      show(row);
      var r = row.getBoundingClientRect();
      place(row, r.left + r.width * 0.6);
    });
    row.addEventListener('blur', hide);
  });
  window.addEventListener('scroll', hide, { passive: true });
})();

// Result tables: hovering a cell highlights its column, draws a bar behind each value in it, and
// marks the SpatialDex value (--o) with a dotted line down the column.
(function () {
  var tables = Array.prototype.filter.call(document.querySelectorAll('table.res'), function (t) {
    return t.querySelector('td.avg');
  });
  tables.forEach(function (table) {
    var head = table.tHead ? table.tHead.rows[table.tHead.rows.length - 1] : null;
    var body = Array.prototype.slice.call(table.tBodies[0].rows);
    var on = -1;
    body.forEach(function (row) {
      for (var i = 1; i < row.cells.length; i++) {
        var v = parseFloat(row.cells[i].textContent);
        if (isFinite(v)) row.cells[i].style.setProperty('--v', Math.max(0, Math.min(100, v)));
      }
    });
    var ours = table.querySelector('tbody tr.ours');
    if (ours) body.forEach(function (row) {
      for (var i = 1; i < row.cells.length; i++) {
        var o = ours.cells[i] && ours.cells[i].style.getPropertyValue('--v');
        if (o) row.cells[i].style.setProperty('--o', o);
      }
    });
    function set(i) {
      if (i === on) return;
      [head].concat(body).forEach(function (row) {
        if (!row) return;
        if (on > 0 && row.cells[on]) row.cells[on].classList.remove('col-on');
        if (i > 0 && row.cells[i]) row.cells[i].classList.add('col-on');
      });
      on = i;
    }
    table.addEventListener('mouseover', function (e) {
      var cell = e.target.closest('td, th');
      var row = cell && cell.parentNode;
      set(cell && (row === head || row.parentNode === table.tBodies[0]) ? cell.cellIndex : -1);
    });
    table.addEventListener('mouseleave', function () { set(-1); });
    table.classList.add('hov');

    // Equal-width value columns, so bars in different columns share one scale. The name column
    // keeps its natural width and the rest split what is left; the table scrolls if too narrow.
    function equalize() {
      if (!head) return;
      table.style.tableLayout = 'auto';
      table.style.width = 'auto';
      table.style.minWidth = '0';
      var first = Math.ceil(head.cells[0].getBoundingClientRect().width) + 1, col = 0;
      for (var i = 1; i < head.cells.length; i++) {
        col = Math.max(col, Math.ceil(head.cells[i].getBoundingClientRect().width) + 1);
      }
      table.tHead.rows[0].cells[0].style.width = first + 'px';
      table.style.minWidth = (first + col * (head.cells.length - 1)) + 'px';
      table.style.width = '';
      table.style.tableLayout = 'fixed';
    }
    equalize();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(equalize);
  });
})();

// Respect reduced-motion for the hero video.
(function () {
  var hero = document.querySelector('.hero-video');
  if (hero && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hero.removeAttribute('autoplay');
    hero.pause();
  }
})();

// BibTeX copy button: brief checkmark on success. Falls back to a selection copy
// where the async clipboard API is unavailable (e.g. file://).
(function () {
  var btn = document.querySelector('.bib-copy');
  var code = document.querySelector('pre.bibtex code');
  if (!btn || !code) return;
  var timer = 0;

  function done() {
    btn.classList.add('done');
    btn.setAttribute('aria-label', 'Copied');
    clearTimeout(timer);
    timer = setTimeout(function () {
      btn.classList.remove('done');
      btn.setAttribute('aria-label', 'Copy BibTeX');
    }, 1600);
  }
  function fallback() {
    var range = document.createRange(), sel = window.getSelection();
    range.selectNodeContents(code);
    sel.removeAllRanges();
    sel.addRange(range);
    try { if (document.execCommand('copy')) done(); } catch (e) {}
    sel.removeAllRanges();
  }

  btn.addEventListener('click', function () {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code.textContent).then(done, fallback);
    } else {
      fallback();
    }
  });
})();

// Reconstruction gallery: an interactive panel for the selected clip. The scene video drives the
// input video, the timer, the two instruction bars, and the tile progress bar. Each clip plays
// once, then the gallery moves to the next tile. Selecting a tile jumps to it. The gallery only
// runs while it is on screen, and it does not advance by itself under reduced motion. Dragging
// either instruction bar scrubs the clip, and playback continues from where the bar is released.
(function () {
  var root = document.getElementById('recon-gallery');
  if (!root) return;
  var main = root.querySelector('.rg-main'), side = root.querySelector('.rg-side');
  var timeEl = root.querySelector('.rg-time');
  var tiles = Array.prototype.slice.call(root.querySelectorAll('.rg-tile'));
  var bars = tiles.map(function (t) { return t.querySelector('.rg-bar'); });
  var hands = ['left', 'right'].map(function (h) {
    var el = root.querySelector('.rg-' + h);
    return { key: h, el: el, track: el.querySelector('.rg-track'), seg: el.querySelector('.rg-seg'), tick: el.querySelector('.rg-tick'), text: el.querySelector('.rg-text'), a: 0, b: 1 };
  });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PLAYS = 1, cur = -1, plays = 0, visible = false, tick = [0, 1], raf = 0, drag = false;
  // Bump VER when the clips are re-rendered, so browsers drop their cached copies.
  var V = 'assets/videos/data/clips/', P = 'assets/posters/data/clips/', VER = '?v=2';

  function nums(s) { return s.split(',').map(parseFloat); }
  function play() {
    [main, side].forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
  }
  function pause() { main.pause(); side.pause(); }
  function draw() {
    var d = main.duration || 0, t = main.currentTime || 0, f = d ? t / d : 0;
    var x = tick[0] + (tick[1] - tick[0]) * f;
    hands.forEach(function (h) {
      h.tick.style.left = (100 * x) + '%';
      h.el.classList.toggle('off', x < h.a - 0.004 || x > h.b + 0.004);
      h.track.setAttribute('aria-valuenow', Math.round(100 * f));
    });
    timeEl.textContent = t.toFixed(1) + ' s';
    if (cur >= 0) bars[cur].style.width = (100 * (plays + f) / PLAYS) + '%';
    if (!drag && !side.seeking && side.readyState > 1 && Math.abs(side.currentTime - t) > 0.12) side.currentTime = t;
    if (!drag && side.paused && !main.paused) { var p = side.play(); if (p && p.catch) p.catch(function () {}); }
  }
  function loop() { draw(); raf = main.paused ? 0 : requestAnimationFrame(loop); }
  function show(k) {
    var t = tiles[k], id = t.getAttribute('data-k');
    cur = k; plays = 0;
    tiles.forEach(function (el, i) {
      el.setAttribute('aria-selected', i === k ? 'true' : 'false');
      el.tabIndex = i === k ? 0 : -1;
      bars[i].style.width = '0';
    });
    tick = nums(t.getAttribute('data-tick'));
    hands.forEach(function (h) {
      var s = nums(t.getAttribute('data-' + h.key + '-seg'));
      h.a = s[0]; h.b = s[1];
      h.seg.style.left = (100 * s[0]) + '%'; h.seg.style.width = (100 * (s[1] - s[0])) + '%';
      h.text.textContent = t.getAttribute('data-' + h.key);
    });
    main.poster = P + 'scene_' + id + '.jpg' + VER; side.poster = P + 'input_' + id + '.jpg' + VER;
    main.src = V + 'scene_' + id + '.mp4' + VER; side.src = V + 'input_' + id + '.mp4' + VER;
    main.load(); side.load();
    draw();
    if (visible) play();
  }
  main.addEventListener('play', function () { if (!raf) raf = requestAnimationFrame(loop); });
  main.addEventListener('ended', function () {
    if (drag) return;
    plays++;
    if (reduce || plays < PLAYS) {
      if (plays >= PLAYS) plays = 0;
      main.currentTime = 0; side.currentTime = 0; play();
    } else show((cur + 1) % tiles.length);
  });
  // Scrubbing: the tick only travels the part of the bar that this clip covers.
  function seek(f) {
    var d = main.duration; if (!d) return;
    var t = Math.max(0, Math.min(d - 0.03, f * d));
    main.currentTime = t; side.currentTime = t;
  }
  function fromPointer(track, e) {
    var r = track.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    return (x - tick[0]) / (tick[1] - tick[0]);
  }
  ['seeked', 'timeupdate'].forEach(function (ev) { main.addEventListener(ev, function () { if (main.paused) draw(); }); });
  hands.forEach(function (h) {
    var tr = h.track;
    tr.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      drag = true; tr.classList.add('drag'); pause();
      try { tr.setPointerCapture(e.pointerId); } catch (err) {}
      seek(fromPointer(tr, e)); e.preventDefault();
    });
    tr.addEventListener('pointermove', function (e) { if (drag && tr.classList.contains('drag')) seek(fromPointer(tr, e)); });
    function end() {
      if (!tr.classList.contains('drag')) return;
      tr.classList.remove('drag'); drag = false;
      if (visible) play();
    }
    tr.addEventListener('pointerup', end); tr.addEventListener('pointercancel', end); tr.addEventListener('lostpointercapture', end);
    tr.addEventListener('keydown', function (e) {
      var step = e.key === 'ArrowRight' ? 0.2 : e.key === 'ArrowLeft' ? -0.2 : 0;
      if (!step || !main.duration) return;
      e.preventDefault(); seek((main.currentTime + step) / main.duration);
    });
  });
  tiles.forEach(function (t, i) {
    t.addEventListener('click', function () { show(i); });
    t.addEventListener('keydown', function (e) {
      var n = tiles.length, k = -1;
      if (e.key === 'ArrowRight') k = (i + 1) % n; else if (e.key === 'ArrowLeft') k = (i + n - 1) % n;
      if (k < 0) return;
      e.preventDefault(); show(k); tiles[k].focus();
    });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) { if (cur < 0) show(0); else play(); } else pause();
    }, { threshold: 0.15 }).observe(root);
  } else { visible = true; show(0); }
})();
