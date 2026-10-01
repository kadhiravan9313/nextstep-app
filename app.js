const LANGS = { en: 'English', ta: 'தமிழ்', hi: 'हिन्दी', bn: 'বাংলা', te: 'తెలుగు', mr: 'मराठी', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ', ur: 'اردو', es: 'Español', fr: 'Français', de: 'Deutsch', pt: 'Português', it: 'Italiano', ru: 'Русский', uk: 'Українська', ar: 'العربية', fa: 'فارسی', he: 'עברית', tr: 'Türkçe', zh: '中文', ja: '日本語', ko: '한국어', th: 'ไทย', vi: 'Tiếng Việt', id: 'Bahasa Indonesia', pl: 'Polski', nl: 'Nederlands', el: 'Ελληνικά', sw: 'Kiswahili' };
const HAND = ['en', 'ta', 'hi'];
const RTL = ['ar', 'ur', 'fa', 'he'];
const CACHE_V = '6';
let DYN = {};
let CONFIG = { announcement: '', aiEnabled: true, goatcounter: '', guidesVersion: 1 };
let notice = '';
const UI = {
  en: { tagline: 'Type your problem in simple words. Works offline.', placeholder: 'e.g. dal too salty, wifi no internet', find: 'Find guide', nofound: 'No guide found. Try different words.', question: 'Question', of: 'of', situation: 'Your situation', helped: 'Did this help?', yes: 'Yes', no: 'No', back: 'Back', home: 'Home', broken: 'This guide has a broken link.', load: 'Could not load guides.', ask: 'Ask AI (any question, works offline)' },
  ta: { tagline: 'உங்கள் பிரச்சினையை எளிய வார்த்தைகளில் எழுதுங்கள். இணையம் இல்லாமலும் வேலை செய்யும்.', placeholder: 'எ.கா. பருப்பில் உப்பு அதிகம்', find: 'வழிகாட்டியைத் தேடு', nofound: 'வழிகாட்டி கிடைக்கவில்லை. வேறு வார்த்தைகளை முயற்சிக்கவும்.', question: 'கேள்வி', of: '/', situation: 'உங்கள் நிலை', helped: 'இது உதவியதா?', yes: 'ஆம்', no: 'இல்லை', back: 'பின்செல்', home: 'முகப்பு', broken: 'இந்த வழிகாட்டியில் இணைப்பு பிழை உள்ளது.', ask: 'AI-யிடம் கேளுங்கள் (எந்த கேள்வியும், இணையம் இல்லாமல்)' },
  hi: { tagline: 'अपनी समस्या आसान शब्दों में लिखें। बिना इंटरनेट भी चलता है।', placeholder: 'जैसे: दाल में नमक ज़्यादा', find: 'गाइड खोजें', nofound: 'कोई गाइड नहीं मिला। दूसरे शब्द आज़माएँ।', question: 'प्रश्न', of: '/', situation: 'आपकी स्थिति', helped: 'क्या इससे मदद मिली?', yes: 'हाँ', no: 'नहीं', back: 'वापस', home: 'होम', broken: 'इस गाइड में टूटा हुआ लिंक है।', ask: 'AI से पूछें (कोई भी सवाल, बिना इंटरनेट)' }
};
let lang = 'en';
try { lang = localStorage.getItem('lang') || 'en'; } catch (e) {}
if (!LANGS[lang]) lang = 'en';
const t = k => ((UI[lang] || DYN[lang] || {})[k]) || UI.en[k];

let guides = [];
const app = document.getElementById('app');

function el(tag, text, cls, onclick) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  if (onclick) e.onclick = onclick;
  return e;
}
function getFb() { try { return JSON.parse(localStorage.getItem('fb') || '{}'); } catch (e) { return {}; } }
function rate(id, good) {
  const f = getFb(); f[id] = (f[id] || 0) + (good ? 1 : -1);
  try { localStorage.setItem('fb', JSON.stringify(f)); } catch (e) {}
}

async function loadConfig() {
  try { CONFIG = { ...CONFIG, ...(await (await fetch('config.json', { cache: 'no-store' })).json()) }; } catch (e) {}
  if (CONFIG.goatcounter && navigator.onLine) {
    const s = document.createElement('script');
    s.async = true; s.src = '//gc.zgo.at/count.js';
    s.dataset.goatcounter = 'https://' + CONFIG.goatcounter + '.goatcounter.com/count';
    document.head.append(s);
  }
}

async function autoTranslate(base) {
  const key = 'tr' + CACHE_V + '_' + CONFIG.guidesVersion + '_' + lang;
  try { const c = localStorage.getItem(key); if (c) { const d = JSON.parse(c); DYN[lang] = d.ui; return d.guides; } } catch (e) {}
  if (!('Translator' in self)) throw new Error('unsupported');
  const opts = { sourceLanguage: 'en', targetLanguage: lang };
  if ((await Translator.availability(opts)) === 'unavailable') throw new Error('unsupported');
  app.replaceChildren(el('p', 'Preparing ' + LANGS[lang] + '... (first time needs internet)'));
  const tr = await Translator.create(opts);
  const memo = {};
  const T = async s => (memo[s] = memo[s] || await tr.translate(s));
  const TEXT = ['title', 'q', 'text', 'a'], LIST = ['steps', 'after', 'before'];
  const walk = async o => {
    if (Array.isArray(o)) { const r = []; for (const x of o) r.push(await walk(x)); return r; }
    if (o && typeof o === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(o)) {
        if (TEXT.includes(k) && typeof v === 'string') out[k] = await T(v);
        else if (LIST.includes(k) && Array.isArray(v)) { out[k] = []; for (const s of v) out[k].push(await T(s)); }
        else if (k === 'triggers') { const x = []; for (const s of v) x.push(await T(s)); out[k] = [...v, ...x]; }
        else out[k] = await walk(v);
      }
      return out;
    }
    return o;
  };
  const guides = await walk(base);
  const ui = {};
  for (const [k, v] of Object.entries(UI.en)) ui[k] = await T(v);
  DYN[lang] = ui;
  try { localStorage.setItem(key, JSON.stringify({ ui, guides })); } catch (e) {}
  return guides;
}

async function loadGuides() {
  document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr';
  const base = await (await fetch('guides.json')).json();
  if (lang === 'en') return base;
  if (!HAND.includes(lang)) {
    try { return await autoTranslate(base); }
    catch (e) {
      notice = 'Automatic translation to ' + LANGS[lang] + ' is not available here. It needs Chrome on a computer. Showing English.';
      lang = 'en'; document.documentElement.dir = 'ltr';
      try { localStorage.setItem('lang', 'en'); } catch (x) {}
      return base;
    }
  }
  let tr = [];
  try { tr = await (await fetch('guides.' + lang + '.json')).json(); } catch (e) {}
  const byId = {};
  tr.forEach(g => { byId[g.id] = g; });
  return base.map(b => byId[b.id]
    ? { ...byId[b.id], start: b.start, triggers: [...byId[b.id].triggers, ...b.triggers] }
    : b);
}

function findGuides(text) {
  const words = text.toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(w => w.length > 2);
  const f = getFb();
  return guides
    .map(g => {
      const s = words.filter(w => g.triggers.some(x => x.toLowerCase().startsWith(w) || w.startsWith(x.toLowerCase()))).length;
      return { g, s, score: s + (f[g.id] || 0) * 0.1 };
    })
    .filter(x => x.s > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.g);
}

function home() {
  app.replaceChildren();
  const sel = el('select');
  Object.keys(LANGS).forEach(k => {
    const o = el('option', LANGS[k]); o.value = k; if (k === lang) o.selected = true; sel.append(o);
  });
  sel.onchange = async () => {
    lang = sel.value;
    try { localStorage.setItem('lang', lang); } catch (e) {}
    guides = await loadGuides();
    home();
  };
  app.append(sel, el('h1', 'NextStep'), el('p', t('tagline')));
  if (CONFIG.announcement) { const n = el('p', CONFIG.announcement); n.style.cssText = 'background:#fffbe6;border:1px solid #f0d36b;padding:10px;border-radius:8px'; app.append(n); }
  if (notice) { app.append(el('p', notice)); notice = ''; }
  if (!HAND.includes(lang)) app.append(el('p', 'Automatic translation: please double-check important steps.'));
  const input = el('input'); input.placeholder = t('placeholder');
  const results = el('div');
  const search = () => {
    results.replaceChildren();
    const found = findGuides(input.value);
    if (!found.length) results.append(el('p', t('nofound')));
    found.slice(0, 3).forEach(g => results.append(el('button', g.title, 'alt', () => run(g))));
    if (CONFIG.aiEnabled !== false) results.append(el('button', t('ask'), 'alt', () => askAI(input.value)));
  };
  input.onkeydown = e => { if (e.key === 'Enter') search(); };
  app.append(input, el('button', t('find'), '', search), results);
  const foot = el('p', 'This app counts anonymous visits. It does not collect names, phone numbers or personal data.'); foot.style.cssText = 'font-size:13px;color:#718096;margin-top:30px'; app.append(foot);
}

const MODELS = [
  ['Qwen2.5-0.5B-Instruct-q4f32_1-MLC', 'Fast: smaller model (less accurate)'],
  ['Qwen2.5-1.5B-Instruct-q4f32_1-MLC', 'Better: larger model (slower, needs more memory)']
];
let engine = null, engineId = '';

function askAI(question) {
  app.replaceChildren(el('h1', 'Ask AI'),
    el('p', 'Runs on your own device. The first time needs internet to download the model; after that it works offline. AI answers can be wrong, so double-check important things, and never rely on it for health, electricity or gas safety.'));
  const input = el('input'); input.value = question || ''; input.placeholder = 'Type your question';
  const sel = el('select');
  MODELS.forEach(m => { const o = el('option', m[1]); o.value = m[0]; sel.append(o); });
  const status = el('p');
  const box = el('div', '', 'step'); box.style.whiteSpace = 'pre-wrap';
  const go = el('button', 'Get answer', '', async () => {
    if (!input.value.trim()) return;
    go.disabled = true; box.textContent = '';
    try {
      if (!navigator.gpu) throw new Error('this browser has no WebGPU. Use Chrome on a computer or a recent Android phone.');
      if (!engine || engineId !== sel.value) {
        if (engine) { await engine.unload(); engine = null; }
        status.textContent = 'Loading model...';
        const wl = await import('./webllm.js');
        engine = await wl.CreateMLCEngine(sel.value, { initProgressCallback: p => { status.textContent = p.text; } });
        engineId = sel.value;
      }
      status.textContent = 'Thinking...';
      const stream = await engine.chat.completions.create({
        stream: true, temperature: 0.4, max_tokens: 700,
        messages: [
          { role: 'system', content: 'You are a patient helper. Answer the question in simple words as short numbered steps. Be accurate and brief. Reply in ' + LANGS[lang] + '.' },
          { role: 'user', content: input.value }]
      });
      for await (const chunk of stream) box.textContent += (chunk.choices[0] && chunk.choices[0].delta.content) || '';
      status.textContent = '';
    } catch (e) { status.textContent = 'Could not run AI: ' + e.message; }
    go.disabled = false;
  });
  app.append(input, sel, go, status, box, el('button', t('home'), 'alt', home));
}

function helpButtons(g) {
  app.append(el('p', t('helped')));
  app.append(el('button', t('yes'), '', () => { rate(g.id, true); home(); }));
  app.append(el('button', t('no'), 'alt', () => { rate(g.id, false); home(); }));
}

function run(g) {
  if (g.questions) return plan(g);
  const path = [g.start];
  const show = () => {
    const b = g.blocks[path[path.length - 1]];
    app.replaceChildren(el('h1', g.title));
    if (!b) { app.append(el('p', t('broken'))); }
    else if (b.a) { app.append(el('div', b.a, 'text')); helpButtons(g); }
    else {
      app.append(el('div', b.q, 'text'));
      b.options.forEach(o => app.append(el('button', o.text, '', () => { path.push(o.next); show(); })));
    }
    if (path.length > 1) app.append(el('button', t('back'), 'alt', () => { path.pop(); show(); }));
    app.append(el('button', t('home'), 'alt', home));
  };
  show();
}

function plan(g) {
  const picks = [];
  const show = () => {
    app.replaceChildren(el('h1', g.title));
    const i = picks.length;
    if (i < g.questions.length) {
      const q = g.questions[i];
      app.append(el('p', t('question') + ' ' + (i + 1) + ' ' + t('of') + ' ' + g.questions.length), el('div', q.q, 'text'));
      q.options.forEach((o, k) => app.append(el('button', o.text, '', () => { picks.push(k); show(); })));
    } else {
      const chosen = picks.map((k, qi) => g.questions[qi].options[k]);
      const steps = [...(g.before || []), ...chosen.flatMap(o => o.steps || []), ...(g.after || [])]
        .filter((s, n, all) => all.indexOf(s) === n);
      app.append(el('p', t('situation') + ': ' + chosen.map(o => o.text).join(' | ')));
      steps.forEach((s, n) => app.append(el('div', (n + 1) + '. ' + s, 'step')));
      helpButtons(g);
    }
    if (picks.length) app.append(el('button', t('back'), 'alt', () => { picks.pop(); show(); }));
    app.append(el('button', t('home'), 'alt', home));
  };
  show();
}

loadConfig().then(loadGuides).then(d => { guides = d; home(); })
  .catch(() => { app.textContent = t('load'); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
