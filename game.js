(() => {
  'use strict';

  // ============================================================
  //  設定
  // ============================================================
  const CONFIG = {
    gameLength: 150,      // 営業時間（秒）
    maxHearts: 3,         // 評判（0 になると閉店）
    slots: 6,             // 鍋の仕切りの数（2行×3列）
    stackMax: 3,          // 1 つの仕切りに重なる具の最大数
    seats: 6,             // カウンター席数
    pokeCooldown: 1000,   // 同じ具をツンツンできる間隔（ms）
    missPenaltyRaw: 0.7,  // 「まだ固い」で、お客さん全員の我慢時間が減る秒数
    missPenaltyWrong: 0.7,// 「注文なし」「つつきすぎ」「からっぽ」で減る秒数
    patienceBase: 10,     // 我慢時間の基本秒数
    patiencePerItem: 3.5, // 我慢時間：1 品あたりの追加秒数
    patienceStart: 1.6,   // 我慢時間の倍率：開店直後（前半は長めに待ってくれる）
    patienceEnd: 1.0,     // 我慢時間の倍率：閉店間際
    spawnStart: 2,        // 来店間隔（秒）：開店直後
    spawnEnd: 0.8,        // 来店間隔（秒）：閉店間際
    lateOrderFrom: 0.5,   // 営業時間のこの割合を過ぎたら、1 人 3〜4 品の注文になる
    comboStep: 20,        // コンボボーナス：1 コンボごとの加算額
    comboMax: 10,         // コンボボーナスの上限段数
    tipPerItem: 150,      // チップ：1 品あたりの最大額（早く出すほど多い）
    cookJitter: 0.25,     // 煮え時間のばらつき（±25%）
    prepped: 6,           // 開店時に仕込んである（煮えている）具の数
  };

  // 具材：cook = 煮えるまでの基本秒数, unlock = 登場し始める経過秒数
  const TYPES = {
    chikuwa:  { name: 'ちくわ',   cook: 2,  price: 120, unlock: 0 },
    tamago:   { name: 'たまご',   cook: 5,  price: 130, unlock: 0 },
    konnyaku: { name: 'こんにゃく', cook: 4, price: 100, unlock: 0 },
    daikon:   { name: '大根',     cook: 10, price: 150, unlock: 0 },
    hanpen:   { name: 'はんぺん', cook: 1,  price: 120, unlock: 25 },
    atsuage:  { name: '厚揚げ',   cook: 6,  price: 150, unlock: 25 },
    gyusuji:  { name: '牛すじ',   cook: 8, price: 200, unlock: 55 },
    cabbage:  { name: 'ロールキャベツ', cook: 7, price: 180, unlock: 55 },
  };

  // ============================================================
  //  言語（日本語 / English）
  // ============================================================
  const NAMES_EN = {
    chikuwa: 'Chikuwa', tamago: 'Egg', konnyaku: 'Konnyaku', daikon: 'Daikon',
    hanpen: 'Hanpen', atsuage: 'Fried tofu', gyusuji: 'Beef tendon', cabbage: 'Cabbage roll',
  };
  const STR = {
    ja: {
      docTitle: 'おでんつんつん',
      title: 'おでん<span>つんつん</span>',
      sales: '売上', time: 'のこり', rep: '評判',
      mute: '音のオン・オフ', langBtn: 'EN', langAria: 'Switch to English',
      counter: 'お客さん', potAria: 'おでん鍋',
      hint: 'ツンツンできるのは真ん中の一番上の具だけ。下の段の具は隙間から見えます。煮え具合は見た目ではわかりません。',
      full: '鍋が満杯！ 注文を受けられません',
      rules: [
        '開店時、鍋には<b>煮えた具が6つ</b>仕込んであり、最初のお客さんはそれを注文します。',
        'お客さんが注文すると、その具が鍋に入ります。',
        '具は3段まで重なります。ツンツンできるのは<b>一番上（真ん中）の具だけ</b>。下の段は隙間から見えます。',
        '具は<b>煮えても見た目が変わりません</b>。具ごとに煮える時間が違います。',
        '仕切りをタップして串で<b>ツンツン</b>。注文があって煮えていれば提供できます。',
        '同じ具は<b>1秒以上</b>あけてツンツン。つつきすぎると無効＆やり直し。',
        '<b>ハズレのツンツン</b>（まだ固い・注文なし・つつきすぎ・からっぽ）は、お客さんがイライラして待ってくれる時間が減ります。',
        '待たせすぎるとお客さんが帰って評判ダウン。♥が無くなると閉店です。',
        '連続で出すとコンボボーナス、早く出すほどチップが増えます。',
      ],
      bestSales: (v) => `ベスト売上：¥${v}`,
      start: '開店する', again: 'もう一度',
      tagline: '見た目じゃわからない！<br>煮えたおでんを串でツンツンして出そう',
      play: '開店する', howto: 'あそびかた', toTop: 'トップへ', resume: '再開する',
      paused: '一時停止中', pauseAria: '一時停止',
      privacy: 'プライバシーポリシー', privacyUrl: 'https://techgym.jp/privacy-policy/', adSettings: '広告の設定',
      contTitle: '評判が尽きた…', contMsg: '広告を見ると評判が ♥1 つ戻り、営業を続けられます',
      contLeft: (n) => `あと ${n} 回使えます`,
      contWatch: '▶ 広告を見て続ける', contNo: (s) => `やめる（${s}）`,
      contLoading: '広告を読み込み中…', contFail: '広告を読み込めませんでした',
      contDone: '評判が戻った！ 営業再開！',
      continues: (n) => `コンティニュー：${n} 回`,
      closed: '評判が落ちて閉店…', done: '本日の営業終了！',
      resSales: '売上', newBest: 'ベスト更新！', best: (v) => `ベスト：¥${v}`,
      served: (n) => `提供した具：${n} 個`,
      happy: (h) => `満足したお客さん：${h} 人`, angry: (a) => `怒って帰ったお客さん：${a} 人`,
      share: '📣 結果をシェア', shareX: '𝕏 でポスト', copied: '✅ コピーしました',
      copyPrompt: 'この文章をコピーしてシェアしてください',
      shareText: (score, stay, served, happy, cont) =>
        `おでんつんつんで売上 ¥${score}（${stay}）\n提供 ${served} 個・満足したお客さん ${happy} 人${cont ? `・コンティニュー ${cont} 回` : ''}\n#おでんつんつん`,
      stayClosed: (sec) => `${sec}秒で閉店…`, stayDone: '完走！',
      empty: 'からっぽ', tooFast: 'つつきすぎ！', noOrder: '注文なし', raw: 'まだ固い…',
      combo: (n) => ` ${n}連`,
      order: (names) => `ご注文：${names.join('・')}`,
      thanks: 'まいど！', tip: (v) => `まいど！ チップ ¥${v}`,
      angryLeft: 'お客さんが怒って帰った…（具は鍋に残る）',
      welcome: 'いらっしゃいませ！', welcomeFull: 'いらっしゃいませ！ 満席です！',
      slot: (i, names) => `仕切り${i}：${names.length ? names.join('の下に') : '空'}`,
      dbgLayer: (k, name, cooked) => `${k}段目 ${name} ${cooked ? '煮' : '生'}`, dbgEmpty: '空',
    },
    en: {
      docTitle: 'Oden Tsun-Tsun',
      title: 'Oden <span>Tsun-Tsun</span>',
      sales: 'Sales', time: 'Time', rep: 'Rating',
      mute: 'Sound on/off', langBtn: '日本語', langAria: '日本語に切り替え',
      counter: 'Customers', potAria: 'Oden pot',
      hint: 'You can only poke the top item in the center. Lower layers peek out from the edges. You can\'t tell if it\'s cooked just by looking.',
      full: 'Pot is full! No more orders',
      rules: [
        'At opening, the pot already holds <b>6 cooked items</b>, and the first customers order exactly those.',
        'When a customer orders, those items go into the pot.',
        'Items stack up to 3 layers. You can only poke <b>the top one (center)</b>; lower layers peek out from the edges.',
        'Items <b>look the same whether cooked or not</b>. Each kind takes a different time to cook.',
        'Tap a compartment to <b>poke</b> it with a skewer. If it\'s ordered and cooked, it\'s served!',
        'Wait <b>at least 1 second</b> between pokes on the same item. Poking too fast fails and resets the wait.',
        '<b>Bad pokes</b> (not yet / no order / too fast / empty) annoy customers and shorten their patience.',
        'Keep customers waiting too long and they storm off, lowering your rating. Lose all ♥ and the shop closes.',
        'Serve in a row for combo bonuses. Serve fast for bigger tips.',
      ],
      bestSales: (v) => `Best sales: ¥${v}`,
      start: 'Open shop', again: 'Play again',
      tagline: 'They all look the same!<br>Poke the oden and serve what\'s cooked',
      play: 'Open shop', howto: 'How to play', toTop: 'Top', resume: 'Resume',
      paused: 'Paused', pauseAria: 'Pause',
      privacy: 'Privacy policy', privacyUrl: 'https://techgym.jp/privacy-policy-en/', adSettings: 'Ad settings',
      contTitle: 'Your rating hit zero…', contMsg: 'Watch an ad to get ♥1 back and keep the shop open',
      contLeft: (n) => `${n} left`,
      contWatch: '▶ Watch ad & continue', contNo: (s) => `No thanks (${s})`,
      contLoading: 'Loading ad…', contFail: 'Couldn\'t load an ad',
      contDone: 'Rating restored! Back to work!',
      continues: (n) => `Continues: ${n}`,
      closed: 'Your rating hit zero. Shop closed…', done: "That's a wrap for today!",
      resSales: 'Sales', newBest: 'New best!', best: (v) => `Best: ¥${v}`,
      served: (n) => `Items served: ${n}`,
      happy: (h) => `Happy customers: ${h}`, angry: (a) => `Angry customers: ${a}`,
      share: '📣 Share result', shareX: 'Post on 𝕏', copied: '✅ Copied!',
      copyPrompt: 'Copy this text to share',
      shareText: (score, stay, served, happy, cont) =>
        `I made ¥${score} in Oden Tsun-Tsun (${stay})\nServed ${served} items · ${happy} happy customers${cont ? ` · ${cont} continue${cont > 1 ? 's' : ''}` : ''}\n#OdenTsunTsun #おでんつんつん`,
      stayClosed: (sec) => `closed after ${sec}s…`, stayDone: 'made it to closing!',
      empty: 'Empty', tooFast: 'Too fast!', noOrder: 'No order', raw: 'Not yet…',
      combo: (n) => ` x${n}`,
      order: (names) => `Order: ${names.join(', ')}`,
      thanks: 'Thank you!', tip: (v) => `Thank you! Tip ¥${v}`,
      angryLeft: 'A customer stormed off… (items stay)',
      welcome: 'Welcome!', welcomeFull: 'Welcome! Full house!',
      slot: (i, names) => `Slot ${i}: ${names.length ? names.join(', then ') : 'empty'}`,
      dbgLayer: (k, name, cooked) => `L${k} ${name} ${cooked ? 'done' : 'raw'}`, dbgEmpty: 'empty',
    },
  };

  function detectLang() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'ja' || q === 'en') return q;
    try { const v = localStorage.getItem('oden-lang'); if (v === 'ja' || v === 'en') return v; } catch (_) { /* noop */ }
    return (navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en';
  }
  let lang = detectLang();
  const T = () => STR[lang];
  const tn = (type) => (lang === 'en' ? NAMES_EN[type] : TYPES[type].name);

  // ツンツンした時の音の高さ（やわらかい具は低く、弾力のある具は高く）
  const POKE_PITCH = {
    chikuwa: 1.2, tamago: 1.35, konnyaku: 1.5, daikon: 0.85,
    hanpen: 0.75, atsuage: 1.0, gyusuji: 1.1, cabbage: 0.9,
  };

  // URL に ?debug を付けると、各仕切りの中身（上から順・煮え具合）を表示する確認用モード
  const DEBUG = /[?&]debug\b/.test(location.search);

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
    cabbage: `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="40" ry="30" fill="#b9d98a" stroke="#86b356" stroke-width="3"/><path d="M14 50q18-22 36-4q18 18 36-6" fill="none" stroke="#9cc56a" stroke-width="5" stroke-linecap="round"/><path d="M50 22q6 28 0 56M30 28q4 22 0 44M70 28q-4 22 0 44" fill="none" stroke="#e6f2cf" stroke-width="2.5" stroke-linecap="round"/><path d="M44 20q-6 30 0 60" fill="none" stroke="#c9a46a" stroke-width="6" stroke-linecap="round"/></svg>`,
  };

  // ============================================================
  //  DOM
  // ============================================================
  const $ = (id) => document.getElementById(id);
  const el = {
    score: $('score'), time: $('time'), hearts: $('hearts'), mute: $('mute'),
    seats: $('seats'), pot: $('pot'), toast: $('toast'), full: $('full'),
    overlay: $('overlay'), panelBody: $('panel-body'), actions: $('panel-actions'), pause: $('pause'),
    langBtns: document.querySelectorAll('[data-lang-toggle]'),
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
  // 広告の表示中・裏に回ったときに音を止める（ads.js からも呼ばれる）
  window.Sound = {
    suspend() { if (audioCtx && audioCtx.state === 'running') audioCtx.suspend(); },
    resume() { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); },
  };

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
    // ツンツン：串先の「つっ」＋具がへこむ「ぷにっ」＋揺れ戻る「ぷるん」
    poke: (pitch = 1) => {
      const r = pitch * rand(0.94, 1.06);
      tone(1800 * r, 0.025, 'triangle', 0.1, 700 * r);
      tone(300 * r, 0.12, 'sine', 0.28, 150 * r);
      setTimeout(() => tone(240 * r, 0.16, 'sine', 0.12, 380 * r), 70);
      setTimeout(() => tone(330 * r, 0.12, 'sine', 0.06, 260 * r), 160);
    },
    splash: () => tone(900, 0.12, 'sine', 0.07, 1500),
    pull: () => tone(400, 0.2, 'triangle', 0.1, 900),
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
  let screen = 'top'; // 'top' | 'howto' | 'game' | 'pause' | 'continue' | 'result'
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
      potFull: false,
      paused: false,            // 一時停止中（ポーズ画面・コンティニューの案内中）
      offering: false,          // コンティニューの案内中
      continues: 0,             // リワード広告で続けた回数
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
    // 空の仕切りがあれば必ずそこへ。空きが無ければ、まだ3段に達していない仕切りをランダムに選んで一番上に乗せる
    const empty = open.filter(({ s }) => s.length === 0);
    const { i } = pick(empty.length > 0 ? empty : open);
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

  // 開店前の仕込み：ランダムな具を、煮えた状態で各仕切りの一番下に 1 つずつ
  // 仕込んだ具の種類の配列を返す
  function prepPot() {
    const types = availableTypes();
    const prepped = [];
    const order = state.slots.map((_, i) => i).sort(() => Math.random() - 0.5);
    for (let k = 0; k < CONFIG.prepped; k++) {
      const type = pick(types);
      const cookTime = TYPES[type].cook;
      state.slots[order[k % order.length]].push({
        id: nextId++,
        type,
        enteredAt: -cookTime * 2, // とっくに煮えている
        cookTime,
        lastPoke: -Infinity,
        fresh: true,
      });
      prepped.push(type);
    }
    return prepped;
  }

  function potFreeSpace() {
    return state.slots.reduce((n, s) => n + (CONFIG.stackMax - s.length), 0);
  }

  // ============================================================
  //  お客さん
  // ============================================================
  // 来店できたら true。席か鍋が空いていなければ false（すぐ再挑戦する）
  // preset を渡すと、その具をすでに鍋にある（仕込み済みの）具として注文する。鍋には追加しない
  function spawnCustomer(preset = null) {
    const free = state.seats.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
    if (free.length === 0) return false;
    const p = progress();
    let wants;
    if (preset) {
      wants = preset.map((type) => ({ type, served: false }));
    } else {
      // 2〜3 品、後半は 2〜4 品をどんどん注文
      // 前半は 2〜3 品、途中から 2〜4 品、後半は 3〜4 品
      const minItems = p < CONFIG.lateOrderFrom ? 2 : 3;
      const maxItems = p < 0.3 ? 3 : 4;
      const count = Math.min(minItems + Math.floor(Math.random() * (maxItems - minItems + 1)), potFreeSpace());
      if (count <= 0) return false;
      const types = availableTypes();
      wants = [];
      for (let k = 0; k < count; k++) wants.push({ type: pick(types), served: false });
      wants.forEach((w) => addItemToPot(w.type));
    }

    const longest = Math.max(...wants.map((w) => TYPES[w.type].cook));
    const patience = (longest * (1 + CONFIG.cookJitter) + CONFIG.patienceBase + wants.length * CONFIG.patiencePerItem) * (CONFIG.patienceStart + (CONFIG.patienceEnd - CONFIG.patienceStart) * p);
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
    toast(T().order(wants.map((w) => tn(w.type))));
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

  // ハズレのツンツン：見ているお客さん全員がイライラして我慢時間が減る
  function annoy(sec) {
    for (const c of state.seats) {
      if (c && !c.leaving) { c.leftAt -= sec; c.annoyedAt = state.time; }
    }
  }

  // ============================================================
  //  ツンツン
  // ============================================================
  function poke(slotIdx) {
    if (!state || !state.running || state.paused) return;
    const stack = state.slots[slotIdx];
    const slotEl = el.pot.children[slotIdx];
    showSkewer(slotEl);

    if (stack.length === 0) {
      ripple(slotEl);
      sfx.splash();
      floatText(slotEl, T().empty, 'none');
      annoy(CONFIG.missPenaltyWrong);
      return;
    }

    const item = stack[stack.length - 1]; // 上から見えている一番上の具だけ刺せる
    const now = performance.now();

    // 連打防止：同じ具は 1 秒以上空けないとダメ（早すぎるとタイマーもリセット）
    if (now - item.lastPoke < CONFIG.pokeCooldown) {
      item.lastPoke = now;
      state.combo = 0;
      wobble(slotEl, 0.5);
      floatText(slotEl, T().tooFast, 'fast');
      annoy(CONFIG.missPenaltyWrong);
      sfx.no();
      return;
    }
    item.lastPoke = now;
    sfx.poke(POKE_PITCH[item.type]);
    wobble(slotEl, 1);
    ripple(slotEl);

    const order = findOrder(item.type);
    if (!order) {
      floatText(slotEl, T().noOrder, 'none');
      annoy(CONFIG.missPenaltyWrong);
      return;
    }

    const cooked = state.time - item.enteredAt >= item.cookTime;
    if (!cooked) {
      state.combo = 0;
      floatText(slotEl, T().raw, 'raw');
      annoy(CONFIG.missPenaltyRaw);
      return;
    }

    // 提供！（串で引き上げる）
    liftOut(slotEl);
    shine(slotEl, state.combo + 1);
    sfx.pull();
    stack.pop();
    order.want.served = true;
    order.customer.dirty = true;
    state.served++;
    state.combo++;
    const comboBonus = Math.min(state.combo - 1, CONFIG.comboMax) * CONFIG.comboStep;
    const gain = TYPES[item.type].price + comboBonus;
    state.score += gain;
    floatText(slotEl, `+¥${gain}${state.combo > 1 ? T().combo(state.combo) : ''}`, 'ok');
    sfx.ok();

    const c = order.customer;
    if (c.wants.every((w) => w.served)) {
      const remain = Math.max(0, (c.leftAt - state.time) / c.patience);
      const tip = Math.round(remain * c.wants.length * CONFIG.tipPerItem / 10) * 10;
      state.score += tip;
      state.happy++;
      toast(tip > 0 ? T().tip(tip) : T().thanks);
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
    if (state.running && !state.paused) update(dt);
    render();
    rafId = requestAnimationFrame(tick);
  }

  function update(dt) {
    state.time += dt;
    const p = progress();

    // 来店
    if (state.time >= state.nextSpawn) {
      if (spawnCustomer()) {
        // 席が空けば spawnStart → spawnEnd 秒間隔でどんどん来店
        const base = CONFIG.spawnStart + (CONFIG.spawnEnd - CONFIG.spawnStart) * p;
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
        toast(T().angryLeft);
        customerDone(c, false);
      }
    }

    if (state.hearts <= 0) {
      if (canContinue()) offerContinue();
      else endGame();
    } else if (state.time >= CONFIG.gameLength) {
      endGame();
    }
  }

  // ============================================================
  //  描画
  // ============================================================
  function render() {
    el.score.textContent = `¥${state.score.toLocaleString()}`;
    el.time.textContent = `${Math.max(0, Math.ceil(CONFIG.gameLength - state.time))}`;
    el.hearts.textContent = '♥'.repeat(Math.max(0, state.hearts)) + '♡'.repeat(CONFIG.maxHearts - Math.max(0, state.hearts));

    // 鍋が満杯なら「注文を受けられません」を表示
    const full = potFreeSpace() === 0;
    if (full !== state.potFull) {
      state.potFull = full;
      el.full.parentElement.classList.toggle('full', full);
      if (full && state.running) sfx.no();
    }

    // 鍋：一番上の具は中央、2段目・3段目は少しずらして隙間から見える（深いほど暗い）
    state.slots.forEach((stack, i) => {
      const top = stack[stack.length - 1];
      const key = stack.map((it) => it.id).join(',');
      if (state.slotKeys[i] === key) return;
      state.slotKeys[i] = key;
      const slotEl = el.pot.children[i];
      slotEl.querySelectorAll('.item:not(.lifted)').forEach((n) => n.remove());
      stack.forEach((it, idx) => {
        const depth = stack.length - 1 - idx; // 0 = 一番上
        const div = document.createElement('div');
        div.className = `item depth-${depth}` + (depth === 0 ? ' top' : '') + (it.fresh ? ' drop' : '');
        div.style.animationDelay = it.fresh ? '' : `${-(it.id % 7) * 0.37}s`;
        div.innerHTML = `<div class="wob">${SVG[it.type]}</div>`;
        slotEl.appendChild(div);
        it.fresh = false;
      });
      slotEl.setAttribute('aria-label', T().slot(i + 1, stack.slice().reverse().map((it) => tn(it.type))));
    });
    if (DEBUG) {
      state.slots.forEach((stack, i) => {
        const slotEl = el.pot.children[i];
        let d = slotEl.querySelector('.dbg');
        if (!d) { d = document.createElement('div'); d.className = 'dbg'; slotEl.appendChild(d); }
        d.textContent = stack.slice().reverse().map((it, k) =>
          T().dbgLayer(k + 1, tn(it.type), state.time - it.enteredAt >= it.cookTime)).join('\n') || T().dbgEmpty;
      });
    }


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
        const cu = el.seats.children[i].querySelector('.customer');
        if (cu) cu.classList.toggle('annoyed', c.annoyedAt !== undefined && state.time - c.annoyedAt < 0.6);
      }
    });
  }

  // 席の描画。HTML を作るのは来店した時だけ（入店アニメも 1 回だけ）。
  // その後は、出した品・帰る時の表情・言語だけを書き換える
  function renderSeat(i) {
    const seatEl = el.seats.children[i];
    const c = state.seats[i];
    seatEl.className = 'seat' + (c ? '' : ' empty');
    if (!c) { seatEl.innerHTML = ''; delete seatEl.dataset.cid; return; }
    if (seatEl.dataset.cid !== String(c.id)) {
      seatEl.dataset.cid = String(c.id);
      seatEl.innerHTML = `
        <div class="customer">
          <div class="bubble">${c.wants.map((w) => `<span class="want">${SVG[w.type]}</span>`).join('')}</div>
          <div class="face"></div>
          <div class="patience"><div></div></div>
        </div>`;
    }
    const cu = seatEl.firstElementChild;
    if (c.leaving) cu.classList.add(`leaving-${c.leaving}`);
    cu.querySelector('.face').textContent = c.leaving === 'happy' ? '😋' : c.leaving === 'angry' ? '😠' : c.face;
    cu.querySelectorAll('.want').forEach((n, k) => {
      n.classList.toggle('served', c.wants[k].served);
      n.title = tn(c.wants[k].type);
    });
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

  // 具がぷるぷる揺れる（Web Animations API。CSS の浮き沈みとは別の要素に掛ける）
  function wobble(slotEl, power) {
    const w = slotEl.querySelector('.item.top .wob');
    if (!w || !w.animate) return;
    const p = power;
    const dir = Math.random() < 0.5 ? -1 : 1;
    w.animate([
      { transform: 'scale(1, 1) rotate(0deg)' },
      { transform: `scale(${1 + 0.18 * p}, ${1 - 0.24 * p}) rotate(0deg)`, offset: 0.12 },
      { transform: `scale(${1 - 0.1 * p}, ${1 + 0.12 * p}) rotate(${8 * p * dir}deg)`, offset: 0.3 },
      { transform: `scale(${1 + 0.06 * p}, ${1 - 0.06 * p}) rotate(${-6 * p * dir}deg)`, offset: 0.48 },
      { transform: `scale(${1 - 0.03 * p}, ${1 + 0.03 * p}) rotate(${3 * p * dir}deg)`, offset: 0.66 },
      { transform: `rotate(${-1.5 * p * dir}deg)`, offset: 0.82 },
      { transform: 'scale(1, 1) rotate(0deg)' },
    ], { duration: 650, easing: 'ease-out' });
  }

  // つついた所に出汁の波紋
  function ripple(slotEl) {
    const r = document.createElement('div');
    r.className = 'ripple';
    slotEl.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }

  // 提供した具を串で持ち上げて消す（render で .item が差し替わる前に複製を作る）
  function liftOut(slotEl) {
    const it = slotEl.querySelector('.item.top');
    if (!it) return;
    const ghost = it.cloneNode(true);
    ghost.className = 'item lifted glow';
    slotEl.appendChild(ghost);
    setTimeout(() => ghost.remove(), 700);
  }

  // 煮えていた（提供できた）瞬間に、仕切りがパッと光ってキラキラが飛ぶ。
  // ※煮えた時点では光らない（見た目で煮え具合がわからないのがこのゲームの肝なので）
  function shine(slotEl, combo) {
    const flash = document.createElement('div');
    flash.className = 'shine';
    slotEl.appendChild(flash);
    const n = Math.min(6 + combo, 14); // コンボが続くほどキラキラが増える
    for (let k = 0; k < n; k++) {
      const sp = document.createElement('div');
      sp.className = 'spark';
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = 40 + Math.random() * 34;
      sp.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      sp.style.setProperty('--dy', `${Math.sin(a) * d}px`);
      sp.style.animationDelay = `${Math.random() * 0.08}s`;
      slotEl.appendChild(sp);
      setTimeout(() => sp.remove(), 800);
    }
    setTimeout(() => flash.remove(), 700);
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

  // ============================================================
  //  アプリ（Android / Capacitor）と広告
  // ============================================================
  // Android アプリ（Capacitor）で動いているか。Web 版では Capacitor がないので何もしない
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const plugin = (name) => (NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null);
  if (NATIVE) document.body.classList.add('native');
  // ads.js が無くても動くように（Web 版でも ads.js は読み込むが、念のため）
  const Ads = window.Ads || {
    available: false, canReward: false, showing: false, privacyOptionsRequired: false,
    initDone: Promise.resolve(), showInterstitial: async () => {}, showRewarded: async () => 'unavailable',
    setBanner() {}, showPrivacyOptions: async () => {},
  };

  // パネル（トップ・あそびかた・ポーズ・コンティニュー・結果）の下のボタン
  function setActions(buttons) {
    el.actions.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = b.primary ? 'start-btn' : 'sub-btn';
      // 主ボタンは従来どおり id="start"（自動テストなどから押せるように）
      if (b.id || b.primary) btn.id = b.id || 'start';
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      el.actions.appendChild(btn);
    }
  }

  function setScreen(name) {
    screen = name;
    renderScreen();
  }

  // 今の画面を今の言語で描く
  function renderScreen() {
    el.pause.disabled = screen !== 'game';
    if (screen === 'game') { el.overlay.classList.add('hidden'); updateBanner(); return; }
    if (screen === 'top') renderTop();
    else if (screen === 'howto') renderHowTo();
    else if (screen === 'pause') renderPause();
    else if (screen === 'continue') renderContinue();
    else if (screen === 'result') renderResult();
    el.overlay.classList.remove('hidden');
    el.panelBody.scrollTop = 0;
    updateBanner();
  }

  // トップ画面：ゲーム名・ひとこと・ベスト記録と「開店する」「あそびかた」だけ
  function renderTop() {
    const art = ['konnyaku', 'tamago', 'daikon', 'cabbage', 'chikuwa'].map((k) => SVG[k]).join('');
    const ver = window.APP_VERSION && window.APP_VERSION !== 'dev' ? `<span>${window.APP_VERSION}</span> · ` : '';
    el.panelBody.innerHTML = `
      <div class="top-art">${art}</div>
      <p class="tagline">${T().tagline}</p>
      <p class="best-line">${T().bestSales(loadBest().toLocaleString())}</p>
      <p class="legal">${ver}<a href="${T().privacyUrl}" target="_blank" rel="noopener">${T().privacy}</a><span id="adPrivacy" ${Ads.privacyOptionsRequired ? '' : 'hidden'}> · <a href="#" id="adPrivacyLink">${T().adSettings}</a></span></p>`;
    const link = document.getElementById('adPrivacyLink');
    link.addEventListener('click', (e) => { e.preventDefault(); Ads.showPrivacyOptions(); });
    setActions([
      { label: T().play, primary: true, onClick: play },
      { label: T().howto, onClick: () => setScreen('howto') },
    ]);
  }

  // あそびかた画面：ルールと具のメニュー
  function renderHowTo() {
    const menu = Object.keys(TYPES).map((k) => `<div>${SVG[k]}${tn(k)}</div>`).join('');
    el.panelBody.innerHTML = `
      <ul class="rules">${T().rules.map((r) => `<li>${r}</li>`).join('')}</ul>
      <div class="menu">${menu}</div>`;
    setActions([
      { label: T().play, primary: true, onClick: play },
      { label: T().toTop, onClick: goTop },
    ]);
  }

  function renderPause() {
    el.panelBody.innerHTML = `<p class="big-msg">${T().paused}</p>
      <p class="best-line">¥${state.score.toLocaleString()} · ${Math.max(0, Math.ceil(CONFIG.gameLength - state.time))}s</p>`;
    setActions([
      { label: T().resume, primary: true, onClick: resume },
      { label: T().toTop, onClick: goTop },
    ]);
  }

  // ---------- 全画面広告（Android アプリのみ） ----------
  // 「開店する」（トップ・あそびかたから）、「トップへ」（あそびかた・ポーズ・結果から）、
  // ポーズ画面からの「再開」、結果画面の「もう一度」のたびに毎回出す
  let adBusy = false;
  async function withInterstitial(next) {
    if (adBusy) return;
    if (Ads.available) {
      adBusy = true;
      el.overlay.classList.add('busy');
      updateBanner();
      await Ads.showInterstitial(3000);
      el.overlay.classList.remove('busy');
      adBusy = false;
    }
    next();
  }
  function play() { withInterstitial(startGame); }
  function goTop() {
    withInterstitial(() => {
      if (state) { state.running = false; state.paused = false; state.offering = false; }
      BGM.stop();
      stopContinueTimer();
      setScreen('top');
    });
  }
  function pauseGame() {
    if (screen !== 'game' || !state.running || state.offering) return;
    state.paused = true;
    BGM.stop();
    setScreen('pause');
  }
  function resume() {
    withInterstitial(() => {
      if (screen !== 'pause') return;
      state.paused = false;
      setScreen('game');
      BGM.start();
    });
  }

  // ---------- バナー広告：トップ・あそびかた・ポーズ・結果画面だけ（プレイ中は鍋と重なるので出さない） ----------
  function updateBanner() {
    Ads.setBanner(!adBusy && ['top', 'howto', 'pause', 'result'].includes(screen));
  }

  // ---------- リワード広告のチート：評判（♥）が尽きたら、広告を見て ♥1 で営業を続ける ----------
  // お客さんが怒って帰るところ（失敗の様子）を見届けられるよう少し待ってから案内し、数秒で自動的に閉店へ進む
  const CONTINUE_DELAY = 2.5; // 案内を出すまでの秒数
  const CONTINUE_WAIT = 8;    // 案内を出しておく秒数
  const CONTINUE_MAX = 2;     // 1 ゲームで使える回数
  const cont = { timer: 0, left: 0, busy: false, note: '' };
  function canContinue() { return Ads.canReward && state.continues < CONTINUE_MAX; }
  function offerContinue() {
    state.paused = true;
    state.offering = true;
    BGM.stop();
    const s = state;
    setTimeout(() => {
      if (state !== s || !s.offering) return;
      Object.assign(cont, { left: CONTINUE_WAIT, busy: false, note: '' });
      setScreen('continue');
      stopContinueTimer();
      cont.timer = setInterval(() => {
        if (cont.busy || screen !== 'continue') return;
        cont.left--;
        if (cont.left <= 0) declineContinue();
        else { const b = document.getElementById('cont-no'); if (b) b.textContent = T().contNo(cont.left); }
      }, 1000);
    }, CONTINUE_DELAY * 1000);
  }
  function stopContinueTimer() { clearInterval(cont.timer); cont.timer = 0; }
  function renderContinue() {
    el.panelBody.innerHTML = `
      <p class="big-msg">${T().contTitle}</p>
      <p class="cont-msg">${T().contMsg}</p>
      <p class="best-line">${cont.note || T().contLeft(CONTINUE_MAX - state.continues)}</p>`;
    setActions([
      { label: cont.busy ? T().contLoading : T().contWatch, primary: true, id: 'cont-watch', onClick: watchContinue },
      { label: T().contNo(cont.left), id: 'cont-no', onClick: declineContinue },
    ]);
    if (cont.busy) document.getElementById('cont-watch').disabled = true;
  }
  function declineContinue() {
    if (screen !== 'continue' || cont.busy) return;
    stopContinueTimer();
    state.offering = false;
    state.paused = false;
    endGame();
  }
  async function watchContinue() {
    if (screen !== 'continue' || cont.busy) return;
    cont.busy = true;
    renderContinue();
    const result = await Ads.showRewarded();
    cont.busy = false;
    if (screen !== 'continue') return;
    if (result === 'unavailable') {
      cont.note = T().contFail;
      renderContinue();
      document.getElementById('cont-watch').disabled = true;
      setTimeout(declineContinue, 2000);
      return;
    }
    if (result !== 'rewarded') { declineContinue(); return; }
    // 最後まで見たら ♥1 で再開。待っているお客さんも少し落ち着く（すぐにまた帰らないように）
    stopContinueTimer();
    state.continues++;
    state.hearts = 1;
    for (const c of state.seats) {
      if (c && !c.leaving) c.leftAt = Math.max(c.leftAt, state.time + c.patience * 0.5);
    }
    state.offering = false;
    state.paused = false;
    setScreen('game');
    toast(T().contDone);
    BGM.start();
  }

  function startGame() {
    stopContinueTimer();
    state = newState();
    buildBoard();
    el.toast.textContent = T().welcome;
    setScreen('game');
    fitPot();
    state.running = true;
    // 開店と同時に全席満席でスタート。最初のお客さんは仕込みの具（煮えている）をちょうど分け合って注文する
    const prepped = prepPot().sort(() => Math.random() - 0.5);
    const sizes = Array(CONFIG.seats).fill(1);
    for (let k = CONFIG.seats; k < prepped.length; k++) sizes[k % CONFIG.seats]++;
    sizes.sort(() => Math.random() - 0.5);
    let cursor = 0;
    for (const n of sizes) {
      if (cursor >= prepped.length) break;
      spawnCustomer(prepped.slice(cursor, cursor + n));
      cursor += n;
    }
    toast(T().welcomeFull);
    state.nextSpawn = 2;
    BGM.start();
  }

  // ============================================================
  //  シェア
  // ============================================================
  function shareText() {
    const stay = state.hearts <= 0 ? T().stayClosed(Math.floor(state.time)) : T().stayDone;
    return T().shareText(state.score.toLocaleString(), stay, state.served, state.happy, state.continues);
  }

  // シェアするURL（紹介記事）
  const SHARE_URL = 'https://techgym.jp/column/claude-code-game-oden/';
  function gameUrl() { return SHARE_URL; }

  function setupShare() {
    const text = shareText();
    const url = gameUrl();
    const x = document.getElementById('share-x');
    x.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    const btn = document.getElementById('share');
    btn.addEventListener('click', async () => {
      // Android アプリでは Android の共有メニュー
      const nativeShare = plugin('Share');
      if (nativeShare) {
        try { await nativeShare.share({ title: T().docTitle, text, url, dialogTitle: T().share }); } catch (e) { /* キャンセル */ }
        return;
      }
      // スマホなどは OS の共有シート、使えなければクリップボードにコピー
      if (navigator.share) {
        try { await navigator.share({ title: T().docTitle, text, url }); return; } catch (e) {
          if (e && e.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        btn.textContent = T().copied;
      } catch (_) {
        window.prompt(T().copyPrompt, `${text}\n${url}`);
      }
    });
  }

  let lastResult = null;
  function endGame() {
    state.running = false;
    BGM.stop();
    const best = loadBest();
    const isBest = state.score > best;
    if (isBest) saveBest(state.score);
    lastResult = { best, isBest };
    setScreen('result');
  }

  function renderResult() {
    const { best, isBest } = lastResult;
    el.panelBody.innerHTML = `
      <p style="margin:0 0 4px;font-weight:800">${state.hearts <= 0 ? T().closed : T().done}</p>
      <div class="result">
        <div>${T().resSales}</div>
        <div class="big">¥${state.score.toLocaleString()}</div>
        ${isBest ? `<div style="color:var(--accent);font-weight:800">${T().newBest}</div>` : `<div>${T().best(Math.max(best, state.score).toLocaleString())}</div>`}
        <div>${T().served(state.served)}</div>
        <div>${T().happy(state.happy)}</div>
        <div>${T().angry(state.angry)}</div>
        ${state.continues ? `<div>${T().continues(state.continues)}</div>` : ''}
      </div>
      <div class="share">
        <button id="share" class="share-btn" type="button">${T().share}</button>
        <a id="share-x" class="share-btn x" target="_blank" rel="noopener">${T().shareX}</a>
      </div>`;
    setupShare();
    setActions([
      { label: T().again, primary: true, onClick: play },
      { label: T().toTop, onClick: goTop },
    ]);
  }

  // 鍋が画面の下からはみ出さないよう、残りの高さに合わせて幅を決める（3:2）
  function fitPot() {
    const box = el.full.parentElement;
    box.style.maxWidth = '';
    const top = box.getBoundingClientRect().top + window.scrollY;
    const hint = document.querySelector('.pot-hint');
    const hintH = hint && hint.offsetParent ? hint.offsetHeight + 8 : 0;
    const avail = window.innerHeight - top - hintH - 10;
    box.style.maxWidth = `${Math.max(200, Math.min(480, avail * 1.5))}px`;
  }

  // 画面上の固定テキストを今の言語で書き換える
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = T().docTitle;
    document.querySelectorAll('[data-i18n]').forEach((n) => { n.innerHTML = T()[n.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-aria]').forEach((n) => { n.setAttribute('aria-label', T()[n.dataset.i18nAria]); });
    el.langBtns.forEach((b) => { b.textContent = T().langBtn; b.setAttribute('aria-label', T().langAria); });
    if (state) {
      state.seats.forEach((c) => { if (c) c.dirty = true; });
      state.slotKeys.fill('');
    }
    renderScreen();
    fitPot();
  }


  // ============================================================
  //  初期化
  // ============================================================
  el.pause.addEventListener('click', pauseGame);

  // 裏に回ったら一時停止して音を止める（広告の表示中は広告側が音を止めている）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseGame();
      Sound.suspend();
    } else if (!Ads.showing) {
      Sound.resume();
    }
  });

  // Android の戻るボタン：プレイ中はポーズ（ポーズ中なら再開）、あそびかたはトップへ、
  // トップ・結果画面ではアプリを終了、コンティニューの案内では「やめる」
  if (plugin('App')) {
    plugin('App').addListener('backButton', () => {
      if (adBusy || Ads.showing) return;
      if (screen === 'top' || screen === 'result') plugin('App').exitApp();
      else if (screen === 'howto') goTop();
      else if (screen === 'game') pauseGame();
      else if (screen === 'pause') resume();
      else if (screen === 'continue') declineContinue();
    });
  }

  // EU など同意が必要な地域では、トップ画面に「広告の設定」を出す
  Ads.initDone.then(() => { if (screen === 'top') renderTop(); });
  el.mute.addEventListener('click', () => {
    muted = !muted;
    el.mute.textContent = muted ? '🔇' : '🔊';
    if (muted) BGM.stop();
    else if (screen === 'game' && state && state.running && !state.paused) BGM.start();
  });

  el.langBtns.forEach((b) => b.addEventListener('click', () => {
    lang = lang === 'ja' ? 'en' : 'ja';
    try { localStorage.setItem('oden-lang', lang); } catch (_) { /* noop */ }
    applyLang();
  }));

  window.addEventListener('resize', fitPot);

  state = newState();
  buildBoard();
  applyLang();
  lastFrame = performance.now();
  rafId = requestAnimationFrame(tick);
})();
