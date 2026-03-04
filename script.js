// ─── State ──────────────────────────────────────────────────
const TOTAL_DAYS = 10;
const ODD_NIGHTS = [1, 3, 5, 7, 9]; // Oneven nachten (Laylatul Qadr-kandidaten)
const WEEKDAYS   = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const MONTHS_NL  = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
const MONTHS_FULL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const DEFAULT_START = '2026-02-19';

let currentDay = 1;
let data = loadData();

// ─── LocalStorage helpers ────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem('waardevolle-tien-v2');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveData() {
  try { localStorage.setItem('waardevolle-tien-v2', JSON.stringify(data)); } catch {}
}

function loadStartDate() {
  return localStorage.getItem('waardevolle-tien-startdate') || DEFAULT_START;
}

function saveStartDate(val) {
  localStorage.setItem('waardevolle-tien-startdate', val);
}

// ─── Datum helpers ───────────────────────────────────────────
function getRamadanStart() {
  const [y, m, d] = loadStartDate().split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getLastTenStart() {
  // Dag 21 van Ramadan = eerste van de laatste 10 nachten
  const start = getRamadanStart();
  start.setDate(start.getDate() + 20);
  return start;
}

function getDayDate(dayIndex) {
  const d = new Date(getLastTenStart());
  d.setDate(d.getDate() + (dayIndex - 1));
  return d;
}

function formatDateNL(date) {
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Data helpers ────────────────────────────────────────────
function getDayData(day) {
  if (!data[day]) {
    data[day] = {
      prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      koran: 0,
      sadaqah: false,
      nacht: false,
      extra: { dzikr: false, dua: false, istighfar: false, tahajjud_extra: false }
    };
  }
  return data[day];
}

function calcProgress(dayObj) {
  let done = 0; // 5 gelijke vensters, elk 20%
  const p = dayObj.prayers;
  if (['fajr','dhuhr','asr','maghrib','isha'].every(k => p[k])) done++;
  if (dayObj.koran > 0) done++;
  if (dayObj.sadaqah) done++;
  if (dayObj.nacht) done++;
  if (Object.values(dayObj.extra).some(Boolean)) done++;
  return Math.round((done / 5) * 100);
}

// ─── Ramadan status ──────────────────────────────────────────
function updateRamadanStatus() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ramadanStart = getRamadanStart();
  ramadanStart.setHours(0, 0, 0, 0);

  const lastTenStart = getLastTenStart();
  lastTenStart.setHours(0, 0, 0, 0);

  const ramadanEnd = new Date(ramadanStart);
  ramadanEnd.setDate(ramadanEnd.getDate() + 29); // dag 30

  const badge = document.getElementById('ramadanDayBadge');
  const countdownText = document.getElementById('countdownText');
  const msPerDay = 86400000;
  const dayInRamadan = Math.floor((today - ramadanStart) / msPerDay) + 1;

  if (today < ramadanStart) {
    const daysUntil = Math.ceil((ramadanStart - today) / msPerDay);
    badge.textContent = '';
    countdownText.textContent = `Ramadan begint over ${daysUntil} dag${daysUntil !== 1 ? 'en' : ''}`;
    countdownText.className = 'countdown-text';
  } else if (today <= ramadanEnd) {
    badge.textContent = `Ramadan dag ${dayInRamadan} van 30`;
    const daysUntilLastTen = Math.ceil((lastTenStart - today) / msPerDay);

    if (today < lastTenStart) {
      countdownText.textContent = `Nog ${daysUntilLastTen} dag${daysUntilLastTen !== 1 ? 'en' : ''} tot de laatste 10!`;
      countdownText.className = 'countdown-text';
    } else {
      const nightInLastTen = Math.floor((today - lastTenStart) / msPerDay) + 1;
      countdownText.textContent = `We zijn in de laatste 10 nachten — nacht ${nightInLastTen}!`;
      countdownText.className = 'countdown-text active';
    }
  } else {
    badge.textContent = 'Ramadan 2026';
    countdownText.textContent = 'Moge Allah onze ʿibādah aanvaarden.';
    countdownText.className = 'countdown-text';
  }
}

// ─── Date setting ────────────────────────────────────────────
function initDateSetting() {
  const input    = document.getElementById('ramadanStartInput');
  const subtitle = document.getElementById('dateSettingSubtitle');
  const toggle   = document.getElementById('dateSettingToggle');
  const body     = document.getElementById('dateSettingBody');
  const chevron  = document.getElementById('dateSettingChevron');

  input.value = loadStartDate();
  subtitle.textContent = 'Ramadan start: ' + formatDateNL(getRamadanStart());

  function openPanel() {
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    toggle.setAttribute('aria-expanded', !isOpen);
  }

  toggle.addEventListener('click', openPanel);
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); }
  });

  document.getElementById('applyDateBtn').addEventListener('click', () => {
    const val = input.value;
    if (!val) return;
    saveStartDate(val);
    subtitle.textContent = 'Ramadan start: ' + formatDateNL(getRamadanStart());
    body.style.display = 'none';
    chevron.style.transform = '';
    toggle.setAttribute('aria-expanded', 'false');
    updateRamadanStatus();
    buildDayNav();
    showToast('✓ Startdatum opgeslagen');
  });

  input.addEventListener('focus', () => { input.style.borderColor = 'var(--gold)'; });
  input.addEventListener('blur',  () => { input.style.borderColor = 'var(--night-border)'; });
}

// ─── Day navigation ──────────────────────────────────────────
function buildDayNav() {
  const nav = document.getElementById('dayNav');
  nav.innerHTML = '';

  const days = [];
  for (let d = 1; d <= TOTAL_DAYS; d++) {
    days.push({ d, date: getDayDate(d) });
  }

  const months = [...new Set(days.map(x => x.date.getMonth()))];
  const multiMonth = months.length > 1;
  let lastMonth = -1;

  days.forEach(({ d, date }) => {
    const month = date.getMonth();

    if (multiMonth && month !== lastMonth) {
      const label = document.createElement('div');
      label.style.cssText = `
        grid-column: 1 / -1;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--text-subtle);
        padding: 4px 2px 0;
      `;
      label.textContent = MONTHS_NL[month] + ' ' + date.getFullYear();
      nav.appendChild(label);
      lastMonth = month;
    }

    const isOdd  = ODD_NIGHTS.includes(d);
    const pct    = calcProgress(getDayData(d));
    const dateNum = date.getDate();
    const weekday = WEEKDAYS[date.getDay()];

    const btn = document.createElement('button');
    btn.className = 'day-btn' +
      (d === currentDay ? ' active' : '') +
      (pct === 100 ? ' completed' : '');
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `${dateNum} ${MONTHS_NL[month]} — Nacht ${d}${isOdd ? ', mogelijke Laylatul Qadr nacht' : ''}${pct === 100 ? ' (voltooid)' : ''}`);
    btn.setAttribute('aria-pressed', d === currentDay ? 'true' : 'false');
    if (isOdd) btn.setAttribute('aria-haspopup', 'dialog');

    btn.innerHTML = `
      <span class="day-date">${dateNum}</span>
      <span class="day-weekday">${weekday}</span>
      ${isOdd
        ? `<span class="qadr-star" aria-hidden="true">✦</span>`
        : `<span style="height:12px;display:block"></span>`}
    `;

    btn.addEventListener('click', () => {
      selectDay(d);
      if (isOdd) openModal();
    });

    nav.appendChild(btn);
  });

  // Maandlabel als er maar één maand is
  const monthEl = document.getElementById('dayNavMonth');
  if (!multiMonth) {
    monthEl.textContent = MONTHS_FULL[getDayDate(1).getMonth()] + ' ' + getDayDate(1).getFullYear();
    monthEl.style.display = 'block';
  } else {
    monthEl.style.display = 'none';
  }
}

function selectDay(day) {
  currentDay = day;
  buildDayNav();
  renderDay();
}

// ─── Render current day ───────────────────────────────────────
function renderDay() {
  const d = getDayData(currentDay);
  const isOdd = ODD_NIGHTS.includes(currentDay);
  const currentDate = getDayDate(currentDay);

  document.getElementById('currentDayLabel').textContent =
    `Nacht ${currentDay} — ${currentDate.getDate()} ${MONTHS_FULL[currentDate.getMonth()]}`;

  const badge = document.getElementById('qadrBadge');
  badge.style.display = isOdd ? 'inline-flex' : 'none';

  document.querySelectorAll('[data-prayer]').forEach(cb => {
    cb.checked = d.prayers[cb.dataset.prayer] || false;
  });
  updatePrayerUI(d);

  document.getElementById('koranValue').textContent = d.koran;
  updateKoranUI(d);

  const sadaqahToggle = document.getElementById('sadaqahToggle');
  sadaqahToggle.checked = d.sadaqah;
  sadaqahToggle.setAttribute('aria-checked', d.sadaqah);
  updateSadaqahUI(d);

  const nachtToggle = document.getElementById('nachtToggle');
  nachtToggle.checked = d.nacht;
  nachtToggle.setAttribute('aria-checked', d.nacht);
  updateNachtUI(d);

  document.querySelectorAll('[data-extra]').forEach(cb => {
    cb.checked = d.extra[cb.dataset.extra] || false;
  });
  updateExtraUI(d);
  updateProgress(d);
}

// ─── UI update helpers ────────────────────────────────────────
function updatePrayerUI(d) {
  const count = Object.values(d.prayers).filter(Boolean).length;
  document.getElementById('prayerCount').textContent = `${count}/5`;
  document.getElementById('prayerSubtitle').textContent =
    count === 0 ? '0 van 5 verricht' :
    count === 5 ? 'Alle gebeden verricht ✓' : `${count} van 5 verricht`;
  document.getElementById('cardGebeden').classList.toggle('done', count === 5);
}

function updateKoranUI(d) {
  document.getElementById('koranSubtitle').textContent =
    d.koran === 0 ? 'Pagina\'s vandaag' :
    `${d.koran} pagina${d.koran !== 1 ? "'s" : ''} vandaag`;
  document.getElementById('cardKoran').classList.toggle('done', d.koran > 0);
}

function updateSadaqahUI(d) {
  document.getElementById('sadaqahSubtitle').textContent =
    d.sadaqah ? 'Gegeven — moge Allah het aanvaarden ✓' : 'Nog niet gegeven';
  document.getElementById('cardSadaqah').classList.toggle('done', d.sadaqah);
}

function updateNachtUI(d) {
  document.getElementById('nachtSubtitle').textContent =
    d.nacht ? 'Tarāwīḥ / Tahajjud verricht ✓' : 'Tarāwīḥ / Tahajjud — Nog niet verricht';
  document.getElementById('cardNacht').classList.toggle('done', d.nacht);
}

function updateExtraUI(d) {
  const count = Object.values(d.extra).filter(Boolean).length;
  document.getElementById('cardExtra').classList.toggle('done', count > 0);
}

function updateProgress(d) {
  const pct = calcProgress(d);
  const circumference = 2 * Math.PI * 51;
  document.getElementById('progressRing').style.strokeDashoffset = circumference - (pct / 100) * circumference;
  document.getElementById('progressRing').style.strokeDasharray = circumference;
  document.getElementById('progressPercent').textContent = `${pct}%`;
  document.getElementById('progressDescription').textContent =
    pct === 0   ? 'Begin vandaag — elke ʿibādah telt' :
    pct < 50    ? 'Goed bezig, ga door!' :
    pct < 100   ? 'Bijna voltooid, houd vol!' :
                  'Masha\'Allah — dag voltooid! 🤲';
}

// ─── Modal ────────────────────────────────────────────────────
const modal = document.getElementById('qadrModal');

function openModal() {
  modal.classList.add('open');
  document.getElementById('modalClose').focus();
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('open');
  document.getElementById('qadrBadge').focus();
  document.body.style.overflow = '';
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ─── Event listeners ─────────────────────────────────────────
document.querySelectorAll('[data-prayer]').forEach(cb => {
  cb.addEventListener('change', () => {
    const d = getDayData(currentDay);
    d.prayers[cb.dataset.prayer] = cb.checked;
    updatePrayerUI(d);
    updateProgress(d);
    buildDayNav();
  });
});

document.getElementById('koranMinus').addEventListener('click', () => {
  const d = getDayData(currentDay);
  if (d.koran > 0) {
    d.koran--;
    document.getElementById('koranValue').textContent = d.koran;
    updateKoranUI(d);
    updateProgress(d);
    buildDayNav();
  }
});

document.getElementById('koranPlus').addEventListener('click', () => {
  const d = getDayData(currentDay);
  d.koran++;
  document.getElementById('koranValue').textContent = d.koran;
  updateKoranUI(d);
  updateProgress(d);
  buildDayNav();
});

document.getElementById('sadaqahToggle').addEventListener('change', (e) => {
  const d = getDayData(currentDay);
  d.sadaqah = e.target.checked;
  e.target.setAttribute('aria-checked', d.sadaqah);
  updateSadaqahUI(d);
  updateProgress(d);
  buildDayNav();
});

document.getElementById('nachtToggle').addEventListener('change', (e) => {
  const d = getDayData(currentDay);
  d.nacht = e.target.checked;
  e.target.setAttribute('aria-checked', d.nacht);
  updateNachtUI(d);
  updateProgress(d);
  buildDayNav();
});

document.querySelectorAll('[data-extra]').forEach(cb => {
  cb.addEventListener('change', () => {
    const d = getDayData(currentDay);
    d.extra[cb.dataset.extra] = cb.checked;
    updateExtraUI(d);
  });
});

document.getElementById('saveBtn').addEventListener('click', () => {
  saveData();
  showToast('✓ Dag opgeslagen');
});

document.getElementById('qadrBadge').addEventListener('click', () => openModal());
document.getElementById('modalClose').addEventListener('click', () => closeModal());
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
});

// ─── Logo fallback ───────────────────────────────────────────
const logoImg = document.getElementById('hrpcLogo');
logoImg.addEventListener('error', () => {
  logoImg.classList.add('broken');
  const fallback = document.createElement('span');
  fallback.className = 'logo-fallback';
  fallback.textContent = 'Het Rechte Pad College';
  logoImg.parentNode.appendChild(fallback);
});

// ─── Init ────────────────────────────────────────────────────
initDateSetting();
updateRamadanStatus();
buildDayNav();
renderDay();
