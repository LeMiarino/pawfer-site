// Pawfer site: the hero clicker, lazy Lottie players, scroll reveals and program filters.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('js-motion');
  const hasLottie = typeof window.lottie !== 'undefined';

  function play(el, path, opts) {
    if (!hasLottie || !el) return null;
    const anim = lottie.loadAnimation(Object.assign({
      container: el, renderer: 'svg', loop: true, autoplay: !reduce, path,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    }, opts));
    if (reduce) anim.addEventListener('DOMLoaded', () => anim.goToAndStop(Math.floor(anim.totalFrames / 2), true));
    return anim;
  }

  /* ---------- Hero clicker ---------- */
  if (document.getElementById('clicker')) hero();
  function hero() {
  const GOAL = 5;
  const C = 2 * Math.PI * 110;
  const $ = (id) => document.getElementById(id);
  const btn = $('clicker'), wrap = $('clicker-wrap'), arc = $('arc'), nEl = $('n'), countEl = $('count');
  const bubble = $('bubble'), again = $('again'), mute = $('mute'), ripple = $('ripple');
  const rays = document.querySelector('.rays');
  const lines = [
    'Max is ready. Give the clicker a tap.',
    'Click! That sound means “yes, that!”',
    'In real life, a treat follows every click.',
    'Perfect timing. He’s getting it.',
    'One more for the goal!',
    'Goal reached! You two make a great team.',
  ];
  const past = ['Still going? He loves this.', 'Good dog. Good human.', 'That’s a lot of treats.'];

  const max = {
    sit: play($('max-sit'), 'lottie/max-sit.json'),
    happy: play($('max-happy'), 'lottie/max-happy.json', { loop: false, autoplay: false }),
    tilt: play($('max-tilt'), 'lottie/max-tilt.json', { loop: false, autoplay: false }),
  };
  const paws = play($('fx-paws'), 'lottie/fx-paws.json', { loop: false, autoplay: false });
  const confetti = play($('fx-confetti'), 'lottie/fx-confetti.json', { loop: false, autoplay: false });
  let pose = 'sit';
  function show(name) {
    if (pose === name) return;
    pose = name;
    for (const k of ['sit', 'happy', 'tilt']) $('max-' + k).classList.toggle('on', k === name);
  }
  if (max.happy) max.happy.addEventListener('complete', () => { if (count < GOAL) show('sit'); else max.happy.goToAndPlay(0, true); });
  if (confetti) confetti.addEventListener('complete', () => $('fx-confetti').classList.remove('on'));
  if (max.tilt) max.tilt.addEventListener('complete', () => show('sit'));

  // Sound: decode once, start a new buffer source per click so fast taps never drop.
  let ctx = null, buf = null, raw = null, muted = false;
  fetch('sounds/click.wav').then((r) => r.arrayBuffer()).then((b) => { raw = b; }).catch(() => {});
  function click() {
    if (muted) return;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const fire = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(); };
      if (buf) fire();
      else if (raw) ctx.decodeAudioData(raw.slice(0), (d) => { buf = d; fire(); });
    } catch (e) { /* audio is a bonus */ }
  }

  let count = 0, idle = null;
  function say(text) {
    bubble.textContent = text;
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop');
  }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function render() {
    nEl.textContent = count;
    arc.style.strokeDashoffset = String(C * (1 - Math.min(count, GOAL) / GOAL));
    wrap.classList.toggle('done', count >= GOAL);
    again.hidden = count < GOAL;
  }
  function armIdle() {
    clearTimeout(idle);
    idle = setTimeout(() => { if (pose === 'sit' && max.tilt && !reduce) { show('tilt'); max.tilt.goToAndPlay(0, true); } armIdle(); }, 7000);
  }

  function press() {
    click();
    if (navigator.vibrate) navigator.vibrate(8);
    btn.classList.add('down');
    count += 1;
    render();
    if (!reduce) {
      restart(ripple, 'go');
      restart(countEl, 'bump');
      restart(rays, 'flash');
      if (paws) paws.goToAndPlay(0, true);
      if (max.happy) { show('happy'); max.happy.goToAndPlay(0, true); }
    }
    if (count === GOAL) {
      say(lines[GOAL]);
      if (confetti && !reduce) { $('fx-confetti').classList.add('on'); confetti.goToAndPlay(0, true); }
    } else if (count < GOAL) say(lines[count]);
    else if (count % 4 === 0) say(past[(count / 4) % past.length | 0]);
    armIdle();
  }
  const release = () => btn.classList.remove('down');

  btn.addEventListener('pointerdown', (e) => { if (e.button === 0) { e.preventDefault(); press(); } });
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointerleave', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); }
  });
  btn.addEventListener('keyup', release);
  btn.addEventListener('click', (e) => e.preventDefault());

  again.addEventListener('click', () => {
    count = 0; render(); show('sit'); say(lines[0]); btn.focus();
  });
  mute.addEventListener('click', () => {
    muted = !muted;
    mute.setAttribute('aria-pressed', String(muted));
    mute.textContent = muted ? 'Sound off' : 'Sound on';
  });
  render();
  armIdle();
  }

  /* ---------- Legal pages: highlight the section in view ---------- */
  // The last few sections can't scroll up to the top of the window, so a clicked
  // (or linked) section stays highlighted until the reader scrolls on their own.
  const tocLinks = [...document.querySelectorAll('.toc a')];
  const heads = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  if (heads.length) {
    let pinned = null;
    const mark = (h) => tocLinks.forEach((a) => {
      const on = a.hash === '#' + h.id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    const update = () => {
      if (pinned) return mark(pinned);
      // A heading counts as reached once it passes a line 30% down the window. Over the
      // last screenful of scroll the line slides to the bottom, so the closing sections
      // each get their turn and the last one is active at the very end.
      const vh = innerHeight;
      const left = document.documentElement.scrollHeight - vh - scrollY;
      const line = vh * 0.3 + vh * 0.7 * Math.min(1, Math.max(0, 1 - left / vh));
      let cur = heads[0];
      for (const h of heads) if (h.getBoundingClientRect().top <= line) cur = h;
      mark(cur);
    };
    const pinTo = (id) => {
      const h = heads.find((x) => x.id === id);
      if (h) { pinned = h; mark(h); }
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; update(); });
    };
    const unpin = () => { if (pinned) { pinned = null; onScroll(); } };
    tocLinks.forEach((a) => a.addEventListener('click', () => pinTo(decodeURIComponent(a.hash.slice(1)))));
    addEventListener('hashchange', () => pinTo(decodeURIComponent(location.hash.slice(1))));
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    addEventListener('wheel', unpin, { passive: true });
    addEventListener('touchmove', unpin, { passive: true });
    addEventListener('mousedown', (e) => { if (e.target === document.documentElement) unpin(); });
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) unpin();
    });
    if (location.hash) pinTo(decodeURIComponent(location.hash.slice(1)));
    update();
  }

  /* ---------- Program day dots and filters ---------- */
  document.querySelectorAll('.days').forEach((d) => {
    const n = +d.dataset.days;
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<i></i>'.repeat(n);
  });
  const chips = document.querySelectorAll('.filters button');
  chips.forEach((b) => b.addEventListener('click', () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    const f = b.dataset.f;
    document.querySelectorAll('#program-list > .prog').forEach((p) => { p.hidden = f !== 'all' && p.dataset.cat !== f; });
  }));

  /* ---------- Lazy Lotties and reveals ---------- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      if (el.dataset.lottie) { play(el, el.dataset.lottie); delete el.dataset.lottie; }
      if (el.hasAttribute('data-reveal')) el.classList.add('in');
      io.unobserve(el);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-lottie], [data-reveal]').forEach((el) => io.observe(el));
})();
