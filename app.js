/* =========================================================
   ひらがな Cartas — lógica do jogo
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------------- Estado e persistência ---------------- */
  const STORE_KEY = 'hiraganaCartas.v1';
  const state = {
    selectedRows: new Set(['a', 'k']), progress: {}, best: 0,
    words: {},           // progresso por palavra { c, w } (Fases 2 e 3)
    p2: { c: 0, w: 0 },  // palavras montadas certas/erradas (Fase 2)
    review: [],          // palavras erradas para revisar (Fase 3)
    phase: 1,            // fase aberta na tela inicial
    unlocked: [1],       // fases desbloqueadas (não voltam a bloquear)
  };
  const BY_KANA = Object.fromEntries(HIRAGANA.map(h => [h.k, h]));
  const BY_WORD = Object.fromEntries(WORDS.map(w => [w.k, w]));

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY));
      if (d) {
        state.progress = d.progress || {};
        state.best = d.best || 0;
        if (Array.isArray(d.rows)) state.selectedRows = new Set(d.rows);
        state.words = d.words || {};
        state.p2 = d.p2 || { c: 0, w: 0 };
        state.review = Array.isArray(d.review) ? d.review.filter(k => BY_WORD[k]) : [];
        state.phase = [1, 2, 3].includes(d.phase) ? d.phase : 1;
        state.unlocked = Array.isArray(d.unlocked) ? d.unlocked : [1];
      }
    } catch (e) { /* ignora dados corrompidos */ }
  }
  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      progress: state.progress, best: state.best, rows: [...state.selectedRows],
      words: state.words, p2: state.p2, review: state.review, phase: state.phase, unlocked: state.unlocked,
    }));
  }

  const sound = h => h.s || h.r;

  // か↔が, は↔ば↔ぱ... (mesma posição na família com/sem dakuten)
  const SIBLING_ROWS = { k: ['g'], s: ['z'], t: ['d'], h: ['b', 'p'], g: ['k'], z: ['s'], d: ['t'], b: ['h', 'p'], p: ['h', 'b'] };
  function siblings(h) {
    const rows = SIBLING_ROWS[h.row] || [];
    const idx = HIRAGANA.filter(x => x.row === h.row).indexOf(h);
    return rows.map(r => HIRAGANA.filter(x => x.row === r)[idx]).filter(Boolean);
  }
  const pool = () => HIRAGANA.filter(h => state.selectedRows.has(h.row));

  function record(k, ok) {
    const p = state.progress[k] || (state.progress[k] = { c: 0, w: 0 });
    ok ? p.c++ : p.w++;
    save();
  }
  function level(k) {
    const p = state.progress[k];
    if (!p || p.c + p.w === 0) return 0;
    const r = p.c / (p.c + p.w);
    if (p.c >= 6 && r >= 0.85) return 3;
    if (p.c >= 3 && r >= 0.6) return 2;
    return 1;
  }
  // caracteres fracos ou nunca vistos aparecem com mais frequência
  function weight(h) {
    const p = state.progress[h.k] || { c: 0, w: 0 };
    let w = 1 + (p.w * 2) / (p.c + 1);
    if (p.c + p.w === 0) w += 0.6;
    if (level(h.k) === 3) w *= 0.5;
    return w;
  }

  function shuffle(a) {
    const arr = [...a];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function weightedSample(items, n, wfn = weight) {
    const arr = [...items], out = [];
    while (out.length < n && arr.length) {
      const total = arr.reduce((s, x) => s + wfn(x), 0);
      let r = Math.random() * total, i = 0;
      for (; i < arr.length; i++) { r -= wfn(arr[i]); if (r <= 0) break; }
      out.push(arr.splice(Math.min(i, arr.length - 1), 1)[0]);
    }
    return out;
  }

  /* ---------------- Áudio ---------------- */
  const Speech = {
    voice: null, warned: false,
    init() {
      if (!('speechSynthesis' in window)) return;
      const pick = () => {
        const vs = speechSynthesis.getVoices();
        const ja = vs.filter(v => (v.lang || '').replace('_', '-').toLowerCase().startsWith('ja'));
        this.voice = ja.find(v => /google/i.test(v.name)) || ja.find(v => /natural|online/i.test(v.name)) || ja[0] || null;
      };
      pick();
      speechSynthesis.onvoiceschanged = pick;
    },
    ok() {
      if (!('speechSynthesis' in window)) { toast('Seu navegador não suporta voz sintetizada.'); return false; }
      return true;
    },
    make(text, rate) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = rate;
      if (this.voice) u.voice = this.voice;
      else if (!this.warned) {
        this.warned = true;
        toast('Nenhuma voz japonesa encontrada. No Windows: Configurações → Hora e idioma → Fala → adicionar voz em japonês.', 6000);
      }
      return u;
    },
    say(text, rate = 0.75) {
      if (!this.ok()) return;
      speechSynthesis.cancel();
      speechSynthesis.speak(this.make(text, rate));
    },
    // fala cada parte separada (す… し…) e depois a palavra inteira (すし)
    sayParts(parts, whole, rate = 0.6) {
      if (!this.ok()) return;
      speechSynthesis.cancel();
      parts.forEach(p => speechSynthesis.speak(this.make(p, rate)));
      if (whole) speechSynthesis.speak(this.make(whole, 0.8));
    },
  };

  const Sfx = {
    ctx: null,
    tone(freqs, dur = 0.12, type = 'sine', gain = 0.07) {
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const t0 = this.ctx.currentTime;
        freqs.forEach((f, i) => {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = type; o.frequency.value = f;
          const st = t0 + i * dur * 0.75;
          g.gain.setValueAtTime(0, st);
          g.gain.linearRampToValueAtTime(gain, st + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
          o.connect(g).connect(this.ctx.destination);
          o.start(st); o.stop(st + dur + 0.03);
        });
      } catch (e) { /* sem áudio */ }
    },
    good() { this.tone([660, 990], 0.14, 'triangle'); },
    bad() { this.tone([240, 170], 0.2, 'square', 0.035); },
    flip() { this.tone([540], 0.07, 'sine', 0.04); },
    win() { this.tone([523, 659, 784, 1047], 0.18, 'triangle', 0.08); },
  };

  /* ---------------- UI utilitária ---------------- */
  let toastTimer;
  function toast(msg, ms = 3200) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  function confetti(n = 90) {
    const wrap = $('#confetti');
    const colors = ['#f7a1c0', '#ffd36e', '#a98bff', '#5fe0b4', '#ffffff', '#ff7a8a'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.className = 'confetto';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.setProperty('--x', (Math.random() * 200 - 100) + 'px');
      c.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
      c.style.setProperty('--d', (2 + Math.random() * 1.8) + 's');
      c.style.animationDelay = Math.random() * 0.4 + 's';
      wrap.appendChild(c);
      setTimeout(() => c.remove(), 4500);
    }
  }

  function floatText(text, x, y, color) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function makePetals() {
    const wrap = $('#petals');
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.setProperty('--s', (8 + Math.random() * 10) + 'px');
      p.style.setProperty('--d', (10 + Math.random() * 12) + 's');
      p.style.setProperty('--delay', (-Math.random() * 20) + 's');
      p.style.setProperty('--sway', (Math.random() * 160 - 80) + 'px');
      wrap.appendChild(p);
    }
  }

  function show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function activeScreen() { return $('.screen.active').id; }

  function openModal(id) { const m = $('#' + id); m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); }
  function closeModal(id) { const m = $('#' + id); m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); }
  function anyModalOpen() { return !!$('.modal.open'); }

  function setProgress(el, frac) { $(el).style.width = Math.max(0, Math.min(1, frac)) * 100 + '%'; }

  /* ---------------- Resumo genérico ---------------- */
  function openSummary({ kanji = '完', title, big, bigLabel, lines = [], mistakes = [], actions = [] }) {
    $('#sum-kanji').textContent = kanji;
    $('#sum-title').textContent = title;
    $('#sum-big').textContent = big;
    $('#sum-big-label').textContent = bigLabel || '';
    $('#sum-lines').innerHTML = lines.map(l => `<li>${l}</li>`).join('');
    const uniq = [...new Map(mistakes.map(h => [h.k, h])).values()];
    $('#sum-mistakes').innerHTML = uniq.length
      ? `<p>Para revisar:</p><div class="mistake-list">${uniq.map(h => `<span class="mistake-chip"><b>${h.k}</b><small>${h.r}</small></span>`).join('')}</div>`
      : '';
    const wrap = $('#sum-actions');
    wrap.innerHTML = '';
    actions.forEach(a => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.cls || 'btn-ghost');
      b.textContent = a.label;
      b.onclick = () => { closeModal('summary-modal'); a.fn(); };
      wrap.appendChild(b);
    });
    openModal('summary-modal');
  }

  function goHome() {
    Memory.stopTimer();
    Study.token++; Quiz.token++; Memory.token++; Build.token++; Meaning.token++;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    show('screen-home');
    renderHome();
    announceUnlocks();
  }

  /* ================= TELA INICIAL ================= */
  function renderHome() {
    checkUnlocks();
    renderPhaseNav();
    renderChips();
    renderStats();
    renderTable();
    showPhase(state.phase, false);
  }

  function renderChips() {
    const wrap = $('#row-chips');
    wrap.innerHTML = '';
    ROWS.forEach(row => {
      const on = state.selectedRows.has(row.id);
      const chars = HIRAGANA.filter(h => h.row === row.id).map(h => h.k).join(' ');
      const st = rowStats(row.id);
      const b = document.createElement('button');
      b.className = 'chip' + (on ? ' on' : '') + (row.group === 'dakuten' ? ' daku' : '') + (st.mastered ? ' mastered' : '');
      b.id = 'row-' + row.id;
      b.setAttribute('aria-pressed', on);
      b.title = st.seen ? `${Math.round(st.acc * 100)}% de acerto · ${st.seen}/${st.n} vistos` + (st.mastered ? ' · dominada' : '') : 'Ainda não praticada';
      b.innerHTML = `<span class="chip-kana">${row.label}</span><span class="chip-meta"><b>${row.name}</b><small>${chars}</small></span><span class="chip-bar"><i style="width:${Math.round(st.progress * 100)}%"></i></span>`;
      b.onclick = () => {
        on ? state.selectedRows.delete(row.id) : state.selectedRows.add(row.id);
        save(); renderChips();
      };
      wrap.appendChild(b);
    });
    $('#sel-count').textContent = pool().length;
  }

  function renderStats() {
    const keys = HIRAGANA.map(h => h.k);
    $('#stat-mastered').textContent = `${keys.filter(k => level(k) === 3).length}/${keys.length}`;
    $('#stat-seen').textContent = keys.filter(k => level(k) > 0).length;
    $('#stat-best').textContent = state.best;
    $('#stat-words').textContent = `${WORDS.filter(w => wlevel(w.k) === 3).length}/${WORDS.length}`;
  }

  function renderTable() {
    const wrap = $('#kana-table');
    wrap.innerHTML = '';
    const block = (layout, title) => {
      const sec = document.createElement('div');
      sec.className = 'ktable-block';
      sec.innerHTML = `<h3>${title}</h3>`;
      const g = document.createElement('div');
      g.className = 'ktable';
      layout.flat().forEach(k => {
        if (!k) { const e = document.createElement('div'); e.className = 'kcell empty'; g.appendChild(e); return; }
        const h = BY_KANA[k];
        const b = document.createElement('button');
        b.className = `kcell lv${level(k)}`;
        b.id = 'cell-' + h.r + '-' + h.row;
        b.innerHTML = `<span class="kc-k">${k}</span><span class="kc-r">${h.r}</span>`;
        b.onclick = () => openDetail(h);
        g.appendChild(b);
      });
      sec.appendChild(g);
      wrap.appendChild(sec);
    };
    block(TABLE_BASIC, 'Básicos · gojūon');
    block(TABLE_DAKU, 'Dakuten ゛ e handakuten ゜');
  }

  let detailChar = null;
  function openDetail(h) {
    detailChar = h;
    $('#d-kana').textContent = h.k;
    $('#d-romaji').textContent = h.r;
    $('#d-tip').textContent = h.tip;
    $('#d-word-jp').textContent = h.w[0];
    $('#d-word-jp').style.cursor = 'pointer';
    $('#d-word-jp').onclick = () => Speech.say(h.w[0]);
    $('#d-word-r').textContent = h.w[1];
    $('#d-word-pt').textContent = h.w[2];
    const p = state.progress[h.k] || { c: 0, w: 0 };
    const lvName = ['novo', 'aprendendo', 'bom', 'dominado'][level(h.k)];
    $('#d-meta').textContent = `${strokesText(h)} · ${p.c} acertos · ${p.w} erros · ${lvName}`;
    openModal('detail-modal');
    Speech.say(h.k);
  }

  function strokesText(h) {
    return `${h.st} traço${h.st > 1 ? 's' : ''}` + (h.alt ? ` (ou ${h.alt})` : '');
  }

  function requirePool(min = 4) {
    if (pool().length < min) {
      toast(`Selecione pelo menos ${min} caracteres (uma ou mais famílias).`);
      $('#row-chips').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  /* ================= ESTUDAR (flashcards) ================= */
  const Study = {
    deck: [], i: 0, flipped: false, known: [], unknown: [], busy: false, token: 0,

    start(cards) {
      this.token++;
      this.deck = cards ? shuffle(cards) : weightedSample(pool(), pool().length);
      this.i = 0; this.known = []; this.unknown = [];
      show('screen-study');
      this.render();
    },
    get cur() { return this.deck[this.i]; },

    render() {
      const h = this.cur, card = $('#flashcard');
      card.classList.add('no-anim');
      card.classList.remove('flipped', 'swipe-left', 'swipe-right', 'deal');
      this.flipped = false;
      $('#fc-kana').textContent = h.k;
      $('#fc-kana-back').textContent = h.k;
      $('#fc-romaji').textContent = h.r;
      $('#fc-tip').textContent = h.tip;
      $('#fc-word-jp').textContent = h.w[0];
      $('#fc-word-jp').style.cursor = 'pointer';
      $('#fc-word-jp').onclick = () => Speech.say(h.w[0]);
      $('#fc-word-r').textContent = h.w[1];
      $('#fc-word-pt').textContent = h.w[2];
      $('#fc-strokes').textContent = strokesText(h);
      $('#study-counter').textContent = `${this.i + 1} / ${this.deck.length}`;
      setProgress('#study-progress', this.i / this.deck.length);
      void card.offsetWidth; // reflow
      card.classList.remove('no-anim');
      card.classList.add('deal');
      this.busy = false;
    },

    flip() {
      if (this.busy) return;
      this.flipped = !this.flipped;
      $('#flashcard').classList.remove('deal');
      $('#flashcard').classList.toggle('flipped', this.flipped);
      Sfx.flip();
      if (this.flipped) Speech.say(this.cur.k);
    },

    answer(ok) {
      if (this.busy) return;
      this.busy = true;
      const h = this.cur;
      record(h.k, ok);
      (ok ? this.known : this.unknown).push(h);
      ok ? Sfx.good() : Sfx.bad();
      const card = $('#flashcard');
      card.classList.remove('deal');
      card.classList.add(ok ? 'swipe-right' : 'swipe-left');
      const tk = this.token;
      setTimeout(() => {
        if (tk !== this.token) return;
        this.i++;
        if (this.i >= this.deck.length) this.finish();
        else this.render();
      }, 360);
    },

    finish() {
      setProgress('#study-progress', 1);
      const n = this.deck.length, k = this.known.length;
      if (k / n >= 0.8) { confetti(); Sfx.win(); }
      const actions = [];
      if (this.unknown.length) actions.push({ label: `Revisar ${this.unknown.length} difíceis`, cls: 'btn-wrong', fn: () => this.start(this.unknown) });
      actions.push({ label: 'Testar no quiz', cls: 'btn-next', fn: () => Quiz.start() });
      actions.push({ label: 'Menu', fn: goHome });
      openSummary({
        kanji: '学', title: 'Baralho concluído!',
        big: `${k}/${n}`, bigLabel: 'cartas que você já sabe',
        mistakes: this.unknown, actions,
      });
    },
  };

  /* ================= QUIZ ================= */
  const Quiz = {
    dir: 'k2r', total: 15, qs: [], i: 0, score: 0, streak: 0, maxStreak: 0, correct: 0, mistakes: [], locked: false, opts: [], token: 0,

    start() {
      this.token++;
      const p = pool();
      let qs = weightedSample(p, Math.min(this.total, p.length));
      while (qs.length < this.total) {
        for (const e of weightedSample(p, p.length)) {
          if (qs.length >= this.total) break;
          if (qs[qs.length - 1] !== e) qs.push(e);
        }
      }
      this.qs = qs;
      this.i = 0; this.score = 0; this.streak = 0; this.maxStreak = 0; this.correct = 0; this.mistakes = [];
      show('screen-quiz');
      this.updateHud();
      this.render();
    },
    get cur() { return this.qs[this.i]; },

    buildOptions(h) {
      const p = pool();
      const src = p.length >= 4 ? p : HIRAGANA;
      const used = new Set([sound(h)]);
      const opts = [h];
      const add = c => { if (c && !used.has(sound(c)) && opts.length < 4) { opts.push(c); used.add(sound(c)); } };
      // até 2 alternativas "parecidas" (visualmente ou mesma família de dakuten)
      const conf = (CONFUSABLES[h.k] || []).map(k => BY_KANA[k]).concat(siblings(h));
      shuffle(conf.filter(c => src.includes(c))).slice(0, 2).forEach(add);
      shuffle(src).forEach(add);
      shuffle(HIRAGANA).forEach(add);
      return shuffle(opts);
    },

    render() {
      const h = this.cur;
      this.locked = false;
      const card = $('#q-card');
      card.classList.remove('pop', 'sound');
      void card.offsetWidth;
      card.classList.add('pop');
      if (this.dir === 'k2r') {
        card.innerHTML = `<span class="q-kana">${h.k}</span>`;
        $('#q-prompt').textContent = 'Qual é o som desta carta?';
      } else if (this.dir === 'r2k') {
        card.innerHTML = `<span class="q-romaji">${h.r}</span>`;
        $('#q-prompt').textContent = 'Qual carta tem este som?';
      } else {
        card.classList.add('sound');
        card.innerHTML = `<span class="speaker">🔊</span>`;
        $('#q-prompt').textContent = 'Ouça e escolha o hiragana (toque para repetir)';
        setTimeout(() => Speech.say(h.k), 250);
      }
      this.opts = this.buildOptions(h);
      const wrap = $('#q-options');
      wrap.innerHTML = '';
      const showKana = this.dir !== 'k2r';
      this.opts.forEach((o, idx) => {
        const b = document.createElement('button');
        b.className = 'opt paper';
        b.id = 'q-opt-' + (idx + 1);
        b.innerHTML = `<span class="num">${idx + 1}</span>` +
          (showKana ? `<span class="o-kana">${o.k}</span>` : `<span class="o-romaji">${o.r}</span>`);
        b.onclick = e => this.choose(idx, b, e);
        wrap.appendChild(b);
      });
      setProgress('#quiz-progress', this.i / this.total);
    },

    choose(idx, btn) {
      if (this.locked) return;
      this.locked = true;
      const h = this.cur, picked = this.opts[idx];
      const ok = picked === h;
      record(h.k, ok);
      const buttons = $$('#q-options .opt');
      const rect = btn.getBoundingClientRect();
      buttons.forEach((b, i) => {
        b.disabled = true;
        const o = this.opts[i];
        if (o === h) {
          b.classList.add('correct');
          // mostra o "outro lado" da carta
          b.insertAdjacentHTML('beforeend', `<span class="o-sub">${this.dir === 'k2r' ? o.k : o.r}</span>`);
        } else if (i === idx) {
          b.classList.add('wrong');
          b.insertAdjacentHTML('beforeend', `<span class="o-sub">${this.dir === 'k2r' ? o.k : o.r}</span>`);
        } else b.classList.add('dim');
      });
      if (ok) {
        this.correct++;
        this.streak++;
        this.maxStreak = Math.max(this.maxStreak, this.streak);
        const pts = 10 + Math.min(this.streak - 1, 10) * 2;
        this.score += pts;
        Sfx.good();
        floatText(`+${pts}`, rect.left + rect.width / 2, rect.top, 'hsl(158 70% 60%)');
        if (this.streak > state.best) { state.best = this.streak; save(); }
      } else {
        this.streak = 0;
        this.mistakes.push(h);
        Sfx.bad();
      }
      if (this.dir !== 's2k' || !ok) setTimeout(() => Speech.say(h.k), ok ? 0 : 350);
      this.updateHud();
      const tk = this.token;
      setTimeout(() => this.next(tk), ok ? 950 : 1900);
    },

    next(tk) {
      if (tk !== this.token || activeScreen() !== 'screen-quiz') return;
      this.i++;
      if (this.i >= this.total) this.finish();
      else this.render();
    },

    updateHud() {
      $('#quiz-score').textContent = this.score;
      $('#quiz-streak').textContent = this.streak;
      $('#quiz-streak-wrap').classList.toggle('hot', this.streak >= 5);
    },

    finish() {
      setProgress('#quiz-progress', 1);
      const acc = Math.round((this.correct / this.total) * 100);
      if (acc >= 80) { confetti(); Sfx.win(); }
      const title = acc === 100 ? 'Perfeito! すごい！' : acc >= 80 ? 'Excelente! よくできました' : acc >= 50 ? 'Bom trabalho!' : 'Continue praticando!';
      const actions = [{ label: 'Jogar de novo', cls: 'btn-next', fn: () => this.start() }];
      if (this.mistakes.length) actions.unshift({ label: 'Estudar erros', cls: 'btn-wrong', fn: () => Study.start([...new Set(this.mistakes)]) });
      actions.push({ label: 'Menu', fn: goHome });
      openSummary({
        kanji: acc >= 80 ? '優' : acc >= 50 ? '良' : '可',
        title, big: `${acc}%`, bigLabel: 'de acertos',
        lines: [`⭐ ${this.score} pontos`, `✅ ${this.correct}/${this.total}`, `🔥 maior sequência: ${this.maxStreak}`],
        mistakes: this.mistakes, actions,
      });
    },
  };

  /* ================= MEMÓRIA ================= */
  const Memory = {
    pairs: 6, cards: [], open: [], lock: false, moves: 0, matched: 0, total: 0, t0: 0, timer: null, token: 0,

    start() {
      this.token++;
      const p = pool();
      const chosen = [], used = new Set();
      for (const h of weightedSample(p, p.length)) {
        if (chosen.length >= this.pairs) break;
        if (!used.has(sound(h))) { chosen.push(h); used.add(sound(h)); }
      }
      this.total = chosen.length;
      this.cards = shuffle(chosen.flatMap(h => [{ h, type: 'k' }, { h, type: 'r' }]));
      this.open = []; this.lock = false; this.moves = 0; this.matched = 0;
      show('screen-memory');
      this.renderGrid();
      this.stopTimer();
      this.t0 = 0;
      $('#mem-time').textContent = '0:00';
      $('#mem-moves').textContent = '0';
    },

    renderGrid() {
      const grid = $('#mem-grid');
      const n = this.cards.length;
      const cols = n <= 12 ? 4 : n <= 16 ? 4 : 5;
      grid.style.setProperty('--cols', cols);
      grid.innerHTML = '';
      this.cards.forEach((c, i) => {
        const b = document.createElement('button');
        b.className = 'mcard';
        b.id = 'mem-card-' + i;
        b.style.animationDelay = (i * 0.03) + 's';
        b.setAttribute('aria-label', 'Carta virada');
        b.innerHTML = `<div class="mcard-inner">
            <div class="mface mback"><span>ひ</span></div>
            <div class="mface mfront paper">
              <span class="m-tag">${c.type === 'k' ? 'kana' : 'som'}</span>
              ${c.type === 'k' ? `<span class="m-kana">${c.h.k}</span>` : `<span class="m-romaji">${c.h.r}</span>`}
            </div>
          </div>`;
        b.onclick = () => this.flip(i, b);
        c.el = b;
        grid.appendChild(b);
      });
    },

    startTimer() {
      this.t0 = Date.now();
      this.timer = setInterval(() => { $('#mem-time').textContent = this.elapsed(); }, 500);
    },
    stopTimer() { clearInterval(this.timer); this.timer = null; },
    elapsed() {
      const s = Math.floor((Date.now() - this.t0) / 1000);
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    },

    flip(i, el) {
      const c = this.cards[i];
      if (this.lock || c.done || this.open.includes(c)) return;
      if (!this.timer && this.matched === 0 && this.moves === 0 && this.open.length === 0) this.startTimer();
      el.classList.add('open');
      el.setAttribute('aria-label', c.type === 'k' ? c.h.k : c.h.r);
      Sfx.flip();
      if (c.type === 'k') Speech.say(c.h.k);
      this.open.push(c);
      if (this.open.length < 2) return;

      this.moves++;
      $('#mem-moves').textContent = this.moves;
      const [a, b] = this.open;
      const tk = this.token;
      if (a.h === b.h) {
        a.done = b.done = true;
        this.open = [];
        setTimeout(() => {
          a.el.classList.add('matched'); b.el.classList.add('matched');
          Sfx.good();
          Speech.say(a.h.k);
          record(a.h.k, true);
        }, 250);
        this.matched++;
        if (this.matched === this.total) setTimeout(() => { if (tk === this.token) this.finish(); }, 900);
      } else {
        this.lock = true;
        setTimeout(() => {
          a.el.classList.add('miss'); b.el.classList.add('miss');
          Sfx.bad();
        }, 450);
        setTimeout(() => {
          if (tk !== this.token) return;
          [a, b].forEach(x => { x.el.classList.remove('open', 'miss'); x.el.setAttribute('aria-label', 'Carta virada'); });
          this.open = [];
          this.lock = false;
        }, 1150);
      }
    },

    finish() {
      this.stopTimer();
      const time = this.elapsed();
      const eff = this.total / this.moves;
      confetti(); Sfx.win();
      const stars = eff >= 0.7 ? '★★★' : eff >= 0.45 ? '★★☆' : '★☆☆';
      openSummary({
        kanji: '憶', title: 'Todos os pares encontrados!',
        big: stars, bigLabel: 'eficiência',
        lines: [`🃏 ${this.moves} jogadas`, `⏱️ ${time}`, `🎯 ${this.total} pares`],
        actions: [
          { label: 'Jogar de novo', cls: 'btn-next', fn: () => this.start() },
          { label: 'Menu', fn: goHome },
        ],
      });
    },
  };

  /* ================= ESCREVER ================= */
  const Write = {
    mode: 'trace', deck: [], i: 0, strokes: [], current: null, checked: false, recorded: false,
    canvas: null, ctx: null, size: 0, good: 0, results: [],

    async start(cards) {
      this.deck = cards ? cards : weightedSample(pool(), pool().length);
      this.i = 0; this.good = 0; this.results = [];
      show('screen-write');
      try { await document.fonts.load('100px "Klee One"', 'あ'); } catch (e) { /* fonte de reserva */ }
      this.resize();
      this.render();
    },
    get cur() { return this.deck[this.i]; },

    initCanvas() {
      this.canvas = $('#write-canvas');
      this.ctx = this.canvas.getContext('2d');
      const pos = e => {
        const r = this.canvas.getBoundingClientRect();
        return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
      };
      this.canvas.addEventListener('pointerdown', e => {
        if (this.checked) return;
        e.preventDefault();
        this.canvas.setPointerCapture(e.pointerId);
        this.current = [pos(e)];
        this.strokes.push(this.current);
        this.redraw();
      });
      this.canvas.addEventListener('pointermove', e => {
        if (!this.current) return;
        const p = pos(e), last = this.current[this.current.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.004) { this.current.push(p); this.redraw(); }
      });
      const end = () => { this.current = null; };
      this.canvas.addEventListener('pointerup', end);
      this.canvas.addEventListener('pointercancel', end);
      window.addEventListener('resize', () => { if (activeScreen() === 'screen-write') { this.resize(); this.redraw(); } });
    },

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.clientWidth || 360;
      this.size = w;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(w * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },

    render() {
      const h = this.cur;
      this.strokes = []; this.checked = false; this.recorded = false;
      $('#w-romaji').textContent = h.r;
      $('#w-strokes').textContent = strokesText(h);
      $('#w-reveal').textContent = this.mode === 'trace' ? h.k : '';
      $('#w-feedback').innerHTML = '';
      $('#write-counter').textContent = `${this.i + 1} / ${this.deck.length}`;
      setProgress('#write-progress', this.i / this.deck.length);
      $('#w-check').classList.remove('hidden');
      this.redraw();
      Speech.say(h.k);
    },

    redraw() {
      const { ctx, size } = this, h = this.cur;
      ctx.clearRect(0, 0, size, size);
      // grade de caligrafia (田)
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 50, 60, .28)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size);
      ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
      ctx.stroke();
      ctx.setLineDash([2, 8]);
      ctx.strokeStyle = 'rgba(200, 50, 60, .14)';
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(size, size);
      ctx.moveTo(size, 0); ctx.lineTo(0, size);
      ctx.stroke();
      ctx.restore();
      // modelo
      if (this.mode === 'trace' && !this.checked) drawGlyph(ctx, size, h.k, 'rgba(34, 28, 51, .14)');
      if (this.checked) drawGlyph(ctx, size, h.k, 'rgba(200, 50, 60, .3)');
      // traços do usuário
      drawStrokes(ctx, this.strokes, size, size * 0.048, '#221c33');
    },

    undo() { if (this.checked) return; this.strokes.pop(); this.redraw(); },
    clear() { this.strokes = []; this.checked = false; $('#w-feedback').innerHTML = ''; $('#w-check').classList.remove('hidden'); this.redraw(); },

    check() {
      if (!this.strokes.length) { toast('Desenhe o caractere primeiro ✍️'); return; }
      const h = this.cur;
      const score = scoreDrawing(h.k, this.strokes);
      this.checked = true;
      this.redraw();
      $('#w-reveal').textContent = h.k;
      const pct = Math.round(score * 100);
      const ok = score >= 0.5;
      const cls = score >= 0.68 ? 'great' : ok ? 'good' : 'bad';
      const msg = score >= 0.68 ? 'Excelente! 🎉' : ok ? 'Muito bom! 👍' : score >= 0.33 ? 'Quase lá — compare com o modelo' : 'Tente de novo ✍️';
      const n = this.strokes.length;
      const strokeOk = n === h.st || n === h.alt;
      const strokeMsg = strokeOk ? `✓ ${n} traço${n > 1 ? 's' : ''}, certinho!` : `Você usou ${n} traço${n > 1 ? 's' : ''}; o correto é ${strokesText(h)}.`;
      $('#w-feedback').innerHTML = `<div class="fb-card"><span class="fb-score ${cls}">${pct}</span><span class="fb-text"><b>${msg}</b><small>${strokeMsg}</small></span></div>`;
      $('#w-check').classList.add('hidden');
      ok ? Sfx.good() : Sfx.bad();
      if (!this.recorded) {
        this.recorded = true;
        record(h.k, ok);
        if (ok) this.good++;
        else this.results.push(h);
      }
      Speech.say(h.k);
    },

    next() {
      if (!this.recorded && this.strokes.length) this.check();
      this.i++;
      if (this.i >= this.deck.length) this.finish();
      else this.render();
    },

    finish() {
      setProgress('#write-progress', 1);
      const n = this.deck.length;
      if (this.good / n >= 0.8) { confetti(); Sfx.win(); }
      const actions = [];
      if (this.results.length) actions.push({ label: 'Praticar os difíceis', cls: 'btn-wrong', fn: () => this.start(shuffle(this.results)) });
      actions.push({ label: 'Novo baralho', cls: 'btn-next', fn: () => this.start() });
      actions.push({ label: 'Menu', fn: goHome });
      openSummary({
        kanji: '書', title: 'Prática de escrita concluída!',
        big: `${this.good}/${n}`, bigLabel: 'caracteres bem escritos',
        mistakes: this.results, actions,
      });
    },
  };

  /* ================= FASES: desbloqueio e seletor ================= */
  const P1_ACC = 0.85;  // Fase 1 → 2: 85% em todos os caracteres de uma família
  const P2_ACC = 0.8;   // Fase 2 → 3: 80% das palavras montadas…
  const P2_MIN = 8;     // …com pelo menos 8 palavras
  const freePlay = new Set(); // fases liberadas só nesta sessão ("experimentar mesmo assim")
  let pendingUnlocks = [];

  const PHASES = [
    { n: 1, icon: 'あ', name: 'Cartas', hue: 342 },
    { n: 2, icon: 'すし', name: 'Montar Palavras', hue: 262 },
    { n: 3, icon: '意', name: 'Significados', hue: 190 },
  ];

  function rowStats(rowId) {
    const chars = HIRAGANA.filter(h => h.row === rowId);
    let c = 0, w = 0, seen = 0;
    chars.forEach(h => {
      const p = state.progress[h.k];
      if (p && p.c + p.w > 0) { seen++; c += p.c; w += p.w; }
    });
    const acc = c + w ? c / (c + w) : 0;
    return {
      n: chars.length, seen, acc,
      mastered: seen === chars.length && acc >= P1_ACC,
      progress: (seen / chars.length) * Math.min(acc / P1_ACC, 1),
    };
  }
  const masteredRows = () => ROWS.filter(r => rowStats(r.id).mastered);
  function bestRow() {
    let best = null;
    ROWS.forEach(row => { const s = rowStats(row.id); if (!best || s.progress > best.s.progress) best = { row, s }; });
    return best;
  }
  function p2Stats() {
    const n = state.p2.c + state.p2.w;
    return { n, acc: n ? state.p2.c / n : 0 };
  }
  const PHASE_RULES = {
    2: { met: () => masteredRows().length > 0, progress: () => bestRow().s.progress },
    3: {
      met: () => { const s = p2Stats(); return s.n >= P2_MIN && s.acc >= P2_ACC; },
      progress: () => { const s = p2Stats(); return Math.min(s.n / P2_MIN, 1) * Math.min(s.acc / P2_ACC, 1); },
    },
  };
  const isUnlocked = p => state.unlocked.includes(p);
  const isOpen = p => isUnlocked(p) || freePlay.has(p);

  function checkUnlocks() {
    [2, 3].forEach(p => {
      if (!isUnlocked(p) && PHASE_RULES[p].met()) { state.unlocked.push(p); pendingUnlocks.push(p); }
    });
    if (pendingUnlocks.length) save();
  }
  function announceUnlocks() {
    if (!pendingUnlocks.length) return;
    const names = pendingUnlocks.map(p => `Fase ${p}: ${PHASES[p - 1].name}`).join(' e ');
    toast(`🎉 Desbloqueado — ${names}!`, 5000);
    confetti(); Sfx.win();
    pendingUnlocks.forEach(p => {
      const t = $('#phase-tab-' + p);
      if (t) { t.classList.add('just-unlocked'); setTimeout(() => t.classList.remove('just-unlocked'), 3000); }
    });
    pendingUnlocks = [];
  }

  function phaseStatus(p) {
    if (p === 1) {
      const m = masteredRows().length;
      return { sub: `${m}/${ROWS.length} famílias dominadas`, prog: m / ROWS.length };
    }
    if (p === 2) {
      if (!isUnlocked(2)) return { sub: 'Domine 1 família (85%)', prog: PHASE_RULES[2].progress() };
      const s = p2Stats();
      return { sub: s.n ? `${Math.round(s.acc * 100)}% de acerto · ${state.p2.c} palavras` : 'Liberada! Comece a montar', prog: PHASE_RULES[3].progress() };
    }
    if (!isUnlocked(3)) return { sub: `80% na Fase 2 (mín. ${P2_MIN} palavras)`, prog: PHASE_RULES[3].progress() };
    const m = WORDS.filter(w => wlevel(w.k) === 3).length;
    return { sub: `${m}/${WORDS.length} palavras dominadas`, prog: m / WORDS.length };
  }

  function renderPhaseNav() {
    const nav = $('#phase-nav');
    nav.innerHTML = '';
    PHASES.forEach(ph => {
      const st = phaseStatus(ph.n);
      const b = document.createElement('button');
      b.className = 'phase-tab' + (state.phase === ph.n ? ' active' : '') + (isUnlocked(ph.n) ? '' : ' locked');
      b.id = 'phase-tab-' + ph.n;
      b.style.setProperty('--hue', ph.hue);
      b.setAttribute('aria-pressed', state.phase === ph.n);
      b.innerHTML = `<span class="pt-icon">${ph.icon}</span><span class="pt-num">Fase ${ph.n}</span>` +
        `<span class="pt-name">${ph.name}</span><span class="pt-sub">${st.sub}</span>` +
        `<span class="pt-bar"><i style="width:${Math.round(st.prog * 100)}%"></i></span>`;
      b.onclick = () => showPhase(ph.n, true);
      nav.appendChild(b);
    });
  }

  function showPhase(n, animate) {
    if (state.phase !== n) { state.phase = n; save(); }
    $$('.phase-tab').forEach(t => {
      const on = t.id === 'phase-tab-' + n;
      t.classList.toggle('active', on);
      t.setAttribute('aria-pressed', on);
    });
    if (n === 2) renderPhase2();
    if (n === 3) renderPhase3();
    $$('[data-phase-panel]').forEach(p => {
      const on = +p.dataset.phasePanel === n;
      p.classList.toggle('hidden', !on);
      if (on && animate) { p.classList.remove('entering'); void p.offsetWidth; p.classList.add('entering'); }
    });
  }

  function lockBanner(el, p) {
    if (isOpen(p)) { el.classList.add('hidden'); el.innerHTML = ''; return; }
    let title, detail;
    if (p === 2) {
      const b = bestRow();
      title = 'Fase bloqueada — domine uma família na Fase 1';
      detail = `Acerte 85% em todos os caracteres de uma família (coluna). Melhor até agora: ${b.row.label} ${b.row.name} — ` +
        (b.s.seen ? `${Math.round(b.s.acc * 100)}% de acerto, ${b.s.seen}/${b.s.n} vistos.` : 'ainda sem prática.');
    } else {
      const s = p2Stats();
      title = 'Fase bloqueada — acerte 80% na Fase 2';
      detail = `Monte pelo menos ${P2_MIN} palavras com 80% de acerto. Agora: ${s.n} palavras, ${Math.round(s.acc * 100)}% de acerto.`;
    }
    el.innerHTML = `<span class="lb-icon">🔒</span><span class="lb-text"><b>${title}</b><small>${detail}</small>` +
      `<span class="lb-bar"><i style="width:${Math.round(PHASE_RULES[p].progress() * 100)}%"></i></span></span>` +
      `<button class="icon-btn" id="p${p}-try">Experimentar mesmo assim</button>`;
    el.classList.remove('hidden');
    $(`#p${p}-try`).onclick = () => {
      freePlay.add(p);
      p === 2 ? renderPhase2() : renderPhase3();
      toast('Modo livre ativado nesta sessão. O desbloqueio oficial continua dependendo do seu progresso.', 4500);
    };
  }

  /* ---------- Palavras: progresso ---------- */
  function recordWord(k, ok) {
    const p = state.words[k] || (state.words[k] = { c: 0, w: 0 });
    ok ? p.c++ : p.w++;
    save();
  }
  function wlevel(k) {
    const p = state.words[k];
    if (!p || p.c + p.w === 0) return 0;
    const r = p.c / (p.c + p.w);
    if (p.c >= 3 && r >= 0.8) return 3;
    if (p.c >= 2 && r >= 0.6) return 2;
    return 1;
  }
  function wordWeight(w) {
    const p = state.words[w.k] || { c: 0, w: 0 };
    let x = 1 + (p.w * 2) / (p.c + 1);
    if (p.c + p.w === 0) x += 0.6;
    if (wlevel(w.k) === 3) x *= 0.5;
    return x;
  }
  const syllables = w => [...w.k].map(c => BY_KANA[c].r);
  const reviewWords = () => state.review.map(k => BY_WORD[k]).filter(Boolean);
  const PRAISE = ['すごい！', 'よくできました！', 'いいね！', 'かんぺき！'];

  function pulse(sel, ms = 1600) {
    const el = $(sel);
    if (!el) return;
    el.classList.add('playing');
    clearTimeout(el._pulse);
    el._pulse = setTimeout(() => el.classList.remove('playing'), ms);
  }

  // palavras que só usam famílias dominadas ou selecionadas (se forem poucas, usa todas)
  function buildPool() {
    const rows = new Set([...masteredRows().map(r => r.id), ...state.selectedRows]);
    const fit = WORDS.filter(w => [...w.k].every(c => rows.has(BY_KANA[c].row)));
    return { words: fit.length >= 4 ? fit : WORDS, fit: fit.length };
  }

  function renderPhase2() {
    lockBanner($('#p2-lock'), 2);
    const { fit } = buildPool();
    $('#p2-avail').innerHTML = fit >= 4
      ? `<span>${fit}</span> palavras usam só as famílias que você domina ou selecionou na Fase 1.`
      : `Só <span>${fit}</span> palavras usam as suas famílias, então por enquanto entram todas as <span>${WORDS.length}</span>. Selecione mais famílias na Fase 1 para filtrar.`;
    const s = p2Stats();
    $('#p2-stats').innerHTML = s.n
      ? `<span class="mini-stat">✅ <b>${state.p2.c}</b> certas</span><span class="mini-stat">❌ <b>${state.p2.w}</b> erradas</span><span class="mini-stat">🎯 <b>${Math.round(s.acc * 100)}%</b> de acerto</span>`
      : '';
    $('#p2-start').disabled = !isOpen(2);
    $$('#p2-level-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.blevel === Build.level));
  }

  let vocabCat = 'all';
  function renderPhase3() {
    lockBanner($('#p3-lock'), 3);
    const mastered = WORDS.filter(w => wlevel(w.k) === 3).length;
    const seen = WORDS.filter(w => wlevel(w.k) > 0).length;
    $('#p3-stats').innerHTML = `<span class="mini-stat">📚 <b>${seen}</b>/${WORDS.length} vistas</span>` +
      `<span class="mini-stat">🏅 <b>${mastered}</b> dominadas</span>` +
      `<span class="mini-stat">🔁 <b>${state.review.length}</b> para revisar</span>`;
    $('#p3-start').disabled = !isOpen(3);
    const rv = $('#p3-review');
    rv.disabled = !isOpen(3) || !state.review.length;
    rv.textContent = `Revisar erros (${state.review.length})`;
    $$('#p3-dir-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.mdir === Meaning.dir));
    renderVocab();
  }

  function renderVocab() {
    const f = $('#vocab-filters');
    f.innerHTML = '';
    [['all', '✨ Todas'], ...Object.entries(WORD_CATS)].forEach(([id, label]) => {
      const b = document.createElement('button');
      b.className = 'pill' + (vocabCat === id ? ' on' : '');
      b.id = 'vocab-cat-' + id;
      b.textContent = label;
      b.onclick = () => { vocabCat = id; renderVocab(); };
      f.appendChild(b);
    });
    const list = WORDS.filter(w => vocabCat === 'all' || w.cat === vocabCat);
    $('#vocab-count').textContent = list.length;
    const g = $('#vocab-grid');
    g.innerHTML = '';
    list.forEach((w, i) => {
      const p = state.words[w.k];
      const b = document.createElement('button');
      b.className = 'vcard';
      b.id = 'vocab-' + w.r;
      b.style.animationDelay = Math.min(i * 0.015, 0.4) + 's';
      b.title = p ? `${p.c} acertos · ${p.w} erros` : 'Ainda não praticada';
      b.innerHTML = `<i class="v-dot lv${wlevel(w.k)}"></i>` +
        (state.review.includes(w.k) ? '<span class="v-review" title="Na lista de revisão">🔁</span>' : '') +
        `<span class="v-emoji">${w.e}</span><span class="v-kana">${w.k}</span>` +
        `<span class="v-r">${syllables(w).join('·')}</span><span class="v-pt">${w.pt}</span>`;
      b.onclick = () => {
        Speech.say(w.k, 0.8);
        $$('.vcard.playing').forEach(x => x.classList.remove('playing'));
        b.classList.add('playing');
        setTimeout(() => b.classList.remove('playing'), 1200);
      };
      g.appendChild(b);
    });
  }

  /* ================= FASE 2: MONTAR PALAVRAS ================= */
  const Build = {
    level: 'guided', total: 8, deck: [], i: 0, slots: [], tiles: [], checked: false,
    score: 0, streak: 0, maxStreak: 0, correct: 0, mistakes: [], token: 0,

    start(words) {
      this.token++;
      const src = words || buildPool().words;
      this.deck = weightedSample(src, Math.min(this.total, src.length), wordWeight);
      this.i = 0; this.score = 0; this.streak = 0; this.maxStreak = 0; this.correct = 0; this.mistakes = [];
      show('screen-build');
      this.updateHud();
      this.render();
    },
    get cur() { return this.deck[this.i]; },
    get chars() { return [...this.cur.k]; },

    // cartas da palavra + distratores (parecidos primeiro), sem repetir sons
    makeBank() {
      const chars = this.chars;
      const target = Math.min(8, Math.max(6, chars.length + 3));
      const bank = chars.map(c => BY_KANA[c]);
      const sounds = new Set(bank.map(sound));
      const RARE = ['ぢ', 'づ', 'を'];
      const add = h => {
        if (h && !RARE.includes(h.k) && !sounds.has(sound(h)) && bank.length < target) { bank.push(h); sounds.add(sound(h)); }
      };
      const similar = chars.flatMap(c => (CONFUSABLES[c] || []).map(k => BY_KANA[k]).concat(siblings(BY_KANA[c])));
      shuffle(similar).slice(0, Math.max(2, target - chars.length - 1)).forEach(add);
      shuffle(pool().length >= 4 ? pool() : HIRAGANA).forEach(add);
      shuffle(HIRAGANA).forEach(add);
      return shuffle(bank).map(h => ({ h, used: false }));
    },

    render() {
      const w = this.cur;
      this.checked = false;
      this.slots = this.chars.map(() => null);
      this.tiles = this.makeBank();
      $('#b-counter').textContent = `Palavra ${this.i + 1} / ${this.deck.length}`;
      const syll = $('#b-syll');
      if (this.level === 'guided') {
        syll.innerHTML = syllables(w).join('<span class="dot">·</span>');
        syll.classList.remove('hidden-syll');
      } else {
        syll.innerHTML = this.chars.map(() => '?').join('<span class="dot">·</span>');
        syll.classList.add('hidden-syll');
      }
      $('#b-feedback').innerHTML = '';
      $('#b-check').classList.remove('hidden', 'ready');
      $('#b-next').classList.add('hidden');
      setProgress('#build-progress', this.i / this.deck.length);
      this.renderBoard(true);
      const tk = this.token;
      setTimeout(() => { if (tk === this.token && activeScreen() === 'screen-build') this.play(); }, 350);
    },

    renderBoard(enter = false, popSlot = -1) {
      const chars = this.chars, guided = this.level === 'guided';
      const next = this.slots.indexOf(null);
      const sw = $('#b-slots');
      sw.innerHTML = '';
      this.slots.forEach((t, i) => {
        const b = document.createElement('button');
        b.className = 'slot' + (t ? ' filled' : '') + (!this.checked && i === next ? ' next' : '') + (i === popSlot ? ' pop' : '');
        b.id = 'b-slot-' + (i + 1);
        b.setAttribute('aria-label', t ? `Casa ${i + 1}: ${t.h.k} (toque para tirar)` : `Casa ${i + 1} vazia`);
        b.innerHTML = (t ? t.h.k : '') + `<span class="s-label">${guided || this.checked ? BY_KANA[chars[i]].r : '?'}</span>`;
        if (this.checked) {
          const ok = t && t.h.k === chars[i];
          b.classList.add(ok ? 'correct' : 'wrong');
          if (!ok) b.insertAdjacentHTML('beforeend', `<span class="s-fix">${chars[i]}</span>`);
          b.disabled = true;
        } else {
          b.onclick = () => this.unpick(i);
        }
        sw.appendChild(b);
      });
      const bw = $('#b-bank');
      bw.innerHTML = '';
      this.tiles.forEach((t, i) => {
        const b = document.createElement('button');
        b.className = 'tile paper' + (t.used ? ' used' : '') + (enter ? ' enter' : '');
        if (enter) b.style.animationDelay = (i * 0.04) + 's';
        b.id = 'b-tile-' + (i + 1);
        b.disabled = t.used || this.checked;
        b.innerHTML = `<span class="num">${i + 1}</span><span class="t-kana">${t.h.k}</span>`;
        b.onclick = () => this.pick(i);
        bw.appendChild(b);
      });
      $('#b-check').classList.toggle('ready', !this.checked && next === -1);
    },

    pick(i) {
      if (this.checked) return;
      const t = this.tiles[i], slot = this.slots.indexOf(null);
      if (!t || t.used || slot < 0) return;
      t.used = true;
      this.slots[slot] = t;
      Sfx.flip();
      Speech.say(t.h.k);
      this.renderBoard(false, slot);
    },
    unpick(i) {
      if (this.checked || !this.slots[i]) return;
      this.slots[i].used = false;
      this.slots[i] = null;
      Sfx.flip();
      this.renderBoard();
    },
    undo() {
      for (let i = this.slots.length - 1; i >= 0; i--) if (this.slots[i]) { this.unpick(i); return; }
    },
    clear() {
      if (this.checked) return;
      this.slots.forEach((t, i) => { if (t) { t.used = false; this.slots[i] = null; } });
      this.renderBoard();
    },
    play() { Speech.say(this.cur.k, 0.8); pulse('#b-play'); },
    playSlow() { Speech.sayParts(this.chars, this.cur.k); pulse('#b-play', 3200); },

    check() {
      if (this.checked) return;
      if (this.slots.includes(null)) { toast('Preencha todas as casas antes de verificar 🧩'); return; }
      const w = this.cur, chars = this.chars;
      const okEach = chars.map((c, i) => this.slots[i].h.k === c);
      const ok = okEach.every(Boolean);
      this.checked = true;
      chars.forEach((c, i) => record(c, okEach[i]));  // também conta para o domínio da Fase 1
      recordWord(w.k, ok);
      ok ? state.p2.c++ : state.p2.w++;
      save();
      const rect = $('#b-slots').getBoundingClientRect();
      if (ok) {
        this.correct++;
        this.streak++;
        this.maxStreak = Math.max(this.maxStreak, this.streak);
        const pts = 10 * chars.length + Math.min(this.streak - 1, 10) * 3;
        this.score += pts;
        Sfx.good();
        floatText(`+${pts}`, rect.left + rect.width / 2, rect.top, 'hsl(158 70% 60%)');
        if (this.streak > state.best) { state.best = this.streak; save(); }
      } else {
        this.streak = 0;
        this.mistakes.push(w);
        Sfx.bad();
      }
      this.renderBoard();
      this.updateHud();
      const syll = $('#b-syll');
      syll.innerHTML = syllables(w).join('<span class="dot">·</span>');
      syll.classList.remove('hidden-syll');
      const msg = ok ? `Isso! ${PRAISE[Math.floor(Math.random() * PRAISE.length)]}` : 'Quase! A palavra era:';
      $('#b-feedback').innerHTML = `<div class="word-reveal ${ok ? 'ok' : 'bad'}"><span class="wr-emoji">${w.e}</span>` +
        `<span class="wr-text"><span class="wr-msg">${msg}</span><b>${w.k}</b><small>${w.r} — ${w.pt}</small></span>` +
        `<button class="icon-btn" id="b-say-word" aria-label="Ouvir de novo">🔊</button></div>`;
      $('#b-say-word').onclick = () => Speech.say(w.k, 0.8);
      $('#b-check').classList.add('hidden');
      $('#b-next').classList.remove('hidden');
      setTimeout(() => Speech.say(w.k, 0.8), ok ? 150 : 400);
    },

    next() {
      if (!this.checked) { this.check(); return; }
      this.i++;
      if (this.i >= this.deck.length) this.finish();
      else this.render();
    },

    updateHud() {
      $('#build-score').textContent = this.score;
      $('#build-streak').textContent = this.streak;
      $('#build-streak-wrap').classList.toggle('hot', this.streak >= 5);
    },

    finish() {
      setProgress('#build-progress', 1);
      const n = this.deck.length, acc = Math.round((this.correct / n) * 100);
      if (acc >= 80) { confetti(); Sfx.win(); }
      const actions = [];
      if (this.mistakes.length) actions.push({ label: `Refazer ${this.mistakes.length} difíceis`, cls: 'btn-wrong', fn: () => this.start(this.mistakes) });
      actions.push({ label: 'Novas palavras', cls: 'btn-next', fn: () => this.start() });
      actions.push({ label: 'Menu', fn: goHome });
      const lines = [`⭐ ${this.score} pontos`, `✅ ${this.correct}/${n} palavras`, `🔥 maior sequência: ${this.maxStreak}`];
      if (!isUnlocked(3)) {
        const s = p2Stats();
        lines.push(PHASE_RULES[3].met()
          ? '🔓 Fase 3 liberada! Volte ao menu.'
          : `🔒 Fase 3: ${Math.min(s.n, P2_MIN)}/${P2_MIN} palavras · ${Math.round(s.acc * 100)}% (meta 80%)`);
      }
      openSummary({
        kanji: '組',
        title: acc === 100 ? 'Perfeito! かんぺき！' : acc >= 80 ? 'Excelente! よくできました' : acc >= 50 ? 'Bom trabalho!' : 'Continue praticando!',
        big: `${acc}%`, bigLabel: 'palavras montadas certas',
        lines, mistakes: this.mistakes, actions,
      });
    },
  };

  /* ================= FASE 3: SIGNIFICADOS ================= */
  const Meaning = {
    dir: 'jp2pt', total: 10, qs: [], i: 0, score: 0, streak: 0, maxStreak: 0, correct: 0,
    mistakes: [], locked: false, opts: [], token: 0, reviewMode: false,

    start(words) {
      this.token++;
      this.reviewMode = !!words;
      const src = words || WORDS;
      this.qs = weightedSample(src, Math.min(this.total, src.length), wordWeight);
      this.i = 0; this.score = 0; this.streak = 0; this.maxStreak = 0; this.correct = 0; this.mistakes = [];
      $('#m-title').textContent = this.reviewMode ? 'Revisão' : 'Significados';
      show('screen-meaning');
      this.updateHud();
      this.render();
    },
    get cur() { return this.qs[this.i]; },

    // 3 alternativas, preferindo a mesma categoria (mais difícil)
    buildOptions(w) {
      const opts = [w], used = new Set([w.pt]);
      const add = x => { if (x && !used.has(x.pt) && opts.length < 4) { opts.push(x); used.add(x.pt); } };
      shuffle(WORDS.filter(x => x.cat === w.cat && x !== w)).slice(0, 2).forEach(add);
      shuffle(WORDS).forEach(add);
      return shuffle(opts);
    },

    render() {
      const w = this.cur;
      this.locked = false;
      const card = $('#m-card');
      card.classList.remove('pop', 'sound');
      void card.offsetWidth;
      card.classList.add('pop');
      $('#m-reveal').innerHTML = '';
      if (this.dir === 'jp2pt') {
        card.innerHTML = `<span class="m-word">${w.k}</span>`;
        $('#m-prompt').textContent = 'O que significa esta palavra?';
      } else if (this.dir === 's2pt') {
        card.classList.add('sound');
        card.innerHTML = '<span class="speaker">🔊</span>';
        $('#m-prompt').textContent = 'Ouça e escolha o significado (toque para repetir)';
        const tk = this.token;
        setTimeout(() => { if (tk === this.token && activeScreen() === 'screen-meaning') Speech.say(w.k, 0.8); }, 300);
      } else {
        card.innerHTML = `<span class="m-emoji">${w.e}</span><span class="m-pt">${w.pt}</span>`;
        $('#m-prompt').textContent = 'Qual palavra em hiragana significa isto?';
      }
      this.opts = this.buildOptions(w);
      const showJp = this.dir === 'pt2jp';
      const wrap = $('#m-options');
      wrap.innerHTML = '';
      this.opts.forEach((o, idx) => {
        const b = document.createElement('button');
        b.className = 'opt paper';
        b.id = 'm-opt-' + (idx + 1);
        b.innerHTML = `<span class="num">${idx + 1}</span>` +
          (showJp ? `<span class="o-word">${o.k}</span>` : `<span class="o-mean"><em>${o.e}</em>${o.pt}</span>`);
        b.onclick = () => this.choose(idx, b);
        wrap.appendChild(b);
      });
      setProgress('#m-progress', this.i / this.qs.length);
    },

    choose(idx, btn) {
      if (this.locked) return;
      this.locked = true;
      const w = this.cur, ok = this.opts[idx] === w;
      const showJp = this.dir === 'pt2jp';
      recordWord(w.k, ok);
      $$('#m-options .opt').forEach((b, i) => {
        b.disabled = true;
        const o = this.opts[i];
        if (o === w || i === idx) {
          b.classList.add(o === w ? 'correct' : 'wrong');
          b.insertAdjacentHTML('beforeend', `<span class="o-sub">${showJp ? o.pt : o.k}</span>`);
        } else b.classList.add('dim');
      });
      // lista de revisão: entra quando erra, sai quando acerta
      const inReview = state.review.indexOf(w.k);
      if (ok && inReview >= 0) state.review.splice(inReview, 1);
      if (!ok && inReview < 0) state.review.push(w.k);
      save();
      if (ok) {
        this.correct++;
        this.streak++;
        this.maxStreak = Math.max(this.maxStreak, this.streak);
        const pts = 10 + Math.min(this.streak - 1, 10) * 2;
        this.score += pts;
        Sfx.good();
        const r = btn.getBoundingClientRect();
        floatText(`+${pts}`, r.left + r.width / 2, r.top, 'hsl(158 70% 60%)');
        if (this.streak > state.best) { state.best = this.streak; save(); }
      } else {
        this.streak = 0;
        this.mistakes.push(w);
        Sfx.bad();
      }
      $('#m-reveal').innerHTML = `<div class="word-reveal ${ok ? 'ok' : 'bad'}"><span class="wr-emoji">${w.e}</span>` +
        `<span class="wr-text"><span class="wr-msg">${ok ? 'Correto!' : 'Resposta certa:'}</span><b>${w.k}</b>` +
        `<small>${syllables(w).join('·')} — ${w.pt}</small></span></div>`;
      setTimeout(() => Speech.say(w.k, 0.8), ok ? 0 : 350);
      this.updateHud();
      const tk = this.token;
      setTimeout(() => this.next(tk), ok ? 1300 : 2400);
    },

    next(tk) {
      if (tk !== this.token || activeScreen() !== 'screen-meaning') return;
      this.i++;
      if (this.i >= this.qs.length) this.finish();
      else this.render();
    },

    updateHud() {
      $('#m-score').textContent = this.score;
      $('#m-streak').textContent = this.streak;
      $('#m-streak-wrap').classList.toggle('hot', this.streak >= 5);
    },

    finish() {
      setProgress('#m-progress', 1);
      const n = this.qs.length, acc = Math.round((this.correct / n) * 100);
      if (acc >= 80) { confetti(); Sfx.win(); }
      const title = acc === 100 ? 'Perfeito! すごい！' : acc >= 80 ? 'Excelente! よくできました' : acc >= 50 ? 'Bom trabalho!' : 'Continue praticando!';
      const actions = [];
      if (state.review.length) actions.push({ label: `Revisar erros (${state.review.length})`, cls: 'btn-wrong', fn: () => this.start(reviewWords()) });
      actions.push({ label: 'Jogar de novo', cls: 'btn-next', fn: () => this.start() });
      actions.push({ label: 'Menu', fn: goHome });
      openSummary({
        kanji: acc >= 80 ? '優' : acc >= 50 ? '良' : '可',
        title, big: `${acc}%`, bigLabel: 'de acertos',
        lines: [`⭐ ${this.score} pontos`, `✅ ${this.correct}/${n}`, `🔥 maior sequência: ${this.maxStreak}`, `🔁 ${state.review.length} na lista de revisão`],
        mistakes: this.mistakes, actions,
      });
    },
  };

  /* ---------- Desenho e avaliação da escrita ---------- */
  const KANA_FONT = '"Klee One", "Yu Mincho", "Hiragino Mincho ProN", serif';

  // desenha o caractere centralizado pela "tinta" real do glifo
  function drawGlyph(ctx, size, k, color, outline = 0) {
    ctx.save();
    ctx.font = `${Math.round(size * 0.72)}px ${KANA_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(k);
    const L = m.actualBoundingBoxLeft || 0, R = m.actualBoundingBoxRight || m.width;
    const A = m.actualBoundingBoxAscent || size * 0.6, D = m.actualBoundingBoxDescent || 0;
    const x = size / 2 - (R - L) / 2;
    const y = size / 2 + (A - D) / 2;
    ctx.fillStyle = color;
    ctx.fillText(k, x, y);
    if (outline) {
      ctx.strokeStyle = color;
      ctx.lineWidth = outline;
      ctx.lineJoin = 'round';
      ctx.strokeText(k, x, y);
    }
    ctx.restore();
  }

  function drawStrokes(ctx, strokes, size, width, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    strokes.forEach(s => {
      if (s.length === 1) {
        ctx.beginPath();
        ctx.arc(s[0][0] * size, s[0][1] * size, width / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(s[0][0] * size, s[0][1] * size);
      for (let i = 1; i < s.length - 1; i++) {
        const mx = (s[i][0] + s[i + 1][0]) / 2, my = (s[i][1] + s[i + 1][1]) / 2;
        ctx.quadraticCurveTo(s[i][0] * size, s[i][1] * size, mx * size, my * size);
      }
      const last = s[s.length - 1];
      ctx.lineTo(last[0] * size, last[1] * size);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Compara o desenho com o glifo: precisão (tinta dentro do modelo) × cobertura (modelo coberto)
  function scoreDrawing(k, strokes) {
    const N = 160;
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = c.height = N;
      return c.getContext('2d', { willReadFrequently: true });
    };
    const alpha = ctx => {
      const d = ctx.getImageData(0, 0, N, N).data, out = new Uint8Array(N * N);
      for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 60 ? 1 : 0;
      return out;
    };

    const coreCtx = mk(); drawGlyph(coreCtx, N, k, '#000');
    const core = alpha(coreCtx);
    const tolCtx = mk(); drawGlyph(tolCtx, N, k, '#000', N * 0.09);
    const tol = alpha(tolCtx);

    // caixa delimitadora do modelo
    let tx0 = N, ty0 = N, tx1 = 0, ty1 = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (core[y * N + x]) {
      if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; if (y < ty0) ty0 = y; if (y > ty1) ty1 = y;
    }
    // caixa delimitadora do desenho (normalizado → pixels)
    const pts = strokes.flat();
    let ux0 = 1, uy0 = 1, ux1 = 0, uy1 = 0;
    pts.forEach(([x, y]) => { ux0 = Math.min(ux0, x); ux1 = Math.max(ux1, x); uy0 = Math.min(uy0, y); uy1 = Math.max(uy1, y); });
    const tw = (tx1 - tx0) / N, th = (ty1 - ty0) / N;
    const uw = Math.max(ux1 - ux0, 0.02), uh = Math.max(uy1 - uy0, 0.02);
    // normaliza posição e escala (perdoa desenhos fora do centro ou de outro tamanho)
    const s = Math.max(0.6, Math.min(1.8, Math.max(tw, th) / Math.max(uw, uh)));
    const tcx = (tx0 + tx1) / 2 / N, tcy = (ty0 + ty1) / 2 / N;
    const ucx = (ux0 + ux1) / 2, ucy = (uy0 + uy1) / 2;
    const norm = strokes.map(st => st.map(([x, y]) => [(x - ucx) * s + tcx, (y - ucy) * s + tcy]));

    const thinCtx = mk(); drawStrokes(thinCtx, norm, N, N * 0.05, '#000');
    const thin = alpha(thinCtx);
    const thickCtx = mk(); drawStrokes(thickCtx, norm, N, N * 0.13, '#000');
    const thick = alpha(thickCtx);

    let uIn = 0, uAll = 0, cHit = 0, cAll = 0;
    for (let i = 0; i < N * N; i++) {
      if (thin[i]) { uAll++; if (tol[i]) uIn++; }
      if (core[i]) { cAll++; if (thick[i]) cHit++; }
    }
    if (!uAll || !cAll) return 0;
    const P = uIn / uAll, R = cHit / cAll;
    return P + R === 0 ? 0 : (2 * P * R) / (P + R);
  }

  /* ================= Backup: exportar / importar progresso ================= */
  const BACKUP_APP = 'hiragana-cartas';
  const BACKUP_PREFIX = 'hiraganaCartas';   // todas as chaves do jogo no localStorage começam assim

  function exportProgress() {
    save(); // garante que o estado atual está gravado
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(BACKUP_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      try { data[key] = JSON.parse(raw); } catch (e) { data[key] = raw; }
    }
    const payload = { app: BACKUP_APP, version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hiragana_backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('💾 Backup salvo: hiragana_backup.json');
  }

  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isCount = v => isObj(v) && Number.isFinite(v.c) && Number.isFinite(v.w) && v.c >= 0 && v.w >= 0;

  // confere a estrutura do progresso antes de gravar (retorna a mensagem de erro ou null)
  function validateSave(d) {
    if (!isObj(d)) return 'os dados do progresso não são um objeto';
    if (d.progress === undefined && d.words === undefined) return 'nenhum progresso encontrado no arquivo';
    if (d.progress !== undefined && (!isObj(d.progress) || !Object.values(d.progress).every(isCount))) return 'o progresso dos caracteres está corrompido';
    if (d.words !== undefined && (!isObj(d.words) || !Object.values(d.words).every(isCount))) return 'o progresso das palavras está corrompido';
    if (d.p2 !== undefined && !isCount(d.p2)) return 'as estatísticas da Fase 2 estão corrompidas';
    for (const k of ['rows', 'review', 'unlocked']) if (d[k] !== undefined && !Array.isArray(d[k])) return `o campo "${k}" está corrompido`;
    if (d.best !== undefined && !Number.isFinite(d.best)) return 'a melhor sequência está corrompida';
    return null;
  }

  // aceita o formato exportado acima, um objeto só com as chaves do localStorage ou o estado bruto do jogo
  function parseBackup(text) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error('o arquivo não é um JSON válido'); }
    let data;
    if (isObj(obj) && obj.app === BACKUP_APP && isObj(obj.data)) data = obj.data;
    else if (isObj(obj) && obj[STORE_KEY] !== undefined) data = obj;
    else if (isObj(obj) && (isObj(obj.progress) || isObj(obj.words))) data = { [STORE_KEY]: obj };
    else throw new Error('este arquivo não parece um backup do Hiragana Cartas');
    const keys = Object.keys(data).filter(k => k.startsWith(BACKUP_PREFIX));
    if (!keys.includes(STORE_KEY)) throw new Error('o backup não contém o progresso do jogo');
    if (typeof data[STORE_KEY] === 'string') {
      try { data[STORE_KEY] = JSON.parse(data[STORE_KEY]); }
      catch (e) { throw new Error('os dados do progresso não são um JSON válido'); }
    }
    const err = validateSave(data[STORE_KEY]);
    if (err) throw new Error(err);
    return { data, keys, exportedAt: obj.exportedAt };
  }

  function importProgress(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('❌ Arquivo grande demais para ser um backup (máx. 2 MB).', 5000); return; }
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = parseBackup(String(reader.result)); }
      catch (e) { Sfx.bad(); toast(`❌ Não foi possível importar: ${e.message}.`, 5500); return; }
      try {
        parsed.keys.forEach(k => {
          const v = parsed.data[k];
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        });
      } catch (e) {
        toast('❌ Não foi possível gravar os dados (armazenamento cheio ou bloqueado).', 5500);
        return;
      }
      load();
      renderHome();
      toast('✅ Progresso importado! Recarregando...');
      location.reload(); // recarrega para aplicar progresso, métricas e fases imediatamente
    };
    reader.onerror = () => toast('❌ Não foi possível ler o arquivo.', 4000);
    reader.readAsText(file);
  }

  /* ================= Eventos ================= */
  function bind() {
    // seleção rápida
    $$('[data-quick]').forEach(b => b.onclick = () => {
      const q = b.dataset.quick;
      state.selectedRows = new Set(
        q === 'none' ? [] : ROWS.filter(r => q === 'all' || r.group === q).map(r => r.id)
      );
      save(); renderChips();
    });

    // modos
    $$('[data-mode]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        b.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
      b.onclick = () => {
        if (!requirePool()) return;
        ({ study: () => Study.start(), quiz: () => Quiz.start(), memory: () => Memory.start(), write: () => Write.start() })[b.dataset.mode]();
      };
    });

    $$('[data-back]').forEach(b => b.onclick = goHome);

    $('#reset-progress').onclick = () => {
      if (confirm('Zerar todo o progresso salvo (caracteres, palavras e fases)?')) {
        state.progress = {}; state.best = 0;
        state.words = {}; state.p2 = { c: 0, w: 0 }; state.review = []; state.unlocked = [1]; state.phase = 1;
        freePlay.clear();
        save(); renderHome(); toast('Progresso zerado.');
      }
    };

    // backup
    $('#export-progress').onclick = exportProgress;
    $('#import-progress').onclick = () => $('#import-file').click();
    $('#import-file').onchange = e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = ''; // permite escolher o mesmo arquivo de novo
      importProgress(file);
    };

    // estudar
    $('#flashcard').onclick = () => Study.flip();
    $('#fc-speak').onclick = () => Speech.say(Study.cur.k);
    $('#fc-speak-word').onclick = () => Speech.say(Study.cur.w[0], 0.8);
    $('#fc-yes').onclick = () => Study.answer(true);
    $('#fc-no').onclick = () => Study.answer(false);

    // quiz
    $$('#quiz-tabs .tab').forEach(t => t.onclick = () => {
      $$('#quiz-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
      Quiz.dir = t.dataset.dir;
      Quiz.start();
    });
    $('#q-card').onclick = () => { if (Quiz.dir === 's2k') Speech.say(Quiz.cur.k); };

    // memória
    $$('#mem-tabs .tab').forEach(t => t.onclick = () => {
      $$('#mem-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
      Memory.pairs = +t.dataset.pairs;
      Memory.start();
    });

    // escrever
    Write.initCanvas();
    $$('#write-tabs .tab').forEach(t => t.onclick = () => {
      $$('#write-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
      Write.mode = t.dataset.wmode;
      Write.render();
    });
    $('#w-undo').onclick = () => Write.undo();
    $('#w-clear').onclick = () => Write.clear();
    $('#w-check').onclick = () => Write.check();
    $('#w-next').onclick = () => Write.next();
    $('#w-speak').onclick = () => Speech.say(Write.cur.k);

    // fase 2: montar palavras
    $$('#p2-level-tabs .tab').forEach(t => t.onclick = () => {
      Build.level = t.dataset.blevel;
      $$('#p2-level-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
    });
    $('#p2-start').onclick = () => { if (isOpen(2)) Build.start(); };
    $('#b-play').onclick = () => Build.play();
    $('#b-slow').onclick = () => Build.playSlow();
    $('#b-undo').onclick = () => Build.undo();
    $('#b-clear').onclick = () => Build.clear();
    $('#b-check').onclick = () => Build.check();
    $('#b-next').onclick = () => Build.next();

    // fase 3: significados
    $$('#p3-dir-tabs .tab').forEach(t => t.onclick = () => {
      Meaning.dir = t.dataset.mdir;
      $$('#p3-dir-tabs .tab').forEach(x => x.classList.toggle('active', x === t));
    });
    $('#p3-start').onclick = () => { if (isOpen(3)) Meaning.start(); };
    $('#p3-review').onclick = () => { const r = reviewWords(); if (isOpen(3) && r.length) Meaning.start(r); };
    $('#m-card').onclick = () => { if (Meaning.dir === 's2pt' && Meaning.cur) Speech.say(Meaning.cur.k, 0.8); };

    // detalhes
    $('#detail-close').onclick = () => closeModal('detail-modal');
    $('#detail-modal').addEventListener('click', e => { if (e.target.id === 'detail-modal') closeModal('detail-modal'); });
    $('#d-speak').onclick = () => Speech.say(detailChar.k);
    $('#d-speak-word').onclick = () => Speech.say(detailChar.w[0], 0.8);
    $('#d-write').onclick = () => { closeModal('detail-modal'); Write.start([detailChar]); };

    // teclado
    document.addEventListener('keydown', e => {
      if (anyModalOpen()) {
        if (e.key === 'Escape') closeModal('detail-modal');
        return;
      }
      const onButton = e.target.tagName === 'BUTTON' && e.target.id !== 'flashcard';
      const scr = activeScreen();
      if (scr === 'screen-study') {
        if ((e.key === ' ' || e.key === 'Enter') && !onButton) { e.preventDefault(); Study.flip(); }
        else if (e.key === 'ArrowRight') Study.answer(true);
        else if (e.key === 'ArrowLeft') Study.answer(false);
      } else if (scr === 'screen-quiz') {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) { const b = $('#q-opt-' + n); if (b && !b.disabled) b.click(); }
        else if (e.key === ' ' && Quiz.dir === 's2k' && !onButton) { e.preventDefault(); Speech.say(Quiz.cur.k); }
      } else if (scr === 'screen-write') {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); Write.undo(); }
        else if (e.key === 'Enter' && !onButton) Write.checked ? Write.next() : Write.check();
      } else if (scr === 'screen-build') {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 9) Build.pick(n - 1);
        else if (e.key === 'Backspace') { e.preventDefault(); Build.undo(); }
        else if (e.key === 'Enter' && !onButton) { e.preventDefault(); Build.checked ? Build.next() : Build.check(); }
        else if (e.key === ' ' && !onButton) { e.preventDefault(); Build.play(); }
      } else if (scr === 'screen-meaning') {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) { const b = $('#m-opt-' + n); if (b && !b.disabled) b.click(); }
        else if (e.key === ' ' && !onButton && Meaning.cur) { e.preventDefault(); Speech.say(Meaning.cur.k, 0.8); }
      }
    });
  }

  /* ================= Início ================= */
  load();
  Speech.init();
  makePetals();
  bind();
  renderHome();
  announceUnlocks();
})();
