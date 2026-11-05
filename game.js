(() => {
  'use strict';

  // ============================================================
  //  設定
  // ============================================================
  const CONFIG = {
    gameLength: 150,      // 営業時間（秒）
    maxHearts: 3,         // 評判（0 になると閉店）
    slots: 9,             // 鍋の仕切りの数（3x3）
    stackMax: 3,          // 1 つの仕切りに重なる具の最大数
    seats: 4,             // カウンター席数
    pokeCooldown: 1000,   // 同じ具をツンツンできる間隔（ms）
    cookJitter: 0.25,     // 煮え時間のばらつき（±25%）
  };

  // 具材：cook = 煮えるまでの基本秒数, unlock = 登場し始める経過秒数
  const TYPES = {
    chikuwa:  { name: 'ちくわ',   cook: 5,  price: 120, unlock: 0 },
    tamago:   { name: 'たまご',   cook: 8,  price: 130, unlock: 0 },
    konnyaku: { name: 'こんにゃく', cook: 7, price: 100, unlock: 0 },
    daikon:   { name: '大根',     cook: 13, price: 150, unlock: 0 },
    hanpen:   { name: 'はんぺん', cook: 4,  price: 120, unlock: 25 },
    atsuage:  { name: '厚揚げ',   cook: 9,  price: 150, unlock: 25 },
    gyusuji:  { name: '牛すじ',   cook: 11, price: 200, unlock: 55 },
    kinchaku: { name: 'もち巾着', cook: 10, price: 180, unlock: 55 },
  };

  const FACES = ['👨‍💼', '👩', '👴', '👵', '🧑‍🎓', '👷', '🧔', '👩‍💼', '🧑‍🍳', '👨‍🦳'];

  // ============================================================
  //  具材のイラスト（上から見た図。煮えても見た目は変わらない）
  // ============================================================
  const SVG = {
    daikon: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#f2dfa9" stroke="#cfa860" stroke-width="4"/><circle cx="50" cy="50" r="30" fill="none" stroke="#e3c47f" stroke-width="2"/><path d="M38 50h24M50 38v24" stroke="#e0bf78" stroke-width="2" stroke-linecap="round"/></svg>`,
    tamago: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="30" ry="38" fill="#c98b3e"/><ellipse cx="42" cy="38" rx="9" ry="13" fill="#e8b46e" opacity=".8"/></svg>`,
    chikuwa: `<svg viewBox="0 0 100 100"><rect x="10" y="32" width="80" height="36" rx="18" fill="#efd28f"/><rect x="18" y="32" width="64" height="36" fill="#b77a35"/><path d="M26 36q4 14 0 28M40 36q4 14 0 28M54 36q4 14 0 28M68 36q4 14 0 28" stroke="#8f5a22" stroke-width="3" fill="none"/></svg>`,
    hanpen: `<svg viewBox="0 0 100 100"><rect x="18" y="18" width="64" height="64" rx="8" fill="#fbf7ec" stroke="#e7dcc0" stroke-width="3" transform="rotate(8 50 50)"/></svg>`,
    konnyaku: `<svg viewBox="0 0 100 100"><path d="M50 12L88 82H12Z" fill="#7d736a" stroke="#5f5750" stroke-width="3" stroke-linejoin="round"/><g fill="#4d4640"><circle cx="40" cy="60" r="2.5"/><circle cx="55" cy="48" r="2.5"/><circle cx="62" cy="68" r="2.5"/><circle cx="48" cy="72" r="2"/><circle cx="50" cy="35" r="2"/></g><path d="M34 70l32-28" stroke="#9a9087" stroke-width="2"/></svg>`,
    atsuage: `<svg viewBox="0 0 100 100"><rect x="16" y="22" width="68" height="56" rx="8" fill="#b06a26"/><rect x="24" y="30" width="52" height="40" rx="5" fill="#d08a3c"/><rect x="30" y="36" width="40" height="28" rx="4" fill="#f3e6c6" opacity=".55"/></svg>`,
    gyusuji: `<svg viewBox="0 0 100 100"><path d="M10 90L90 10" stroke="#e2c58c" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="68" r="15" fill="#7a4421"/><circle cx="50" cy="50" r="15" fill="#8d5128"/><circle cx="68" cy="32" r="15" fill="#7a4421"/><path d="M26 64q6 6 12 0M44 46q6 6 12 0M62 28q6 6 12 0" stroke="#d7b48a" stroke-width="3" fill="none"/></svg>`,
    kinchaku: `<svg viewBox="0 0 100 100"><path d="M50 30C22 30 16 86 50 86S78 30 50 30Z" fill="#c4813a"/><path d="M50 32l-14-16M50 32l14-16M50 32V14" stroke="#b47b33" stroke-width="5" stroke-linecap="round"/><path d="M36 34q14 8 28 0" stroke="#8a5a20" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  };

  // ============================================================
  //  DOM
  // ============================================================
  const $ = (id) => document.getElementById(id);
  const el = {
    score: $('score'), time: $('time'), hearts: $('hearts'), mute: $('mute'),
    seats: $('seats'), pot: $('pot'), toast: $('toast'),
    overlay: $('overlay'), panelBody: $('panel-body'), start: $('start'),
  };

  // ============================================================
  //  サウンド（WebAudio の簡単な効果音）
  // ============================================================
  let audioCtx = null;
  let muted = false;
  function getCtx() {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null) {
    if (muted) return;
    try {
      getCtx();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur);
    } catch (_) { /* 音が出せない環境では無視 */ }
  }
  const sfx = {
    poke: () => tone(220, 0.08, 'triangle', 0.2, 140),
    plop: () => tone(500, 0.18, 'sine', 0.15, 160),
    ok: () => { tone(660, 0.1, 'square', 0.08); setTimeout(() => tone(990, 0.15, 'square', 0.08), 90); },
    no: () => tone(150, 0.15, 'sawtooth', 0.06),
    coin: () => { tone(1200, 0.08, 'square', 0.06); setTimeout(() => tone(1600, 0.2, 'square', 0.06), 70); },
    angry: () => tone(200, 0.4, 'sawtooth', 0.08, 90),
  };

  // ============================================================
  //  BGM（WebAudio で鳴らすオリジナルのポップな曲。終盤ほどテンポアップ）
  // ============================================================
  const BGM = (() => {
    const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
    // 1 小節 = 8 分音符 × 8。コード進行 C → Am → F → G を 2 周
    const CHORDS = [
      [36, [60, 64, 67]], [33, [60, 64, 69]], [29, [60, 65, 69]], [31, [59, 62, 67]],
    ];
    const MELODY = [
      72, 0, 76, 79, 76, 0, 72, 74,
      76, 0, 0, 74, 72, 0, 69, 0,
      69, 72, 77, 0, 76, 74, 72, 0,
      74, 0, 79, 0, 77, 76, 74, 0,
      79, 0, 76, 79, 81, 79, 76, 0,
      76, 74, 72, 0, 74, 76, 72, 0,
      77, 0, 76, 0, 74, 72, 74, 76,
      79, 0, 0, 0, 74, 0, 79, 0,
    ];
    let timer = null;
    let master = null;
    let noise = null;
    let step = 0;
    let nextTime = 0;

    function note(freq, t, dur, type, vol) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    function hit(t, dur, vol, hp) {
      const src = audioCtx.createBufferSource();
      src.buffer = noise;
      const f = audioCtx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = hp;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(master);
      src.start(t);
      src.stop(t + dur);
    }
    function kick(t) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.16);
    }

    function schedule(t, i, stepDur) {
      const bar = Math.floor(i / 8) % 4;
      const beat = i % 8;
      const [root, chord] = CHORDS[bar];
      // ベース：ルートとオクターブをぴょんぴょん
      note(midi(root + (beat % 2 ? 12 : 0)), t, stepDur * 0.9, 'triangle', 0.5);
      // 裏拍のコードカッティング
      if (beat % 2) chord.forEach((m) => note(midi(m), t, stepDur * 0.5, 'square', 0.04));
      // メロディ
      const m = MELODY[i % MELODY.length];
      if (m) note(midi(m), t, stepDur * 1.6, 'square', 0.09);
      // ドラム
      if (beat === 0 || beat === 4 || beat === 7) kick(t);
      if (beat === 2 || beat === 6) hit(t, 0.12, 0.35, 1500);
      hit(t, 0.03, beat % 2 ? 0.12 : 0.06, 7000);
    }

    function pump() {
      const bpm = 132 + 24 * (state ? progress() : 0);
      const stepDur = 60 / bpm / 2;
      while (nextTime < audioCtx.currentTime + 0.15) {
        schedule(nextTime, step, stepDur);
        nextTime += stepDur;
        step = (step + 1) % MELODY.length;
      }
    }

    return {
      start() {
        if (timer || muted) return;
        try {
          getCtx();
          if (!master) {
            master = audioCtx.createGain();
            master.gain.value = 0.18;
            master.connect(audioCtx.destination);
            noise = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
            const d = noise.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          }
          step = 0;
          nextTime = audioCtx.currentTime + 0.05;
          timer = setInterval(pump, 25);
          pump();
        } catch (_) { /* 音が出せない環境では無視 */ }
      },
      stop() {
        clearInterval(timer);
        timer = null;
      },
    };
  })();

  // ============================================================
  //  状態
  // ============================================================
  let state = null;
  let nextId = 1;
  let rafId = 0;
  let lastFrame = 0;

  function newState() {
    return {
      running: false,
      time: 0,                  // ゲーム内経過秒
      score: 0,
      hearts: CONFIG.maxHearts,
      served: 0,                // 提供した具の数
      happy: 0,                 // 満足して帰った客
      angry: 0,                 // 怒って帰った客
      combo: 0,
      slots: Array.from({ length: CONFIG.slots }, () => []), // 各仕切り：下 → 上の配列
      seats: Array(CONFIG.seats).fill(null),
      nextSpawn: 0.3,
      slotKeys: Array(CONFIG.slots).fill(''),
    };
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const progress = () => Math.min(1, state.time / CONFIG.gameLength);

  function availableTypes() {
    return Object.keys(TYPES).filter((k) => TYPES[k].unlock <= state.time);
  }

  // ============================================================
  //  鍋
  // ============================================================
  function addItemToPot(type) {
    const open = state.slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.length < CONFIG.stackMax);
    if (open.length === 0) return false;
    // 空の仕切りがあればまずそこへ（什器がすぐ埋まる）。埋まったら上に重ねて下の具を隠す
    const empty = open.filter(({ s }) => s.length === 0);
    const candidates = empty.length > 0 && Math.random() < 0.85 ? empty : open;
    const { i } = pick(candidates);
    const base = TYPES[type].cook;
    state.slots[i].push({
      id: nextId++,
      type,
      enteredAt: state.time,
      cookTime: base * rand(1 - CONFIG.cookJitter, 1 + CONFIG.cookJitter),
      lastPoke: -Infinity, // 実時間(ms)
      fresh: true,
    });
    return true;
  }

  function potFreeSpace() {
    return state.slots.reduce((n, s) => n + (CONFIG.stackMax - s.length), 0);
  }

  // ============================================================
  //  お客さん
  // ============================================================
  // 来店できたら true。席か鍋が空いていなければ false（すぐ再挑戦する）
  function spawnCustomer() {
    const free = state.seats.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (free.length === 0) return false;
    const p = progress();
    // 最初から 2〜3 品、後半は 2〜4 品をどんどん注文
    const maxItems = p < 0.3 ? 3 : 4;
    const count = Math.min(2 + Math.floor(Math.random() * (maxItems - 1)), potFreeSpace());
    if (count <= 0) return false;

    const types = availableTypes();
    const wants = [];
    for (let k = 0; k < count; k++) {
      const type = pick(types);
      wants.push({ type, served: false });
    }
    wants.forEach((w) => addItemToPot(w.type));

    const longest = Math.max(...wants.map((w) => TYPES[w.type].cook));
    const patience = (longest * (1 + CONFIG.cookJitter) + 10 + count * 5) * (1.15 - p * 0.3);
    const seat = pick(free);
    state.seats[seat] = {
      id: nextId++,
      face: pick(FACES),
      wants,
      arrivedAt: state.time,
      patience,
      leftAt: state.time + patience,
      leaving: null,
      dirty: true,
    };
    sfx.plop();
    toast(`ご注文：${wants.map((w) => TYPES[w.type].name).join('・')}`);
    return true;
  }

  // その具材を待っている一番古いお客さんの「注文」を返す
  function findOrder(type) {
    const customers = state.seats
      .filter((c) => c && !c.leaving)
      .sort((a, b) => a.arrivedAt - b.arrivedAt);
    for (const c of customers) {
      const w = c.wants.find((x) => x.type === type && !x.served);
      if (w) return { customer: c, want: w };
    }
    return null;
  }

  function customerDone(c, happy) {
    c.leaving = happy ? 'happy' : 'angry';
    c.dirty = true;
    const seatIdx = state.seats.indexOf(c);
    setTimeout(() => {
      if (state && state.seats[seatIdx] === c) {
        state.seats[seatIdx] = null;
        renderSeat(seatIdx);
      }
    }, 600);
  }

  // ============================================================
  //  ツンツン
  // ============================================================
  function poke(slotIdx) {
    if (!state || !state.running) return;
    const stack = state.slots[slotIdx];
    const slotEl = el.pot.children[slotIdx];
    showSkewer(slotEl);

    if (stack.length === 0) {
      floatText(slotEl, 'からっぽ', 'none');
      return;
    }

    const item = stack[stack.length - 1]; // 上から見えている一番上の具だけ刺せる
    const now = performance.now();

    // 連打防止：同じ具は 1 秒以上空けないとダメ（早すぎるとタイマーもリセット）
    if (now - item.lastPoke < CONFIG.pokeCooldown) {
      item.lastPoke = now;
      state.combo = 0;
      floatText(slotEl, 'つつきすぎ！', 'fast');
      sfx.no();
      return;
    }
    item.lastPoke = now;
    sfx.poke();
    slotEl.classList.remove('poked');
    void slotEl.offsetWidth;
    slotEl.classList.add('poked');

    const order = findOrder(item.type);
    if (!order) {
      floatText(slotEl, '注文なし', 'none');
      return;
    }

    const cooked = state.time - item.enteredAt >= item.cookTime;
    if (!cooked) {
      state.combo = 0;
      floatText(slotEl, 'まだ固い…', 'raw');
      return;
    }

    // 提供！
    stack.pop();
    order.want.served = true;
    order.customer.dirty = true;
    state.served++;
    state.combo++;
    const comboBonus = Math.min(state.combo - 1, 5) * 10;
    const gain = TYPES[item.type].price + comboBonus;
    state.score += gain;
    floatText(slotEl, `+¥${gain}${state.combo > 1 ? ` ${state.combo}連` : ''}`, 'ok');
    sfx.ok();

    const c = order.customer;
    if (c.wants.every((w) => w.served)) {
      const remain = Math.max(0, (c.leftAt - state.time) / c.patience);
      const tip = Math.round(remain * c.wants.length * 50 / 10) * 10;
      state.score += tip;
      state.happy++;
      if (tip > 0) toast(`まいど！ チップ ¥${tip}`);
      else toast('まいど！');
      sfx.coin();
      customerDone(c, true);
    }
  }

  // ============================================================
  //  ループ
  // ============================================================
  function tick(ts) {
    const dt = Math.min(0.1, (ts - lastFrame) / 1000 || 0);
    lastFrame = ts;
    if (state.running) update(dt);
    render();
    rafId = requestAnimationFrame(tick);
  }

  function update(dt) {
    state.time += dt;
    const p = progress();

    // 来店
    if (state.time >= state.nextSpawn) {
      if (spawnCustomer()) {
        // 席が空けば 3 秒 → 1.5 秒間隔でどんどん来店
        const base = 3 - p * 1.5;
        state.nextSpawn = state.time + rand(base * 0.7, base * 1.2);
      } else {
        // 満席・鍋がいっぱいなら、空いた瞬間に次のお客さんが座る
        state.nextSpawn = state.time + 0.3;
      }
    }

    // しびれを切らしたお客さん
    for (const c of state.seats) {
      if (c && !c.leaving && state.time >= c.leftAt) {
        state.hearts--;
        state.angry++;
        state.combo = 0;
        sfx.angry();
        toast('お客さんが怒って帰ってしまった…（具は鍋に残ります）');
        customerDone(c, false);
      }
    }

    if (state.hearts <= 0 || state.time >= CONFIG.gameLength) endGame();
  }

  // ============================================================
  //  描画
  // ============================================================
  function render() {
    el.score.textContent = `¥${state.score.toLocaleString()}`;
    el.time.textContent = `${Math.max(0, Math.ceil(CONFIG.gameLength - state.time))}`;
    el.hearts.textContent = '♥'.repeat(Math.max(0, state.hearts)) + '♡'.repeat(CONFIG.maxHearts - Math.max(0, state.hearts));

    // 鍋：一番上の具だけ描く（下の具は見えない）
    state.slots.forEach((stack, i) => {
      const top = stack[stack.length - 1];
      const key = top ? String(top.id) : '';
      if (state.slotKeys[i] === key) return;
      state.slotKeys[i] = key;
      const slotEl = el.pot.children[i];
      const old = slotEl.querySelector('.item');
      if (old) old.remove();
      if (top) {
        const div = document.createElement('div');
        div.className = 'item' + (top.fresh ? ' drop' : '');
        div.style.animationDelay = top.fresh ? '' : `${-(top.id % 7) * 0.37}s`;
        div.innerHTML = SVG[top.type];
        slotEl.appendChild(div);
        top.fresh = false;
      }
      slotEl.setAttribute('aria-label', top ? `仕切り${i + 1}：${TYPES[top.type].name}` : `仕切り${i + 1}：空`);
    });
    // 一番上でない「fresh」フラグは描画されないまま残るので消す
    state.slots.forEach((s) => s.forEach((it) => { it.fresh = false; }));

    // お客さん
    state.seats.forEach((c, i) => {
      if (c && c.dirty) { renderSeat(i); c.dirty = false; }
      if (c) {
        const bar = el.seats.children[i].querySelector('.patience');
        if (bar) {
          const r = Math.max(0, (c.leftAt - state.time) / c.patience);
          bar.firstChild.style.width = `${r * 100}%`;
          bar.classList.toggle('mid', r < 0.5 && r >= 0.25);
          bar.classList.toggle('low', r < 0.25);
        }
      }
    });
  }

  function renderSeat(i) {
    const seatEl = el.seats.children[i];
    const c = state.seats[i];
    seatEl.className = 'seat' + (c ? '' : ' empty');
    if (!c) { seatEl.innerHTML = ''; return; }
    const cls = c.leaving ? ` leaving-${c.leaving}` : '';
    const face = c.leaving === 'happy' ? '😋' : c.leaving === 'angry' ? '😠' : c.face;
    seatEl.innerHTML = `
      <div class="customer${cls}">
        <div class="bubble">${c.wants.map((w) =>
          `<span class="want${w.served ? ' served' : ''}" title="${TYPES[w.type].name}">${SVG[w.type]}</span>`).join('')}
        </div>
        <div class="face">${face}</div>
        <div class="patience"><div></div></div>
      </div>`;
  }

  function buildBoard() {
    el.pot.innerHTML = '';
    for (let i = 0; i < CONFIG.slots; i++) {
      const s = document.createElement('div');
      s.className = 'slot';
      s.tabIndex = 0;
      s.setAttribute('role', 'button');
      s.addEventListener('pointerdown', (e) => { e.preventDefault(); poke(i); });
      s.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(i); }
      });
      el.pot.appendChild(s);
    }
    el.seats.innerHTML = '';
    for (let i = 0; i < CONFIG.seats; i++) {
      const s = document.createElement('div');
      s.className = 'seat empty';
      el.seats.appendChild(s);
    }
  }

  function showSkewer(slotEl) {
    const k = document.createElement('div');
    k.className = 'skewer';
    slotEl.appendChild(k);
    setTimeout(() => k.remove(), 260);
  }

  function floatText(slotEl, text, kind) {
    const f = document.createElement('div');
    f.className = `float ${kind}`;
    f.textContent = text;
    slotEl.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  let toastTimer = 0;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.style.opacity = 1;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.style.opacity = 0; }, 2400);
  }

  // ============================================================
  //  画面遷移
  // ============================================================
  function loadBest() {
    try { return Number(localStorage.getItem('oden-tsuntsun-best')) || 0; } catch (_) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem('oden-tsuntsun-best', String(v)); } catch (_) { /* noop */ }
  }

  function showTitle() {
    const menu = Object.keys(TYPES).map((k) =>
      `<div>${SVG[k]}${TYPES[k].name}</div>`).join('');
    el.panelBody.innerHTML = `
      <ul class="rules">
        <li>お客さんが注文すると、その具が鍋に入ります。</li>
        <li>鍋は<b>上から見えるだけ</b>。下に沈んだ具は見えません。</li>
        <li>具は<b>煮えても見た目が変わりません</b>。具ごとに煮える時間が違います。</li>
        <li>仕切りをタップして串で<b>ツンツン</b>。注文があって煮えていれば提供できます。</li>
        <li>同じ具は<b>1秒以上</b>あけてツンツン。つつきすぎると無効＆やり直し。</li>
        <li>待たせすぎるとお客さんが帰って評判ダウン。♥が無くなると閉店です。</li>
      </ul>
      <div class="menu">${menu}</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px">ベスト売上：¥${loadBest().toLocaleString()}</div>`;
    el.start.textContent = '開店する';
    el.overlay.classList.remove('hidden');
  }

  function startGame() {
    state = newState();
    buildBoard();
    el.overlay.classList.add('hidden');
    el.toast.textContent = 'いらっしゃいませ！';
    state.running = true;
    // 開店と同時に全席満席でスタート
    for (let i = 0; i < CONFIG.seats; i++) spawnCustomer();
    toast('いらっしゃいませ！ 満席です！');
    state.nextSpawn = 2;
    BGM.start();
  }

  function endGame() {
    state.running = false;
    BGM.stop();
    const best = loadBest();
    const isBest = state.score > best;
    if (isBest) saveBest(state.score);
    const reason = state.hearts <= 0 ? '評判が落ちて閉店…' : '本日の営業終了！';
    el.panelBody.innerHTML = `
      <p style="margin:0 0 4px;font-weight:800">${reason}</p>
      <div class="result">
        <div>売上</div>
        <div class="big">¥${state.score.toLocaleString()}</div>
        ${isBest ? '<div style="color:var(--accent);font-weight:800">ベスト更新！</div>' : `<div>ベスト：¥${Math.max(best, state.score).toLocaleString()}</div>`}
        <div>提供した具：${state.served} 個</div>
        <div>満足したお客さん：${state.happy} 人 ／ 怒って帰った：${state.angry} 人</div>
      </div>`;
    el.start.textContent = 'もう一度';
    el.overlay.classList.remove('hidden');
  }

  // ============================================================
  //  初期化
  // ============================================================
  el.start.addEventListener('click', startGame);
  el.mute.addEventListener('click', () => {
    muted = !muted;
    el.mute.textContent = muted ? '🔇' : '🔊';
    if (muted) BGM.stop();
    else if (state && state.running) BGM.start();
  });

  state = newState();
  buildBoard();
  showTitle();
  lastFrame = performance.now();
  rafId = requestAnimationFrame(tick);
})();
