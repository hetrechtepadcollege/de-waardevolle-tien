// ---- Constanten ----
const RAMADAN_START_DATE = "2026-02-19";
const LAST_TEN_START = 21;
const ODD_NIGHTS = new Set([21, 23, 25, 27, 29]);
const STORAGE_KEY = "de-waardevolle-tien-2026";

const PRAYERS = [
  { id: "fajr",    label: "Fajr",    icon: "🌅" },
  { id: "zuhr",   label: "Ẓuhr",   icon: "☀️" },
  { id: "asr",     label: "ʿAṣr",     icon: "🌤️" },
  { id: "maghrib", label: "Maghrib", icon: "🌇" },
  { id: "isha",    label: "ʿIshāʾ",    icon: "🌙" },
];

const EXTRA_ITEMS = [
  { id: "dua",    label: "Duāʾ",    icon: "🤲🏽" },
  { id: "dzikr",  label: "Dzikr",   icon: "📿" },
  { id: "itikaf", label: "Iʿtikāf", icon: "🕌" },
];

const NL_WEEKDAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

// ---- Datum-hulpfuncties ----
function parseLocalDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getCurrentRamadanDay() {
  const start = parseLocalDate(RAMADAN_START_DATE);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today - start) / 86400000) + 1;
  if (diff < 1) return 0;
  return Math.min(diff, 30);
}

function getRamadanDayDate(day) {
  const start = parseLocalDate(RAMADAN_START_DATE);
  const d = new Date(start);
  d.setDate(d.getDate() + day - 1);
  return d;
}

function daysUntilDay21() {
  const day21Date = getRamadanDayDate(LAST_TEN_START);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((day21Date - today) / 86400000));
}

// ---- DataBeheer ----
function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function emptyDayData() {
  return {
    prayers: { fajr: false, zuhr: false, asr: false, maghrib: false, isha: false },
    quranPages: 0,
    sadaqah: false,
    tahajjud: false,
    dua: false,
    dzikr: false,
    itikaf: false,
  };
}

function getDayData(allData, day) {
  const stored = allData[day];
  if (!stored) return emptyDayData();
  // Merge zodat nieuwe velden altijd aanwezig zijn
  return { ...emptyDayData(), ...stored, prayers: { ...emptyDayData().prayers, ...(stored.prayers || {}) } };
}

// ---- Score-berekening ----
function calculateScore(dayData) {
  let score = 0;

  // Gebeden: 10 pt elk (max 50)
  for (const v of Object.values(dayData.prayers)) {
    if (v) score += 10;
  }

  // Koranrecitatie: max 20 pt
  const pages = dayData.quranPages || 0;
  if (pages >= 20)      score += 20;
  else if (pages >= 10) score += 15;
  else if (pages >= 1)  score += 10;

  // Sadaqah: 10 pt
  if (dayData.sadaqah) score += 10;

  // Tahajjud: 5 pt
  if (dayData.tahajjud) score += 5;

  // Extra ibadah: 5 pt elk (max 15)
  if (dayData.dua)    score += 5;
  if (dayData.dzikr)  score += 5;
  if (dayData.itikaf) score += 5;

  return score; // max 100
}

function getLevel(score) {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

function getLevelLabel(score, level) {
  if (score === 0)     return "Begin vandaag";
  if (level === "high") return "Māshā Allāh — uitstekend bezig! 🌟";
  if (level === "mid")  return "Goed bezig, blijf doorgaan!";
  return "Elke stap telt — ga door!";
}

function getHint(score, level) {
  if (score === 0)      return "Begin klein — zelfs één gebed verandert de dag.";
  if (level === "high") return "SubhānAllāh, je doet het uitstekend vandaag!";
  if (level === "mid")  return "Goed bezig! Probeer nog wat extra dzikr of sadaqah.";
  return "Begin met de vijf dagelijkse gebeden — dat is de basis.";
}

// ---- App-toestand ----
let appData = loadData();
const currentDay = getCurrentRamadanDay();

function getState() {
  if (currentDay < LAST_TEN_START) return "waiting"; // voor dag 21
  if (currentDay <= 30)            return "active";   // in laatste 10 dagen
  return "ended";                                      // Ramadan voorbij
}

function getTodayDay() {
  if (getState() !== "active") return null;
  return currentDay;
}

// ---- DOM-referenties ----
const ramadanDayLabelEl   = document.getElementById("ramadan-day-label");
const countdownCard       = document.getElementById("countdown-card");
const countdownTextEl     = document.getElementById("countdown-text");
const progressCard        = document.getElementById("progress-card");
const progressHeartEl     = document.getElementById("progress-heart");
const progressScoreEl     = document.getElementById("progress-score");
const progressLabelEl     = document.getElementById("progress-label");
const progressBarEl       = document.getElementById("progress-bar");
const progressHintEl      = document.getElementById("progress-hint");
const prayersGridEl       = document.getElementById("prayers-grid");
const prayersDoneCountEl  = document.getElementById("prayers-done-count");
const quranPagesEl        = document.getElementById("quran-pages");
const quranMinusBtn       = document.getElementById("quran-minus");
const quranPlusBtn        = document.getElementById("quran-plus");
const sadaqahBtn          = document.getElementById("sadaqah-btn");
const sadaqahIcon         = document.getElementById("sadaqah-icon");
const sadaqahText         = document.getElementById("sadaqah-text");
const tahajjudBtn         = document.getElementById("tahajjud-btn");
const tahajjudIcon        = document.getElementById("tahajjud-icon");
const tahajjudText        = document.getElementById("tahajjud-text");
const extraGridEl         = document.getElementById("extra-grid");
const tenDaysGridEl       = document.getElementById("ten-days-grid");
const laylahDialog        = document.getElementById("laylah-dialog");
const laylahNightTitleEl  = document.getElementById("laylah-night-title");
const closeLaylahBtn      = document.getElementById("close-laylah");
const closeLaylahBottomBtn = document.getElementById("close-laylah-bottom");

// ---- Render-functies ----
function renderHeader() {
  const state = getState();
  if (currentDay === 0) {
    ramadanDayLabelEl.textContent = "Ramadan is nog niet begonnen";
  } else if (state === "waiting") {
    ramadanDayLabelEl.textContent = `Ramadan dag ${currentDay} van 30`;
  } else if (state === "active") {
    ramadanDayLabelEl.textContent = `Ramadan dag ${currentDay} van 30 · Laatste 10 dagen`;
  } else {
    ramadanDayLabelEl.textContent = "Ramadan 1447 — Alhamdulillah";
  }
}

function renderCountdownOrProgress() {
  const state = getState();

  if (state === "waiting") {
    const days = daysUntilDay21();
    countdownCard.hidden = false;
    progressCard.style.opacity = "0.5";
    if (days === 0) {
      countdownTextEl.textContent = "Morgen beginnen de laatste 10 dagen!";
    } else {
      countdownTextEl.textContent = `Nog ${days} ${days === 1 ? "dag" : "dagen"} tot de laatste 10!`;
    }
    return;
  }

  countdownCard.hidden = true;
  progressCard.style.opacity = "";

  const todayDay = getTodayDay();
  if (!todayDay) {
    progressScoreEl.textContent = "—";
    progressLabelEl.textContent = "Ramadan is afgelopen";
    progressBarEl.style.width = "0%";
    progressHintEl.textContent = "Moge Allah jullie ʿibādah accepteren. Amīn!";
    progressHeartEl.className = "heart-svg mid";
    return;
  }

  const dayData = getDayData(appData, todayDay);
  const score = calculateScore(dayData);
  const level = getLevel(score);

  progressScoreEl.textContent = `${score}%`;
  progressLabelEl.textContent = getLevelLabel(score, level);
  progressBarEl.style.width = `${score}%`;
  progressBarEl.className = `progress-bar ${level}`;
  progressHintEl.textContent = getHint(score, level);
  progressHeartEl.className = `heart-svg ${level}`;
}

function renderPrayers() {
  const todayDay = getTodayDay();
  const dayData = todayDay ? getDayData(appData, todayDay) : emptyDayData();
  const isActive = !!todayDay;

  prayersGridEl.innerHTML = "";
  let done = 0;

  for (const prayer of PRAYERS) {
    const isDone = dayData.prayers[prayer.id];
    if (isDone) done++;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `prayer-btn${isDone ? " done" : ""}`;
    btn.setAttribute("aria-pressed", String(isDone));
    btn.setAttribute("aria-label", `${prayer.label}${isDone ? " — gebeden" : ""}`);
    btn.innerHTML = `<span class="prayer-icon">${isDone ? "✅" : prayer.icon}</span>${prayer.label}`;
    btn.disabled = !isActive;

    btn.addEventListener("click", () => {
      const today = getTodayDay();
      if (!today) return;
      const data = getDayData(appData, today);
      data.prayers[prayer.id] = !data.prayers[prayer.id];
      appData[today] = data;
      saveData(appData);
      renderAll();
    });

    prayersGridEl.append(btn);
  }

  prayersDoneCountEl.textContent = done;
}

function renderQuran() {
  const todayDay = getTodayDay();
  const dayData = todayDay ? getDayData(appData, todayDay) : emptyDayData();
  const isActive = !!todayDay;

  quranPagesEl.textContent = dayData.quranPages;
  quranMinusBtn.disabled = !isActive || dayData.quranPages <= 0;
  quranPlusBtn.disabled = !isActive;
}

function renderSadaqah() {
  const todayDay = getTodayDay();
  const dayData = todayDay ? getDayData(appData, todayDay) : emptyDayData();
  const isDone = dayData.sadaqah;
  const isActive = !!todayDay;

  sadaqahBtn.setAttribute("aria-pressed", String(isDone));
  sadaqahIcon.textContent = isDone ? "✅" : "○";
  sadaqahText.textContent = isDone ? "Gegeven! Bārak Allāhu fīk - Moge Allah ﷻ je zegenen! " : "Nog niet gegeven";
  sadaqahBtn.disabled = !isActive;
}

function renderTahajjud() {
  const todayDay = getTodayDay();
  const dayData = todayDay ? getDayData(appData, todayDay) : emptyDayData();
  const isDone = dayData.tahajjud;
  const isActive = !!todayDay;

  tahajjudBtn.setAttribute("aria-pressed", String(isDone));
  tahajjudIcon.textContent = isDone ? "✅" : "○";
  tahajjudText.textContent = isDone ? "Verricht! Māshā Allāh!" : "Nog niet verricht";
  tahajjudBtn.disabled = !isActive;
}

function renderExtraIbadah() {
  const todayDay = getTodayDay();
  const dayData = todayDay ? getDayData(appData, todayDay) : emptyDayData();
  const isActive = !!todayDay;

  extraGridEl.innerHTML = "";

  for (const item of EXTRA_ITEMS) {
    const isDone = dayData[item.id];

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `extra-btn${isDone ? " done" : ""}`;
    btn.setAttribute("aria-pressed", String(isDone));
    btn.setAttribute("aria-label", `${item.label}${isDone ? " — gedaan" : ""}`);
    btn.innerHTML = `<span class="extra-icon">${isDone ? "✅" : item.icon}</span>${item.label}`;
    btn.disabled = !isActive;

    btn.addEventListener("click", () => {
      const today = getTodayDay();
      if (!today) return;
      const data = getDayData(appData, today);
      data[item.id] = !data[item.id];
      appData[today] = data;
      saveData(appData);
      renderAll();
    });

    extraGridEl.append(btn);
  }
}

function renderCalendar() {
  tenDaysGridEl.innerHTML = "";

  for (let day = LAST_TEN_START; day <= 30; day++) {
    const date = getRamadanDayDate(day);
    const weekday = NL_WEEKDAYS[date.getDay()];
    const isOdd = ODD_NIGHTS.has(day);
    const isToday = day === currentDay;
    const isPast = day < currentDay;
    const isFuture = day > currentDay;

    const dayData = getDayData(appData, day);
    const score = calculateScore(dayData);
    const level = getLevel(score);
    const hasDoneAnything = score > 0;

    const classes = ["day-cell"];
    if (isOdd)   classes.push("odd-night");
    if (isToday) classes.push("today");
    if (isPast)  classes.push("past");
    if (isFuture) classes.push("future");

    const cell = document.createElement("div");
    cell.className = classes.join(" ");
    cell.dataset.day = String(day);

    if (isOdd) {
      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute(
        "aria-label",
        `Dag ${day} van Ramadan — mogelijk Laylatul Qadr. Tik voor meer info.`
      );
    }

    const starHtml = isOdd ? `<span class="day-star" aria-hidden="true">✦</span>` : "";
    const dotHtml = (isPast || isToday)
      ? `<span class="day-dot ${hasDoneAnything ? level : ""}"></span>`
      : "";

    cell.innerHTML = `
      <span class="day-num">${day}</span>
      <span class="day-weekday">${weekday}</span>
      ${starHtml}
      ${dotHtml}
    `;

    if (isOdd) {
      cell.addEventListener("click", () => openLaylahDialog(day));
      cell.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLaylahDialog(day);
        }
      });
    }

    tenDaysGridEl.append(cell);
  }
}

function renderAll() {
  renderHeader();
  renderCountdownOrProgress();
  renderPrayers();
  renderQuran();
  renderSadaqah();
  renderTahajjud();
  renderExtraIbadah();
  renderCalendar();
}

// ---- Dialog ----
function openLaylahDialog(day) {
  const nightWord = day % 2 !== 0 ? "oneven" : "even";
  laylahNightTitleEl.textContent = `Nacht ${day} — Mogelijk Laylatul Qadr`;
  laylahDialog.showModal();
  trackEvent("de-waardevolle-tien/laylah-nacht-info", `Nacht ${day} info bekeken`);
}

closeLaylahBtn.addEventListener("click", () => laylahDialog.close());
closeLaylahBottomBtn.addEventListener("click", () => laylahDialog.close());

laylahDialog.addEventListener("click", (e) => {
  const rect = laylahDialog.getBoundingClientRect();
  const inside =
    rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX && e.clientX <= rect.left + rect.width;
  if (!inside) laylahDialog.close();
});

// ---- Event listeners: activiteiten ----
quranMinusBtn.addEventListener("click", () => {
  const today = getTodayDay();
  if (!today) return;
  const data = getDayData(appData, today);
  if (data.quranPages > 0) {
    data.quranPages--;
    appData[today] = data;
    saveData(appData);
    renderAll();
  }
});

quranPlusBtn.addEventListener("click", () => {
  const today = getTodayDay();
  if (!today) return;
  const data = getDayData(appData, today);
  data.quranPages++;
  appData[today] = data;
  saveData(appData);
  renderAll();
});

sadaqahBtn.addEventListener("click", () => {
  const today = getTodayDay();
  if (!today) return;
  const data = getDayData(appData, today);
  data.sadaqah = !data.sadaqah;
  appData[today] = data;
  saveData(appData);
  renderAll();
});

tahajjudBtn.addEventListener("click", () => {
  const today = getTodayDay();
  if (!today) return;
  const data = getDayData(appData, today);
  data.tahajjud = !data.tahajjud;
  appData[today] = data;
  saveData(appData);
  renderAll();
});

// ---- Analytics ----
function trackEvent(path, title) {
  if (window.goatcounter?.count) {
    window.goatcounter.count({ path, title, event: true });
  }
}

// ---- Init ----
function init() {
  trackEvent("de-waardevolle-tien/geopend", "De Waardevolle Tien geopend");
  renderAll();
}

init();
