/* ==========================================================================
   Lexicon NL — application logic
   Plain ES2020, no build step, no dependencies.
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */
  const TYPE_META = {
    noun: { label: 'Noun', nl: 'zelfstandig naamwoord' },
    verb: { label: 'Verb', nl: 'werkwoord' },
    separable_verb: { label: 'Separable verb', nl: 'scheidbaar werkwoord' },
  };
  const TYPE_ORDER = ['noun', 'verb', 'separable_verb'];

  const PRONOUNS = [
    { key: 'ik', label: 'ik' },
    { key: 'jij_je', label: 'jij / je' },
    { key: 'u', label: 'u' },
    { key: 'hij_zij_het', label: 'hij / zij / het' },
    { key: 'wij_we', label: 'wij / we' },
    { key: 'jullie', label: 'jullie' },
    { key: 'zij_ze', label: 'zij / ze' },
  ];
  // Words that are pronouns inside a verb form (never coloured as the verb itself)
  const PRON_WORDS = new Set(['ik', 'jij', 'je', 'u', 'hij', 'zij', 'ze', 'het', 'wij', 'we', 'jullie', 'me', 'ons', 'zich', 'mij', 'jou']);

  // Present-tense auxiliaries for the perfect-tense grid
  const AUX_FORMS = {
    hebben: { ik: 'heb', jij_je: 'hebt / heb je', u: 'heeft / heeft u', hij_zij_het: 'heeft', wij_we: 'hebben', jullie: 'hebben', zij_ze: 'hebben' },
    zijn: { ik: 'ben', jij_je: 'bent / ben je', u: 'is / bent u', hij_zij_het: 'is', wij_we: 'zijn', jullie: 'zijn', zij_ze: 'zijn' },
  };

  const TABS = [
    { id: 'ott', label: 'Presens', abbr: 'OTT', key: '1' },
    { id: 'ovt', label: 'Verleden tijd', abbr: 'OVT', key: '2' },
    { id: 'vtt', label: 'Perfectum', abbr: 'VTT', key: '3' },
    { id: 'imp', label: 'Gebiedende wijs', abbr: 'IMP', key: '4' },
  ];

  const STORE_KEY = 'lexicon-nl:v1';

  /* ------------------------------------------------------------------ *
   * State + tiny helpers
   * ------------------------------------------------------------------ */
  const state = {
    entries: [],
    filters: { article: new Set(), type: new Set(), category: new Set() },
    selectedId: null,
    tab: 'ott',
    rate: 1,
    visible: [],
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const els = {
    filters: $('#filters'),
    list: $('#entryList'),
    count: $('#listCount'),
    clear: $('#clearFilters'),
    detail: $('#detail'),
    trigger: $('#searchTrigger'),
    modKey: $('#modKey'),
    palette: $('#palette'),
    pInput: $('#paletteInput'),
    pList: $('#paletteList'),
    pHint: $('#paletteHint'),
    toast: $('#toast'),
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);
  const variants = (s) => String(s).split('/').map((v) => v.trim()).filter(Boolean);
  const byWord = (a, b) => a.word.localeCompare(b.word, 'nl');
  const findEntry = (id) => state.entries.find((e) => e.id === id);
  const kindOf = (e) => (e.article === 'de' ? 'de' : e.article === 'het' ? 'het' : 'verb');
  const tagOf = (e) => (e.article ? e.article : e.type === 'separable_verb' ? 'sv' : 'v');
  const glossOf = (e) => e.definition_en.split(/[;.(]/)[0].trim();

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (_) { return {}; } },
    set(patch) { try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...store.get(), ...patch })); } catch (_) { /* private mode */ } },
  };

  let toastTimer = 0;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  const ICON = {
    speaker: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8v4h3l4 3.5v-11L6 8z"/><path d="M13.5 7.2a4 4 0 010 5.6M15.8 5a7 7 0 010 10"/></svg>',
  };

  /* ------------------------------------------------------------------ *
   * Data loading (fetch → falls back to data/lexicon.js for file://)
   * ------------------------------------------------------------------ */
  function loadFallbackScript() {
    return new Promise((resolve, reject) => {
      if (Array.isArray(window.__LEXICON__)) return resolve(window.__LEXICON__);
      const s = document.createElement('script');
      s.src = 'data/lexicon.js';
      s.onload = () => (Array.isArray(window.__LEXICON__) ? resolve(window.__LEXICON__) : reject(new Error('lexicon.js is empty')));
      s.onerror = () => reject(new Error('data/lexicon.js not found'));
      document.head.appendChild(s);
    });
  }

  async function loadData() {
    try {
      const res = await fetch('data/lexicon.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (_) {
      return loadFallbackScript();
    }
  }

  function showFatal(err) {
    els.detail.innerHTML = `
      <div class="fatal">
        <h2>Could not load the lexicon</h2>
        <p>${esc(err && err.message ? err.message : err)}</p>
        <p>Start the app with <code>python3 serve.py</code> (or double-click <code>start.command</code> / <code>start.bat</code>) and make sure <code>data/lexicon.json</code> exists.</p>
      </div>`;
  }

  /* ------------------------------------------------------------------ *
   * Filtering (faceted counts)
   * ------------------------------------------------------------------ */
  const FACETS = [
    { key: 'article', label: 'Article', get: (e) => e.article, options: () => ['de', 'het'], text: (v) => v, cls: (v) => 'chip--' + v },
    { key: 'type', label: 'Word type', get: (e) => e.type, options: () => TYPE_ORDER, text: (v) => TYPE_META[v].label, cls: () => '' },
    {
      key: 'category', label: 'Category', get: (e) => e.category,
      options: () => Array.from(new Set(state.entries.map((e) => e.category))).sort((a, b) => a.localeCompare(b, 'nl')),
      text: (v) => v, cls: () => 'chip--cat',
    },
  ];

  function passes(entry, skipKey) {
    return FACETS.every((f) => {
      if (f.key === skipKey) return true;
      const set = state.filters[f.key];
      return set.size === 0 || set.has(f.get(entry));
    });
  }

  const hasActiveFilters = () => FACETS.some((f) => state.filters[f.key].size > 0);

  function renderFilters() {
    const active = document.activeElement;
    const focusKey = active && active.dataset && active.dataset.facet ? `${active.dataset.facet}::${active.dataset.value}` : null;

    els.filters.innerHTML = FACETS.map((f) => {
      const chips = f.options().map((v) => {
        const count = state.entries.filter((e) => passes(e, f.key) && f.get(e) === v).length;
        const pressed = state.filters[f.key].has(v);
        return `<button type="button" class="chip ${f.cls(v)} ${count === 0 ? 'is-empty' : ''}" data-facet="${f.key}" data-value="${esc(v)}" aria-pressed="${pressed}">
          <span class="chip__label">${esc(f.text(v))}</span><span class="chip__count">${count}</span></button>`;
      }).join('');
      return `<div class="filter-group"><div class="filter-group__label">${f.label}</div><div class="chips">${chips}</div></div>`;
    }).join('');

    if (focusKey) {
      const [facet, value] = focusKey.split('::');
      const again = $$('.chip', els.filters).find((c) => c.dataset.facet === facet && c.dataset.value === value);
      if (again) again.focus({ preventScroll: true });
    }
  }

  function computeVisible() {
    state.visible = state.entries.filter((e) => passes(e, null)).sort(byWord);
  }

  function renderList() {
    computeVisible();
    els.count.textContent = `${state.visible.length} of ${state.entries.length} entries`;
    els.clear.hidden = !hasActiveFilters();

    if (!state.visible.length) {
      els.list.innerHTML = `<li class="empty"><strong>No entries match</strong>Try removing a filter.</li>`;
      return;
    }
    els.list.innerHTML = state.visible.map((e) => {
      const k = kindOf(e);
      const word = e.separable_prefix
        ? `<span class="pre">${esc(e.separable_prefix)}</span>${esc(e.word.slice(e.separable_prefix.length))}`
        : esc(e.word);
      return `<li class="entry entry--${k}" role="option" data-id="${esc(e.id)}" aria-selected="${e.id === state.selectedId}">
        <button type="button" class="entry__btn" tabindex="-1">
          <span class="entry__tag">${tagOf(e)}</span>
          <span class="entry__main"><span class="entry__word">${word}</span><span class="entry__gloss">${esc(glossOf(e))}</span></span>
          <span class="entry__level mono">${esc(e.level)}</span>
        </button></li>`;
    }).join('');
  }

  function refreshFilterUI() {
    renderFilters();
    renderList();
    if (state.visible.length && !state.visible.some((e) => e.id === state.selectedId)) {
      selectEntry(state.visible[0].id, { scroll: true });
    } else if (!state.visible.length) {
      renderEmptyDetail();
    }
  }

  function clearFilters() {
    FACETS.forEach((f) => state.filters[f.key].clear());
    refreshFilterUI();
  }

  /* ------------------------------------------------------------------ *
   * Verb form rendering
   * ------------------------------------------------------------------ */
  function variantHTML(variant, e, opts = {}) {
    const pre = e.separable_prefix;
    const toks = variant.split(/\s+/).filter(Boolean);
    let rootIdx = -1;
    if (!opts.aux) {
      rootIdx = toks.findIndex((t) => !PRON_WORDS.has(t.replace(/[!?.,]+$/, '')));
    }
    return toks.map((tok, i) => {
      const bare = tok.replace(/[!?.,]+$/, '');
      const punct = tok.slice(bare.length);
      let cls = 'tok--pron';
      let inner = esc(bare);

      if (opts.aux) {
        if (bare === opts.participle) {
          cls = 'tok--part';
          if (pre && bare.startsWith(pre)) inner = `<span class="tok--prefix">${esc(pre)}</span>${esc(bare.slice(pre.length))}`;
        } else if (!PRON_WORDS.has(bare)) {
          cls = 'tok--aux';
        }
      } else if (pre && bare === pre && i > rootIdx) {
        cls = 'tok--prefix';
      } else if (i === rootIdx) {
        cls = 'tok--root';
      }
      return `<span class="${cls}">${inner}</span>${punct ? `<span class="tok--pron">${esc(punct)}</span>` : ''}`;
    }).join(' ');
  }

  function formHTML(text, e, opts) {
    return variants(text)
      .map((v) => `<span class="variant">${variantHTML(v, e, opts)}</span>`)
      .join('<span class="sep">/</span>');
  }

  const row = (pron, form) => `<div class="para-row" role="row"><div class="para-pron" role="rowheader">${pron}</div><div class="para-form" role="cell">${form}</div></div>`;

  const isRegularPast = (e) => /(de|te)$/.test(e.verb_conjugation.past_ovt.singular.split(/\s+/)[0]);

  function paradigmHTML(e, tab) {
    const v = e.verb_conjugation;
    const pre = e.separable_prefix;
    let rows = '';
    let note = '';

    if (tab === 'ott') {
      rows = PRONOUNS.map((p) => row(p.label, formHTML(v.present_ott[p.key], e))).join('');
      if (pre) note = `Scheidbaar: in de hoofdzin staat de stam op plaats 2 en gaat <span class="mono">${esc(pre)}</span> naar het einde van de zin.`;
    } else if (tab === 'ovt') {
      rows =
        row('<b>Enkelvoud</b><small>ik · jij/je · u · hij/zij/het</small>', formHTML(v.past_ovt.singular, e)) +
        row('<b>Meervoud</b><small>wij/we · jullie · zij/ze</small>', formHTML(v.past_ovt.plural, e));
      if (isRegularPast(e)) {
        const stem = v.present_ott.ik.split(/\s+/).find((t) => !PRON_WORDS.has(t)) || '';
        const te = /(?:[tkfsp]|ch)$/.test(stem);
        note = `Regelmatig — 't kofschip: stam <span class="mono">${esc(stem)}</span> eindigt op <span class="mono">${esc(stem.slice(-1))}</span> → <span class="mono">-${te ? 'te' : 'de'}(n)</span>.`;
      } else {
        note = 'Onregelmatig (sterk) werkwoord — de stamklinker verandert in de verleden tijd.';
      }
    } else if (tab === 'vtt') {
      const aux = AUX_FORMS[v.auxiliary];
      rows = PRONOUNS.map((p) => {
        const text = variants(aux[p.key]).map((a) => `${a} ${v.perfect_vtt.participle}`).join(' / ');
        return row(p.label, formHTML(text, e, { aux: true, participle: v.perfect_vtt.participle }));
      }).join('');
      const part = v.perfect_vtt.participle;
      let build = '';
      if (pre && part.startsWith(pre + 'ge')) {
        build = ` Voltooid deelwoord: <span class="mono">${esc(pre)}</span> + <span class="mono">ge</span> + <span class="mono">${esc(part.slice(pre.length + 2))}</span> — <span class="mono">ge-</span> komt tussen voorvoegsel en stam.`;
      }
      note = `Hulpwerkwoord: <span class="mono">${esc(v.auxiliary)}</span> → <span class="mono">${esc(v.perfect_vtt.full_example)}</span>.${build}`;
    } else {
      const parts = variants(v.imperative);
      const labels = ['jij (informeel)', 'u (formeel)'];
      rows = parts.map((p, i) => row(labels[i] || 'overig', formHTML(p, e))).join('');
      if (pre) note = `Bij gebiedende wijs staat <span class="mono">${esc(pre)}</span> aan het einde: <span class="mono">${esc(parts[0].replace(/[!?.]+$/, ''))}</span>.`;
    }
    return `${rows}${note ? `<div class="para-note">${note}</div>` : ''}`;
  }

  /* ------------------------------------------------------------------ *
   * Sentence dissector — annotate + linked highlighting
   * ------------------------------------------------------------------ */
  // Sequential, whole-word, case-insensitive matching of highlight_terms.
  // Each term is searched after the previous match first (so "meld … aan" pairs
  // up in order), falling back to a search from the start of the sentence.
  function annotate(sentence, terms) {
    const low = sentence.toLowerCase();
    const spans = [];
    let cursor = 0;
    terms.forEach((term, idx) => {
      const t = term.toLowerCase();
      let hit = -1;
      for (const from of [cursor, 0]) {
        let i = low.indexOf(t, from);
        while (i !== -1) {
          if (!isLetter(low[i - 1]) && !isLetter(low[i + t.length])) { hit = i; break; }
          i = low.indexOf(t, i + 1);
        }
        if (hit !== -1) break;
      }
      if (hit !== -1) {
        spans.push({ start: hit, end: hit + t.length, idx });
        cursor = hit + t.length;
      }
    });
    spans.sort((a, b) => a.start - b.start);
    const clean = [];
    spans.forEach((s) => { if (!clean.length || s.start >= clean[clean.length - 1].end) clean.push(s); });
    return clean;
  }

  function sentenceHTML(sentence, terms, e) {
    const spans = annotate(sentence, terms);
    const kind = kindOf(e);
    const pre = e.separable_prefix;
    let out = '';
    let pos = 0;
    spans.forEach((s) => {
      out += esc(sentence.slice(pos, s.start));
      const text = sentence.slice(s.start, s.end);
      const isPrefix = pre && terms.length > 1 && text.toLowerCase() === pre;
      out += `<span class="hl hl--${kind}${isPrefix ? ' is-prefix' : ''}" tabindex="0" data-idx="${s.idx}">${esc(text)}</span>`;
      pos = s.end;
    });
    return out + esc(sentence.slice(pos));
  }

  function clearArcs(sentence) {
    $$('.hl-arc', sentence).forEach((a) => a.remove());
  }

  function linkSentence(sentence) {
    sentence.classList.add('is-linked');
    clearArcs(sentence);
    const hls = $$('.hl', sentence);
    if (hls.length < 2) return;
    const base = sentence.getBoundingClientRect();
    const kind = hls[0].classList.contains('hl--de') ? 'de' : hls[0].classList.contains('hl--het') ? 'het' : 'verb';
    for (let i = 0; i < hls.length - 1; i++) {
      const a = hls[i].getBoundingClientRect();
      const b = hls[i + 1].getBoundingClientRect();
      if (Math.abs(a.bottom - b.bottom) > 6) continue; // wrapped onto another line
      const width = b.left - a.right;
      if (width < 10) continue;
      const arc = document.createElement('span');
      arc.className = `hl-arc hl-arc--${kind}`;
      arc.style.left = `${a.right - base.left + 3}px`;
      arc.style.width = `${width - 6}px`;
      arc.style.top = `${a.bottom - base.top - 1}px`;
      sentence.appendChild(arc);
      requestAnimationFrame(() => arc.classList.add('on'));
    }
  }

  function unlinkSentence(sentence) {
    sentence.classList.remove('is-linked');
    clearArcs(sentence);
  }

  /* ------------------------------------------------------------------ *
   * Detail rendering
   * ------------------------------------------------------------------ */
  function commonPrefixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  function morphValue(article, word, base) {
    const cut = commonPrefixLen(word, base);
    const stem = esc(word.slice(0, cut));
    const changed = word.slice(cut);
    return `<span class="art art--${article}">${article}</span><span>${stem}${changed ? `<span class="chg">${esc(changed)}</span>` : ''}</span>`;
  }

  function nounHTML(e) {
    const n = e.noun_inflection;
    const split = (s) => { const [art, ...rest] = s.split(' '); return [art, rest.join(' ')]; };
    const [sa, sw] = split(n.singular);
    const [pa, pw] = split(n.plural);
    const [da, dw] = split(n.diminutive_singular);
    const [dpa, dpw] = split(n.diminutive_plural);
    const card = (label, sub, article, inner, hint) => `
      <div class="morph-card morph-card--${article}">
        <div class="morph-card__label"><span>${label}</span><b>${sub}</b></div>
        <div class="morph-card__value">${inner}</div>
        ${hint ? `<div class="morph-card__hint">${hint}</div>` : ''}
      </div>`;
    const dimSuffix = dw.slice(commonPrefixLen(dw, sw));
    return `
      <div class="morph-grid">
        ${card('Enkelvoud', 'singular', sa, `<span class="art art--${sa}">${sa}</span><span>${esc(sw)}</span>`, `Lidwoord: <span class="mono">${sa}</span>-woord`)}
        ${card('Meervoud', 'plural', pa, morphValue(pa, pw, sw), 'Meervoud altijd met <span class="mono">de</span>')}
        ${card('Verkleinwoord enkelvoud', 'diminutive', da, morphValue(da, dw, sw), `Altijd <span class="mono">het</span>${dimSuffix ? ` · uitgang <span class="mono">-${esc(dimSuffix)}</span>` : ''}`)}
        ${card('Verkleinwoord meervoud', 'diminutive pl.', dpa, morphValue(dpa, dpw, dw), 'Verkleinwoord + <span class="mono">-s</span>')}
      </div>`;
  }

  function examplesHTML(e) {
    return e.examples.map((x, i) => `
      <article class="ex-card">
        <div class="ex-card__head">
          <span class="ex-card__n">${String(i + 1).padStart(2, '0')}</span>
          <span class="ex-card__ctx">${esc(x.context)}</span>
          <button type="button" class="icon-btn" data-act="say" data-text="${esc(x.dutch)}" aria-label="Play sentence ${i + 1}" title="Play sentence">${ICON.speaker}</button>
        </div>
        <p class="sentence" lang="nl">${sentenceHTML(x.dutch, x.highlight_terms, e)}</p>
        <p class="ex-card__en">${esc(x.english)}</p>
      </article>`).join('');
  }

  function sourcesHTML(e) {
    const w = encodeURIComponent(e.word);
    const mw = e.type === 'noun'
      ? `https://www.mijnwoordenboek.nl/vertaal/NL/EN/${w}`
      : `https://www.mijnwoordenboek.nl/werkwoord/${w}`;
    return `
      <footer class="sources">
        <span>Cross-check</span>
        <a href="https://anw.ivdnt.org/artikel/${w}" target="_blank" rel="noopener noreferrer">ANW ↗</a>
        <a href="https://www.woorden.org/woord/${w}" target="_blank" rel="noopener noreferrer">woorden.org ↗</a>
        <a href="${mw}" target="_blank" rel="noopener noreferrer">mijnwoordenboek ↗</a>
        <span class="sources__note">Seed entry compiled from standard Dutch grammar knowledge; it has not yet been cross-checked against these sources.</span>
      </footer>`;
  }

  function heroHTML(e) {
    const k = kindOf(e);
    const pre = e.separable_prefix;
    const isVerb = e.type !== 'noun';
    const v = e.verb_conjugation;

    const wordHTML = pre
      ? `<span class="w-prefix">${esc(pre)}</span><span class="w-root">${esc(e.word.slice(pre.length))}</span>`
      : `<span class="w-root">${esc(e.word)}</span>`;

    const badges = [
      isVerb ? `<span class="badge badge--verb">${e.type === 'separable_verb' ? 'separable verb' : 'verb'}</span>` : `<span class="badge badge--article">${e.article}</span>`,
      isVerb ? '' : '<span class="badge">noun</span>',
      `<span class="badge">${esc(e.level)}</span>`,
      `<span class="badge badge--muted">${esc(e.category)}</span>`,
      isVerb ? `<span class="badge badge--aux" title="Auxiliary in the perfect tense">aux · ${esc(v.auxiliary)}</span>` : '',
    ].join('');

    let sub = '';
    if (pre) {
      const ik = v.present_ott.ik.split(/\s+/).filter((t) => !PRON_WORDS.has(t));
      sub = `<div class="hero__sub mono"><span>scheidbaar</span><span class="sp">${esc(pre)}</span><span>+</span><span>${esc(e.word.slice(pre.length))}</span><span class="arrow">→</span><span>${esc(ik[0])} … <span class="sp">${esc(pre)}</span></span></div>`;
    } else if (isVerb) {
      sub = `<div class="hero__sub mono"><span>${esc(TYPE_META[e.type].nl)}</span><span class="arrow">·</span><span>${esc(v.past_ovt.singular)}</span><span class="arrow">·</span><span>${esc(v.perfect_vtt.full_example)}</span></div>`;
    } else {
      sub = `<div class="hero__sub mono"><span>${esc(TYPE_META.noun.nl)}</span><span class="arrow">·</span><span>${esc(e.noun_inflection.plural)}</span></div>`;
    }

    const prep = e.fixed_preposition
      ? `<span class="prep"><span class="prep__k">vaste prep.</span>${esc(e.fixed_preposition)}</span>`
      : '';

    return `
      <section class="hero kind--${k}">
        <div class="hero__glow"></div>
        <div class="hero__top">${badges}</div>
        <h1 class="hero__word" lang="nl">${wordHTML}</h1>
        ${sub}
        <div class="hero__defs">
          <p class="def-nl" lang="nl">${esc(e.definition_nl)}</p>
          <p class="def-en">${esc(e.definition_en)}</p>
        </div>
        <div class="hero__foot">
          ${prep}
          <div class="audio">
            <button type="button" class="btn" data-act="play">${ICON.speaker}<span>Listen</span><kbd>P</kbd></button>
            <div class="seg" role="group" aria-label="Playback speed">
              <button type="button" class="seg__btn" data-act="rate" data-rate="1" aria-pressed="${state.rate === 1}">1.0×</button>
              <button type="button" class="seg__btn" data-act="rate" data-rate="0.8" aria-pressed="${state.rate === 0.8}">0.8×</button>
            </div>
          </div>
        </div>
      </section>`;
  }

  function renderDetail(e, animate = true) {
    const k = kindOf(e);
    const isVerb = e.type !== 'noun';

    const paradigm = isVerb ? `
      <section class="block kind--verb" aria-label="Verb paradigm">
        <div class="block__head"><h2 class="block__title">Verb paradigm</h2><span class="block__sub mono">${esc(e.verb_conjugation.infinitive)} · ${esc(e.verb_conjugation.auxiliary)}</span></div>
        <div class="tabs" role="tablist" aria-label="Tense">
          ${TABS.map((t) => `<button type="button" role="tab" class="tab" data-act="tab" data-tab="${t.id}" aria-selected="${t.id === state.tab}"><span>${t.label}</span><span class="tab__key">${t.abbr}</span></button>`).join('')}
        </div>
        <div class="paradigm" role="table" id="paradigm">${paradigmHTML(e, state.tab)}</div>
      </section>` : `
      <section class="block kind--${k}" aria-label="Noun morphology">
        <div class="block__head"><h2 class="block__title">Noun morphology</h2><span class="block__sub mono">enkelvoud · meervoud · verkleinwoord</span></div>
        ${nounHTML(e)}
      </section>`;

    els.detail.innerHTML = `
      <div class="detail-inner kind--${k}${animate ? ' enter' : ''}">
        ${heroHTML(e)}
        ${paradigm}
        <section class="block" aria-label="Example sentences">
          <div class="block__head"><h2 class="block__title">Sentence dissector</h2><span class="block__sub mono">hover a highlight to link its parts</span></div>
          <div class="ex-list">${examplesHTML(e)}</div>
        </section>
        ${sourcesHTML(e)}
      </div>`;
    els.detail.scrollTop = 0;
  }

  function renderEmptyDetail() {
    els.detail.innerHTML = `<div class="fatal"><h2>Nothing selected</h2><p>No entries match the current filters.</p><p><button class="link-btn" type="button" data-act="clear-filters">Clear filters</button></p></div>`;
  }

  function setTab(tabId) {
    const e = findEntry(state.selectedId);
    if (!e || e.type === 'noun' || !TABS.some((t) => t.id === tabId)) return;
    state.tab = tabId;
    $$('.tab', els.detail).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tabId)));
    const box = $('#paradigm', els.detail);
    if (!box) return;
    box.innerHTML = paradigmHTML(e, tabId);
    box.classList.remove('swap');
    void box.offsetWidth; // restart the animation
    box.classList.add('swap');
  }

  /* ------------------------------------------------------------------ *
   * Selection + navigation
   * ------------------------------------------------------------------ */
  function selectEntry(id, opts = {}) {
    const e = findEntry(id);
    if (!e) return;
    const changed = state.selectedId !== id;
    state.selectedId = id;
    if (changed) state.tab = 'ott';
    stopSpeech();

    $$('.entry', els.list).forEach((li) => {
      const on = li.dataset.id === id;
      li.setAttribute('aria-selected', String(on));
      if (on && opts.scroll) li.scrollIntoView({ block: 'nearest' });
    });
    renderDetail(e, changed || opts.forceAnimate);
    document.title = `${e.article ? e.article + ' ' : ''}${e.word} — Lexicon NL`;
    store.set({ last: id });
    if (!opts.fromHash && location.hash !== '#' + id) {
      try { history.replaceState(null, '', '#' + id); } catch (_) { /* file:// in some browsers */ }
    }
  }

  function step(delta) {
    if (!state.visible.length) return;
    const i = state.visible.findIndex((e) => e.id === state.selectedId);
    const next = state.visible[Math.min(state.visible.length - 1, Math.max(0, (i < 0 ? 0 : i + delta)))];
    if (next && next.id !== state.selectedId) selectEntry(next.id, { scroll: true });
  }

  function revealEntry(id) {
    if (!state.visible.some((e) => e.id === id)) {
      FACETS.forEach((f) => state.filters[f.key].clear());
      renderFilters();
      renderList();
    }
    selectEntry(id, { scroll: true });
  }

  /* ------------------------------------------------------------------ *
   * Speech (Web Speech API, nl-NL)
   * ------------------------------------------------------------------ */
  let dutchVoice = null;
  let warnedNoVoice = false;

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    dutchVoice =
      voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'nl-nl') ||
      voices.find((v) => v.lang.toLowerCase().startsWith('nl')) ||
      null;
  }

  function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    $$('.is-playing').forEach((n) => n.classList.remove('is-playing'));
  }

  function speak(text, button) {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      toast('Speech synthesis is not supported in this browser.');
      return;
    }
    stopSpeech();
    pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-NL';
    u.rate = state.rate;
    if (dutchVoice) u.voice = dutchVoice;
    else if (!warnedNoVoice) { warnedNoVoice = true; toast('No Dutch (nl-NL) voice installed — pronunciation may be off.'); }
    if (button) {
      button.classList.add('is-playing');
      const done = () => button.classList.remove('is-playing');
      u.onend = done;
      u.onerror = done;
    }
    window.speechSynthesis.speak(u);
  }

  function setRate(rate) {
    state.rate = rate;
    store.set({ rate });
    $$('.seg__btn', els.detail).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.rate) === rate)));
  }

  /* ------------------------------------------------------------------ *
   * Command palette (fuzzy search)
   * ------------------------------------------------------------------ */
  let index = [];
  let pResults = [];
  let pActive = 0;
  let pOpen = false;
  let lastFocus = null;

  function collectForms(e) {
    const out = new Set();
    const add = (s) => { const t = String(s).replace(/[!?]/g, '').trim(); if (t) out.add(t); };
    if (e.noun_inflection) {
      Object.values(e.noun_inflection).forEach((s) => add(s.replace(/^(de|het)\s+/, '')));
    }
    const v = e.verb_conjugation;
    if (v) {
      variants(v.imperative).forEach(add);
      Object.values(v.present_ott).forEach((s) => variants(s).forEach(add));
      Object.values(v.past_ovt).forEach((s) => variants(s).forEach(add));
      add(v.perfect_vtt.participle);
      add(v.perfect_vtt.full_example);
    }
    out.delete(e.word);
    return Array.from(out);
  }

  function buildIndex() {
    index = state.entries.map((e) => ({
      entry: e,
      fields: [
        { key: 'word', label: '', text: e.word, weight: 1, subseq: true },
        ...collectForms(e).map((t) => ({ key: 'form', label: 'form', text: t, weight: 0.85, subseq: true })),
        { key: 'en', label: 'EN', text: e.definition_en, weight: 0.6, subseq: false },
        { key: 'cat', label: 'category', text: e.category, weight: 0.5, subseq: false },
        { key: 'nl', label: 'NL', text: e.definition_nl, weight: 0.4, subseq: false },
        { key: 'type', label: 'type', text: `${TYPE_META[e.type].label} ${TYPE_META[e.type].nl} ${e.article || ''} ${e.level}`.trim(), weight: 0.3, subseq: false },
      ],
    }));
  }

  const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
  const isAlnum = (ch) => !!ch && /[a-z0-9]/i.test(ch);

  // Returns { score, pos } or null. `q` must already be normalised.
  function matchField(q, raw, allowSubseq) {
    const t = norm(raw);
    if (t === q) return { score: 1000, pos: range(0, q.length) };
    if (t.startsWith(q)) return { score: 900 - (t.length - q.length) * 2, pos: range(0, q.length) };

    let best = null;
    let i = t.indexOf(q);
    while (i !== -1) {
      const wordStart = !isAlnum(t[i - 1]);
      const score = (wordStart ? 700 : 480) - i;
      if (!best || score > best.score) best = { score, pos: range(i, i + q.length) };
      i = t.indexOf(q, i + 1);
    }
    if (best) return best;

    if (allowSubseq && q.length >= 3) {
      let bestSpan = null;
      for (let s = t.indexOf(q[0]); s !== -1; s = t.indexOf(q[0], s + 1)) {
        const pos = [s];
        let from = s + 1;
        let ok = true;
        for (let k = 1; k < q.length; k++) {
          const at = t.indexOf(q[k], from);
          if (at === -1) { ok = false; break; }
          pos.push(at);
          from = at + 1;
        }
        if (!ok) continue;
        const span = pos[pos.length - 1] - pos[0] + 1;
        if (span <= q.length * 2 + 1 && (!bestSpan || span < bestSpan.span)) bestSpan = { span, pos };
      }
      if (bestSpan) return { score: 300 - bestSpan.span * 3 - bestSpan.pos[0], pos: bestSpan.pos };
    }
    return null;
  }

  function search(query) {
    const q = norm(query.trim());
    if (!q) {
      return state.entries.slice().sort(byWord).map((entry) => ({ entry, field: 'word', text: entry.word, pos: [], score: 0 }));
    }
    const results = [];
    index.forEach(({ entry, fields }) => {
      let best = null;
      fields.forEach((f) => {
        const m = matchField(q, f.text, f.subseq);
        if (!m) return;
        const score = m.score * f.weight;
        if (!best || score > best.score) best = { entry, field: f.key, label: f.label, text: f.text, pos: m.pos, score };
      });
      if (best) results.push(best);
    });
    results.sort((a, b) => b.score - a.score || byWord(a.entry, b.entry));
    return results.slice(0, 30);
  }

  function markText(text, pos) {
    if (!pos || !pos.length) return esc(text);
    const set = new Set(pos);
    let out = '';
    let open = false;
    for (let i = 0; i < text.length; i++) {
      const on = set.has(i);
      if (on && !open) { out += '<mark>'; open = true; }
      if (!on && open) { out += '</mark>'; open = false; }
      out += esc(text[i]);
    }
    return open ? out + '</mark>' : out;
  }

  function renderPalette() {
    const q = els.pInput.value;
    pResults = search(q);
    pActive = Math.min(pActive, Math.max(0, pResults.length - 1));
    els.pHint.textContent = q.trim() ? `${pResults.length} match${pResults.length === 1 ? '' : 'es'}` : `${state.entries.length} entries`;

    if (!pResults.length) {
      els.pList.innerHTML = `<li class="p-empty">No results for “${esc(q)}”</li>`;
      return;
    }
    els.pList.innerHTML = pResults.map((r, i) => {
      const e = r.entry;
      const k = kindOf(e);
      const wordHTML = r.field === 'word' ? markText(e.word, r.pos) : esc(e.word);
      const sub = r.field === 'word' || !q.trim()
        ? `<span>${esc(glossOf(e))}</span>`
        : `<span class="p-item__why">${esc(r.label)}</span><span>${markText(r.text, r.pos)}</span>`;
      return `<li class="p-item p-item--${k}" role="option" id="p-${i}" data-i="${i}" aria-selected="${i === pActive}">
        <span class="p-item__tag">${tagOf(e)}</span>
        <span class="p-item__main"><span class="p-item__word">${wordHTML}</span><span class="p-item__sub">${sub}</span></span>
        <span class="p-item__right"><span class="p-item__lvl">${esc(e.level)}</span><span class="p-item__type">${esc(TYPE_META[e.type].label)}</span></span>
      </li>`;
    }).join('');
    els.pInput.setAttribute('aria-activedescendant', `p-${pActive}`);
  }

  function setPaletteActive(i, scroll = true) {
    if (!pResults.length) return;
    pActive = (i + pResults.length) % pResults.length;
    $$('.p-item', els.pList).forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === pActive)));
    els.pInput.setAttribute('aria-activedescendant', `p-${pActive}`);
    if (scroll) {
      const li = $(`#p-${pActive}`, els.pList);
      if (li) li.scrollIntoView({ block: 'nearest' });
    }
  }

  function openPalette() {
    if (pOpen) return;
    pOpen = true;
    lastFocus = document.activeElement;
    els.palette.hidden = false;
    els.trigger.setAttribute('aria-expanded', 'true');
    els.pInput.value = '';
    pActive = 0;
    renderPalette();
    els.pInput.focus();
  }

  function closePalette(restore = true) {
    if (!pOpen) return;
    pOpen = false;
    els.palette.hidden = true;
    els.trigger.setAttribute('aria-expanded', 'false');
    if (restore && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function commitPalette(i = pActive) {
    const r = pResults[i];
    if (!r) return;
    closePalette(false);
    revealEntry(r.entry.id);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */
  const isTyping = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

  function bindEvents() {
    // Filters
    els.filters.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.chip');
      if (!chip) return;
      const set = state.filters[chip.dataset.facet];
      const v = chip.dataset.value;
      if (set.has(v)) set.delete(v); else set.add(v);
      refreshFilterUI();
    });
    els.clear.addEventListener('click', clearFilters);

    // List
    els.list.addEventListener('click', (ev) => {
      const li = ev.target.closest('.entry');
      if (li) selectEntry(li.dataset.id);
    });

    // Detail: actions (delegated)
    els.detail.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'play') { const e = findEntry(state.selectedId); if (e) speak(e.audio_query || e.word, btn); }
      else if (act === 'say') speak(btn.dataset.text, btn);
      else if (act === 'rate') setRate(Number(btn.dataset.rate));
      else if (act === 'tab') setTab(btn.dataset.tab);
      else if (act === 'clear-filters') clearFilters();
    });

    // Sentence dissector: hover / focus links every highlighted part of a sentence
    els.detail.addEventListener('mouseover', (ev) => {
      const hl = ev.target.closest('.hl');
      if (hl) linkSentence(hl.closest('.sentence'));
    });
    els.detail.addEventListener('mouseout', (ev) => {
      const hl = ev.target.closest('.hl');
      if (hl && !(ev.relatedTarget && hl.closest('.sentence').contains(ev.relatedTarget) && ev.relatedTarget.closest && ev.relatedTarget.closest('.hl'))) {
        unlinkSentence(hl.closest('.sentence'));
      }
    });
    els.detail.addEventListener('focusin', (ev) => {
      const hl = ev.target.closest && ev.target.closest('.hl');
      if (hl) linkSentence(hl.closest('.sentence'));
    });
    els.detail.addEventListener('focusout', (ev) => {
      const hl = ev.target.closest && ev.target.closest('.hl');
      if (hl) unlinkSentence(hl.closest('.sentence'));
    });

    // Palette
    els.trigger.addEventListener('click', openPalette);
    els.palette.addEventListener('click', (ev) => { if (ev.target.hasAttribute('data-close')) closePalette(); });
    els.pInput.addEventListener('input', () => { pActive = 0; renderPalette(); });
    els.pList.addEventListener('mousemove', (ev) => {
      const li = ev.target.closest('.p-item');
      if (li && Number(li.dataset.i) !== pActive) setPaletteActive(Number(li.dataset.i), false);
    });
    els.pList.addEventListener('click', (ev) => {
      const li = ev.target.closest('.p-item');
      if (li) commitPalette(Number(li.dataset.i));
    });

    // Global keyboard
    document.addEventListener('keydown', (ev) => {
      const mod = ev.metaKey || ev.ctrlKey;
      if (mod && ev.key.toLowerCase() === 'k') {
        ev.preventDefault();
        if (pOpen) closePalette(); else openPalette();
        return;
      }

      if (pOpen) {
        if (ev.key === 'Escape') { ev.preventDefault(); closePalette(); }
        else if (ev.key === 'ArrowDown' || (ev.ctrlKey && ev.key.toLowerCase() === 'n')) { ev.preventDefault(); setPaletteActive(pActive + 1); }
        else if (ev.key === 'ArrowUp' || (ev.ctrlKey && ev.key.toLowerCase() === 'p')) { ev.preventDefault(); setPaletteActive(pActive - 1); }
        else if (ev.key === 'Enter') { ev.preventDefault(); commitPalette(); }
        else if (ev.key === 'Tab') { ev.preventDefault(); }
        return;
      }

      if (mod || ev.altKey || isTyping(ev.target)) return;
      const key = ev.key;
      if (key === '/') { ev.preventDefault(); openPalette(); }
      else if (key === 'ArrowDown' || key === 'j' || key === 'J') { ev.preventDefault(); step(1); }
      else if (key === 'ArrowUp' || key === 'k' || key === 'K') { ev.preventDefault(); step(-1); }
      else if (key === 'p' || key === 'P') { const b = $('[data-act="play"]', els.detail); if (b) b.click(); }
      else if (key === 's' || key === 'S') { setRate(state.rate === 1 ? 0.8 : 1); toast(`Playback speed ${state.rate === 1 ? '1.0×' : '0.8×'}`); }
      else if (/^[1-4]$/.test(key)) { const t = TABS.find((x) => x.key === key); if (t) setTab(t.id); }
      else if (key === 'Escape') { stopSpeech(); if (hasActiveFilters()) clearFilters(); }
    });

    window.addEventListener('hashchange', () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (id && id !== state.selectedId && findEntry(id)) revealEntry(id);
    });
    window.addEventListener('beforeunload', stopSpeech);
    if ('speechSynthesis' in window) {
      pickVoice();
      window.speechSynthesis.onvoiceschanged = pickVoice;
    }
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  async function init() {
    els.modKey.textContent = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';
    const saved = store.get();
    if (saved.rate === 0.8) state.rate = 0.8;

    let data;
    try {
      data = await loadData();
    } catch (err) {
      showFatal(err);
      return;
    }
    state.entries = data;
    buildIndex();
    bindEvents();
    renderFilters();
    renderList();

    const fromHash = decodeURIComponent(location.hash.slice(1));
    const start = [fromHash, saved.last].find((id) => id && findEntry(id)) || state.visible[0].id;
    selectEntry(start, { scroll: true, fromHash: true, forceAnimate: true });
  }

  init();
})();
