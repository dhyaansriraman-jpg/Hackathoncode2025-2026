const STORAGE_KEY = "carbon_tracker_state_v1";
const DEFAULT_DAILY_GOAL = 12;

const factors = {
  driving: { unit: "miles", kg: 0.404, group: "driving", label: "Driving Counter" },
  motorcycle: { unit: "miles", kg: 0.2, group: "driving", label: "Motorcycle Ride" },
  rideshare: { unit: "miles", kg: 0.31, group: "driving", label: "Rideshare Trip" },
  bus: { unit: "miles", kg: 0.089, group: "bus", label: "Bus Ride" },
  train: { unit: "miles", kg: 0.14, group: "bus", label: "Train Ride" },
  subway: { unit: "miles", kg: 0.1, group: "bus", label: "Subway Ride" },
  flight: { unit: "miles", kg: 0.255, group: "driving", label: "Flight Counter" },
  shower: { unit: "minutes", kg: 0.04, group: "home", label: "Showering Counter" },
  dishwasher: { unit: "cycles", kg: 1.2, group: "home", label: "Dishwasher Counter" },
  washing: { unit: "cycles", kg: 0.6, group: "home", label: "Washing Machine Counter" },
  dryer: { unit: "cycles", kg: 2.5, group: "home", label: "Clothes Dryer Cycle" },
  ac: { unit: "hours", kg: 0.8, group: "home", label: "Air Conditioner Usage" },
  streaming: { unit: "hours", kg: 0.05, group: "home", label: "Streaming Video" },
  coffee: { unit: "cups", kg: 0.21, group: "meals", label: "Coffee Counter" },
  beef: { unit: "servings", kg: 6.0, group: "meals", label: "Beef Meal" },
  lamb: { unit: "servings", kg: 5.2, group: "meals", label: "Lamb Meal" },
  pork: { unit: "servings", kg: 2.8, group: "meals", label: "Pork Meal" },
  dairy: { unit: "servings", kg: 2.0, group: "meals", label: "Cheese/Dairy Serving" },
  chicken: { unit: "servings", kg: 1.8, group: "meals", label: "Chicken Meal" },
  fish: { unit: "servings", kg: 2.4, group: "meals", label: "Fish Meal" },
  cooking: { unit: "minutes", kg: 0.03, group: "home", label: "Cooking" },
  charging: { unit: "hours", kg: 0.06, group: "home", label: "Charging Computer" }
};

const countryModifiers = {
  us: { shower: 1.0, cooking: 1.0, charging: 1.0 },
  uk: { shower: 0.85, cooking: 0.9, charging: 0.75 },
  in: { shower: 0.65, cooking: 0.7, charging: 0.6 },
  de: { shower: 0.8, cooking: 0.85, charging: 0.7 }
};

const el = {
  modalWrap: document.getElementById("modalWrap"),
  newBtn: document.getElementById("newActivityBtn"),
  nextDayBtn: document.getElementById("nextDayBtn"),
  resetBtn: document.getElementById("resetBtn"),
  saveBtn: document.getElementById("saveBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  entryMode: document.getElementById("entryMode"),
  manualFields: document.getElementById("manualFields"),
  aiFields: document.getElementById("aiFields"),
  modalHint: document.getElementById("modalHint"),
  type: document.getElementById("activityType"),
  amount: document.getElementById("activityAmount"),
  tableBody: document.querySelector("#activityTable tbody"),
  undoBar: document.getElementById("undoBar"),
  undoText: document.getElementById("undoText"),
  undoBtn: document.getElementById("undoBtn"),
  totalKg: document.getElementById("totalKg"),
  goalKg: document.getElementById("goalKg"),
  activityCount: document.getElementById("activityCount"),
  goalPct: document.getElementById("goalPct"),
  speedStatus: document.getElementById("speedStatus"),
  speedNeedle: document.getElementById("speedNeedle"),
  speedometer: document.querySelector(".speedometer"),
  speedScale: document.getElementById("speedScale"),
  speedCurrent: document.getElementById("speedCurrent"),
  speedGoal: document.getElementById("speedGoal"),
  driveKg: document.getElementById("driveKg"),
  busKg: document.getElementById("busKg"),
  mealKg: document.getElementById("mealKg"),
  homeKg: document.getElementById("homeKg"),
  driveBar: document.getElementById("driveBar"),
  busBar: document.getElementById("busBar"),
  mealBar: document.getElementById("mealBar"),
  homeBar: document.getElementById("homeBar"),
  journeyText: document.getElementById("journeyText"),
  journeyBar: document.getElementById("journeyBar"),
  successDays: document.getElementById("successDays"),
  country: document.getElementById("countrySelect"),
  task: document.getElementById("taskSelect"),
  taskAmount: document.getElementById("taskAmount"),
  saveRoutineBtn: document.getElementById("saveRoutineBtn"),
  applyRoutineBtn: document.getElementById("applyRoutineBtn"),
  autoFillHistoryBtn: document.getElementById("autoFillHistoryBtn"),
  historyHint: document.getElementById("historyHint"),
  routineCount: document.getElementById("routineCount"),
  weeklyRange: document.getElementById("weeklyRange"),
  weeklyChart: document.getElementById("weeklyChart"),
  weeklyTotal: document.getElementById("weeklyTotal"),
  weeklyTopCategory: document.getElementById("weeklyTopCategory"),
  goalScreen: document.getElementById("goalScreen"),
  goalForm: document.getElementById("goalForm"),
  goalInput: document.getElementById("goalInput"),
  day30Screen: document.getElementById("day30Screen"),
  day30SummaryText: document.getElementById("day30SummaryText"),
  summaryTotalCo2: document.getElementById("summaryTotalCo2"),
  summaryGoalDistance: document.getElementById("summaryGoalDistance"),
  summaryGoalUsed: document.getElementById("summaryGoalUsed"),
  topActivitiesBars: document.getElementById("topActivitiesBars"),
  day30TableBody: document.querySelector("#day30Table tbody"),
  closeDay30Btn: document.getElementById("closeDay30Btn")
};

const state = loadState();
let undoState = null;
render();

function defaultState() {
  return {
    currentDay: 1,
    successDays: 0,
    dailyGoal: null,
    logs: [],
    routine: [],
    dayStats: [],
    day30ScreenOpen: false
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.logs)) {
      return defaultState();
    }
    const dayStats = Array.isArray(parsed.dayStats) ? parsed.dayStats.filter(isValidDayStat) : [];
    const routine = Array.isArray(parsed.routine) ? parsed.routine.filter(isValidRoutineItem) : [];
    const currentDay = clampDay(parsed.currentDay);
    const hasStarted = currentDay > 1 || parsed.logs.length > 0 || dayStats.length > 0;
    const dailyGoal = Number.isFinite(parsed.dailyGoal) && parsed.dailyGoal > 0
      ? parsed.dailyGoal
      : (hasStarted ? DEFAULT_DAILY_GOAL : null);
    const derivedSuccessDays = dayStats.filter((item) => item.total <= dailyGoalValue(dailyGoal)).length;

    return {
      currentDay,
      successDays: dayStats.length > 0
        ? derivedSuccessDays
        : (Number.isFinite(parsed.successDays) ? Math.max(0, Math.min(30, parsed.successDays)) : 0),
      dailyGoal,
      logs: parsed.logs.filter(isValidLog),
      routine,
      dayStats,
      day30ScreenOpen: Boolean(parsed.day30ScreenOpen)
    };
  } catch (_err) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clampDay(day) {
  const n = Number(day);
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(1, Math.min(30, Math.floor(n)));
}

function isValidLog(item) {
  return item && factors[item.type] && Number.isFinite(item.amount) && Number.isFinite(item.co2);
}

function isValidRoutineItem(item) {
  return (
    item &&
    factors[item.type] &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    (item.isAi === undefined || typeof item.isAi === "boolean") &&
    (item.country === undefined || typeof item.country === "string")
  );
}

function isValidDayStat(item) {
  return (
    item &&
    Number.isInteger(item.day) &&
    item.day >= 1 &&
    item.day <= 30 &&
    Number.isFinite(item.total) &&
    Number.isInteger(item.activities) &&
    item.activities >= 0 &&
    (item.typeTotals === undefined || isValidTypeTotals(item.typeTotals)) &&
    (item.entries === undefined || (Array.isArray(item.entries) && item.entries.every(isValidRoutineItem))) &&
    (item.weekday === undefined || (Number.isInteger(item.weekday) && item.weekday >= 0 && item.weekday <= 6)) &&
    (item.recordedAt === undefined || typeof item.recordedAt === "string")
  );
}

function isValidTypeTotals(typeTotals) {
  if (!typeTotals || typeof typeTotals !== "object") {
    return false;
  }
  return Object.entries(typeTotals).every(([type, amount]) => factors[type] && Number.isFinite(amount) && amount >= 0);
}

function dailyGoalValue(value = state.dailyGoal) {
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_GOAL;
}

function requiresGoalSelection() {
  return state.dailyGoal === null && state.currentDay === 1 && state.dayStats.length === 0;
}

function syncScreenLock() {
  const goalOpen = Boolean(el.goalScreen && el.goalScreen.classList.contains("open"));
  const day30Open = Boolean(el.day30Screen && el.day30Screen.classList.contains("open"));
  document.body.classList.toggle("screen-open", goalOpen || day30Open);
}

function cloneLogs(logs) {
  return logs.map((item) => ({ ...item }));
}

function setUndoState(message, previousLogs) {
  undoState = {
    message,
    logs: cloneLogs(previousLogs)
  };
  renderUndo();
}

function clearUndoState() {
  undoState = null;
  renderUndo();
}

function summarizeLogs(day, logs, includeHistoryMeta = false) {
  const total = logs.reduce((sum, item) => sum + item.co2, 0);
  const typeTotals = {};
  logs.forEach((item) => {
    if (!typeTotals[item.type]) {
      typeTotals[item.type] = 0;
    }
    typeTotals[item.type] += item.co2;
  });
  const summary = {
    day,
    total,
    activities: logs.length,
    typeTotals
  };
  if (includeHistoryMeta) {
    summary.entries = logs.map((item) => ({
      type: item.type,
      amount: Number(item.amount.toFixed(2)),
      isAi: Boolean(item.isAi),
      country: item.country || ""
    }));
    summary.weekday = new Date().getDay();
    summary.recordedAt = new Date().toISOString();
  }
  return summary;
}

function upsertDayStat(summary) {
  const existing = state.dayStats.findIndex((item) => item.day === summary.day);
  if (existing >= 0) {
    state.dayStats[existing] = summary;
  } else {
    state.dayStats.push(summary);
  }
  state.dayStats.sort((a, b) => a.day - b.day);
  state.successDays = state.dayStats.filter((item) => item.total <= dailyGoalValue()).length;
}

function openModal() {
  if (requiresGoalSelection()) {
    return;
  }
  el.modalWrap.style.display = "grid";
  el.modalWrap.setAttribute("aria-hidden", "false");
  updateModalMode();
}

function closeModal() {
  el.modalWrap.style.display = "none";
  el.modalWrap.setAttribute("aria-hidden", "true");
}

function updateModalMode() {
  if (!el.entryMode || !el.manualFields || !el.aiFields || !el.saveBtn) {
    if (el.amount) {
      el.amount.focus();
    }
    return;
  }
  const isAiMode = el.entryMode.value === "ai";
  el.manualFields.classList.toggle("is-hidden", isAiMode);
  el.aiFields.classList.toggle("is-hidden", !isAiMode);
  el.saveBtn.textContent = isAiMode ? "Save AI Estimate" : "Save Activity";
  if (el.modalHint) {
    el.modalHint.textContent = isAiMode
      ? "AI estimates use average country factors for showering, cooking, and charging."
      : "Examples: drove 3 miles, had 2 cups of coffee, showered 12 minutes.";
  }
  const inputToFocus = isAiMode ? el.taskAmount : el.amount;
  if (inputToFocus) {
    inputToFocus.focus();
    inputToFocus.select();
  }
}

function buildLogEntry(type, amount, isAi = false, country = "") {
  const meta = factors[type];
  if (!meta || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  let co2 = meta.kg * amount;
  let label = meta.label;
  let normalizedCountry = "";
  if (isAi) {
    normalizedCountry = countryModifiers[country] ? country : "us";
    const mod = (countryModifiers[normalizedCountry] && countryModifiers[normalizedCountry][type]) || 1;
    co2 = co2 * mod;
    label = `AI: ${meta.label} (${normalizedCountry.toUpperCase()})`;
  }

  return {
    type,
    amount,
    co2,
    group: meta.group,
    label,
    unit: meta.unit,
    isAi: Boolean(isAi),
    country: normalizedCountry
  };
}

function addEntries(entries) {
  let addedCount = 0;
  entries.forEach((entry) => {
    if (!entry) {
      return;
    }
    state.logs.push(entry);
    addedCount += 1;
  });
  if (addedCount > 0) {
    saveState();
    render();
  }
  return addedCount;
}

function addActivity(type, amount, isAi = false, country = "") {
  if (requiresGoalSelection()) {
    return;
  }
  const entry = buildLogEntry(type, amount, isAi, country);
  addEntries([entry]);
}

function collapseLogsToRoutine(logs) {
  const routineMap = new Map();
  logs.forEach((item) => {
    const isAi = Boolean(item.isAi);
    const country = isAi ? (typeof item.country === "string" && item.country ? item.country : "us") : "";
    const key = `${item.type}|${isAi ? 1 : 0}|${country}`;
    if (!routineMap.has(key)) {
      routineMap.set(key, { type: item.type, amount: 0, isAi, country });
    }
    const entry = routineMap.get(key);
    entry.amount += item.amount;
  });
  return Array.from(routineMap.values())
    .filter(isValidRoutineItem)
    .map((item) => ({ ...item, amount: Number(item.amount.toFixed(2)) }));
}

function saveRoutineFromToday() {
  if (requiresGoalSelection()) {
    return;
  }
  if (state.logs.length === 0) {
    window.alert("Log at least one activity before saving a routine.");
    return;
  }
  state.routine = collapseLogsToRoutine(state.logs);
  saveState();
  render();
  window.alert(`Saved ${state.routine.length} routine item(s).`);
}

function applySavedRoutine() {
  if (requiresGoalSelection()) {
    return;
  }
  if (!Array.isArray(state.routine) || state.routine.length === 0) {
    window.alert("No routine saved yet. Save today's activities first.");
    return;
  }
  if (state.logs.length > 0) {
    const ok = window.confirm("Add your saved routine on top of today's existing activities?");
    if (!ok) {
      return;
    }
  }
  const entries = state.routine.map((item) => buildLogEntry(item.type, item.amount, Boolean(item.isAi), item.country || "us"));
  const added = addEntries(entries);
  if (added === 0) {
    window.alert("Could not apply the saved routine. Please save it again.");
  }
}

function getHistoryCandidates() {
  return state.dayStats
    .filter((item) => Array.isArray(item.entries) && item.entries.length > 0)
    .sort((a, b) => b.day - a.day);
}

function getAutoFillSource() {
  const candidates = getHistoryCandidates();
  if (candidates.length === 0) {
    return null;
  }
  const todayWeekday = new Date().getDay();
  const sameWeekday = candidates.filter((item) => item.weekday === todayWeekday);
  const source = sameWeekday.length > 0 ? sameWeekday[0] : candidates[0];
  return {
    day: source.day,
    reason: sameWeekday.length > 0 ? "same weekday" : "most recent day",
    entries: source.entries
  };
}

function applyHistoryAutoFill() {
  if (requiresGoalSelection()) {
    return;
  }
  const source = getAutoFillSource();
  if (!source) {
    window.alert("No day history available yet. Finish at least one day first.");
    return;
  }

  const previousLogs = cloneLogs(state.logs);
  if (state.logs.length > 0) {
    const ok = window.confirm("Replace today's current activities with auto-fill from history?");
    if (!ok) {
      return;
    }
  }

  const rebuilt = source.entries
    .map((item) => buildLogEntry(item.type, item.amount, Boolean(item.isAi), item.country || ""))
    .filter(Boolean);

  if (rebuilt.length === 0) {
    window.alert("History data could not be applied. Try recording another day first.");
    return;
  }

  state.logs = rebuilt;
  saveState();
  render();
  setUndoState(`Auto-filled from Day ${source.day} (${source.reason}).`, previousLogs);
}

function getTotals() {
  const totals = { driving: 0, bus: 0, meals: 0, home: 0 };
  let total = 0;
  state.logs.forEach((item) => {
    total += item.co2;
    totals[item.group] += item.co2;
  });
  return { totals, total };
}

function render() {
  const goal = dailyGoalValue();
  const { totals, total } = getTotals();
  const pct = Math.min((total / goal) * 100, 100);

  el.goalKg.textContent = `${goal.toFixed(2)} kg`;
  el.totalKg.textContent = `${total.toFixed(2)} kg`;
  el.activityCount.textContent = String(state.logs.length);
  el.goalPct.textContent = `${pct.toFixed(0)}%`;
  renderSpeedometer(total, goal);

  el.driveKg.textContent = `${totals.driving.toFixed(2)} kg`;
  el.busKg.textContent = `${totals.bus.toFixed(2)} kg`;
  el.mealKg.textContent = `${totals.meals.toFixed(2)} kg`;
  el.homeKg.textContent = `${totals.home.toFixed(2)} kg`;

  el.driveBar.style.width = `${Math.min((totals.driving / goal) * 100, 100).toFixed(0)}%`;
  el.busBar.style.width = `${Math.min((totals.bus / goal) * 100, 100).toFixed(0)}%`;
  el.mealBar.style.width = `${Math.min((totals.meals / goal) * 100, 100).toFixed(0)}%`;
  el.homeBar.style.width = `${Math.min((totals.home / goal) * 100, 100).toFixed(0)}%`;

  renderTable();
  renderUndo();
  renderRoutine();
  renderWeeklyInsights();
  renderJourney(total, goal);
  renderDay30Screen(goal);
  renderGoalScreen();
  syncScreenLock();
}

function renderUndo() {
  if (!el.undoBar || !el.undoText) {
    return;
  }
  if (!undoState || !Array.isArray(undoState.logs)) {
    el.undoBar.classList.add("is-hidden");
    return;
  }
  el.undoBar.classList.remove("is-hidden");
  el.undoText.textContent = undoState.message || "Last change";
}

function renderRoutine() {
  if (!el.routineCount || !el.applyRoutineBtn || !el.saveRoutineBtn) {
    return;
  }
  const count = Array.isArray(state.routine) ? state.routine.length : 0;
  const mustPickGoal = requiresGoalSelection();
  const source = getAutoFillSource();
  el.routineCount.textContent = String(count);
  el.applyRoutineBtn.disabled = mustPickGoal || count === 0;
  el.saveRoutineBtn.disabled = mustPickGoal || state.logs.length === 0;
  if (el.autoFillHistoryBtn) {
    el.autoFillHistoryBtn.disabled = mustPickGoal || !source;
  }
  if (el.historyHint) {
    el.historyHint.textContent = source
      ? `Ready: auto-fill from Day ${source.day} (${source.reason}).`
      : "No day history yet. End at least one day to enable auto-fill.";
  }
}

function renderWeeklyInsights() {
  if (!el.weeklyChart || !el.weeklyRange || !el.weeklyTotal || !el.weeklyTopCategory) {
    return;
  }

  const statsByDay = new Map(state.dayStats.map((item) => [item.day, item]));
  statsByDay.set(state.currentDay, summarizeLogs(state.currentDay, state.logs));
  const endDay = state.currentDay;
  const startDay = Math.max(1, endDay - 6);
  const series = [];

  for (let day = startDay; day <= endDay; day += 1) {
    const stat = statsByDay.get(day);
    series.push({
      day,
      total: stat ? stat.total : 0,
      typeTotals: stat && stat.typeTotals ? stat.typeTotals : {}
    });
  }

  while (series.length < 7) {
    series.unshift({
      day: startDay - (7 - series.length),
      total: 0,
      typeTotals: {}
    });
  }

  const maxTotal = Math.max(...series.map((item) => item.total), 0);
  el.weeklyChart.innerHTML = "";
  series.forEach((item) => {
    const col = document.createElement("div");
    col.className = "weekly-bar-col";

    const bar = document.createElement("div");
    bar.className = "weekly-bar";

    const fill = document.createElement("div");
    fill.className = "weekly-bar-fill";
    fill.style.height = `${maxTotal > 0 ? (item.total / maxTotal) * 100 : 0}%`;

    const value = document.createElement("span");
    value.className = "weekly-day-value";
    value.textContent = `${item.total.toFixed(1)} kg`;

    const label = document.createElement("span");
    label.className = "weekly-day-label";
    label.textContent = item.day > 0 ? `D${item.day}` : "--";

    bar.appendChild(fill);
    col.appendChild(bar);
    col.appendChild(value);
    col.appendChild(label);
    el.weeklyChart.appendChild(col);
  });

  const typeTotals = {};
  series.forEach((item) => {
    Object.entries(item.typeTotals).forEach(([type, amount]) => {
      if (!typeTotals[type]) {
        typeTotals[type] = 0;
      }
      typeTotals[type] += amount;
    });
  });

  const top = Object.entries(typeTotals).sort((a, b) => b[1] - a[1])[0];
  const weeklyTotal = series.reduce((sum, item) => sum + item.total, 0);
  el.weeklyRange.textContent = `Days ${startDay}-${endDay}`;
  el.weeklyTotal.textContent = `${weeklyTotal.toFixed(2)} kg`;
  if (top) {
    const topLabel = factors[top[0]] && factors[top[0]].label ? factors[top[0]].label.replace(/ Counter$/, "") : top[0];
    el.weeklyTopCategory.textContent = `${topLabel} (${top[1].toFixed(2)} kg)`;
  } else {
    el.weeklyTopCategory.textContent = "--";
  }
}

function renderSpeedometer(total, goal) {
  if (!el.speedNeedle || !el.speedStatus || !el.speedCurrent || !el.speedGoal) {
    return;
  }

  const ratioRaw = goal > 0 ? total / goal : 0;
  const ratio = Math.max(0, Math.min(ratioRaw, 1));
  const angle = -90 + (ratio * 180);
  const hue = Math.round((1 - ratio) * 120);
  const color = `hsl(${hue} 70% 40%)`;

  el.speedNeedle.style.setProperty("--needle-angle", `${angle}deg`);
  el.speedNeedle.style.setProperty("--needle-color", color);
  el.speedStatus.style.color = color;

  if (ratioRaw < 0.6) {
    el.speedStatus.textContent = "Safe Zone";
  } else if (ratioRaw < 0.85) {
    el.speedStatus.textContent = "Getting Close";
  } else if (ratioRaw < 1) {
    el.speedStatus.textContent = "Near Limit";
  } else {
    el.speedStatus.textContent = "Over Limit";
  }

  renderSpeedScale(goal);
  el.speedCurrent.textContent = `${total.toFixed(2)} kg`;
  el.speedGoal.textContent = `${goal.toFixed(2)} kg`;
}

function renderSpeedScale(goal) {
  if (!el.speedScale) {
    return;
  }

  const frag = document.createDocumentFragment();
  const halfStepCount = Math.floor(goal * 2);
  const gaugeRadius = el.speedometer ? (el.speedometer.clientWidth / 2) : 180;
  const majorDistance = gaugeRadius + 20;
  const minorDistance = gaugeRadius + 12;

  for (let i = 0; i <= halfStepCount; i += 1) {
    const value = i / 2;
    const ratio = goal > 0 ? value / goal : 0;
    const angle = -90 + (ratio * 180);
    const mark = document.createElement("span");
    mark.className = "speed-mark";
    mark.style.setProperty("--mark-angle", `${angle}deg`);
    mark.style.setProperty("--mark-distance", `${i % 2 === 0 ? majorDistance : minorDistance}px`);
    mark.textContent = formatScaleMark(value);
    frag.appendChild(mark);
  }

  const exactMax = halfStepCount / 2;
  if (goal - exactMax > 0.001) {
    const ratio = 1;
    const angle = -90 + (ratio * 180);
    const maxMark = document.createElement("span");
    maxMark.className = "speed-mark";
    maxMark.style.setProperty("--mark-angle", `${angle}deg`);
    maxMark.style.setProperty("--mark-distance", `${majorDistance}px`);
    maxMark.textContent = formatScaleMark(goal);
    frag.appendChild(maxMark);
  }

  el.speedScale.innerHTML = "";
  el.speedScale.appendChild(frag);
}

function formatScaleMark(value) {
  const rounded = Math.round(value * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function renderTable() {
  el.tableBody.innerHTML = "";
  state.logs.slice().reverse().forEach((item, reversedIndex) => {
    const actualIndex = state.logs.length - 1 - reversedIndex;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${item.label}</td><td>${item.amount} ${item.unit}</td><td>${item.co2.toFixed(2)} kg</td>`;

    const actionsTd = document.createElement("td");
    const actionsWrap = document.createElement("div");
    actionsWrap.className = "row-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "secondary mini-btn";
    editBtn.textContent = "Edit";
    editBtn.setAttribute("data-action", "edit");
    editBtn.setAttribute("data-index", String(actualIndex));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "mini-btn delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("data-action", "delete");
    deleteBtn.setAttribute("data-index", String(actualIndex));

    actionsWrap.appendChild(editBtn);
    actionsWrap.appendChild(deleteBtn);
    actionsTd.appendChild(actionsWrap);
    tr.appendChild(actionsTd);
    el.tableBody.appendChild(tr);
  });
}

function editActivityAt(index) {
  const item = state.logs[index];
  if (!item) {
    return;
  }
  const nextAmountRaw = window.prompt(`Edit amount for "${item.label}"`, String(item.amount));
  if (nextAmountRaw === null) {
    return;
  }
  const nextAmount = parseFloat(nextAmountRaw);
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    window.alert("Please enter a valid amount above 0.");
    return;
  }
  const updated = buildLogEntry(item.type, nextAmount, Boolean(item.isAi), item.country || "");
  if (!updated) {
    window.alert("Could not update this activity.");
    return;
  }
  const previousLogs = cloneLogs(state.logs);
  state.logs[index] = updated;
  saveState();
  render();
  setUndoState(`Updated "${item.label}".`, previousLogs);
}

function deleteActivityAt(index) {
  const item = state.logs[index];
  if (!item) {
    return;
  }
  const previousLogs = cloneLogs(state.logs);
  state.logs.splice(index, 1);
  saveState();
  render();
  setUndoState(`Deleted "${item.label}".`, previousLogs);
}

function undoLastChange() {
  if (!undoState || !Array.isArray(undoState.logs)) {
    return;
  }
  state.logs = cloneLogs(undoState.logs);
  saveState();
  clearUndoState();
  render();
}

function renderJourney(totalToday, goal) {
  const journeyPct = Math.min((state.currentDay / 30) * 100, 100);
  const remaining = 30 - state.currentDay;
  const status = totalToday <= goal ? "on track" : "over goal";
  const mustPickGoal = requiresGoalSelection();
  el.journeyBar.style.width = `${journeyPct.toFixed(0)}%`;
  el.successDays.textContent = `${state.successDays} / 30`;
  el.journeyText.textContent = mustPickGoal
    ? "Set your daily goal to begin Day 1."
    : `Day ${state.currentDay} of 30. ${Math.max(remaining, 0)} day(s) left. Today is ${status}.`;
  el.nextDayBtn.disabled = mustPickGoal || (state.currentDay >= 30 && state.dayStats.some((item) => item.day === 30));
  el.nextDayBtn.textContent = state.currentDay === 30 ? "Finish Day 30" : "End Day";
}

function renderDay30Screen(goal) {
  if (!el.day30Screen || !el.day30TableBody || !el.day30SummaryText) {
    return;
  }

  const shouldShow = state.currentDay >= 30 && state.day30ScreenOpen;
  el.day30Screen.classList.toggle("open", shouldShow);
  if (!shouldShow) {
    return;
  }

  el.day30TableBody.innerHTML = "";

  const completedDay30 = state.dayStats.find((item) => item.day === 30);
  const liveDay30 = completedDay30 || summarizeLogs(30, state.logs);
  const statsByDay = new Map(state.dayStats.map((item) => [item.day, item]));
  statsByDay.set(30, liveDay30);
  const visibleStats = [];

  for (let day = 1; day <= 30; day += 1) {
    const stat = statsByDay.get(day);
    const tr = document.createElement("tr");
    if (!stat) {
      tr.innerHTML = `<td>Day ${day}</td><td>--</td><td>Pending</td><td>--</td>`;
    } else {
      const status = stat.total <= goal ? "Success" : "Over Goal";
      tr.innerHTML = `<td>Day ${day}</td><td>${stat.total.toFixed(2)} kg</td><td>${status}</td><td>${stat.activities}</td>`;
      visibleStats.push(stat);
    }
    el.day30TableBody.appendChild(tr);
  }

  renderDay30Summary(visibleStats, goal);

  const recordedDays = state.dayStats.length;
  const finished30 = state.dayStats.some((item) => item.day === 30);
  el.day30SummaryText.textContent = finished30
    ? `Challenge complete. You finished ${state.successDays} successful day(s) out of 30.`
    : `Day 30 reached. Recorded days: ${recordedDays} / 30. Finish day 30 when ready.`;
}

function renderDay30Summary(visibleStats, goal) {
  if (!el.summaryTotalCo2 || !el.summaryGoalDistance || !el.summaryGoalUsed || !el.topActivitiesBars) {
    return;
  }

  const totalCo2 = visibleStats.reduce((sum, item) => sum + item.total, 0);
  const challengeBudget = goal * 30;
  const budgetUsed = challengeBudget > 0 ? (totalCo2 / challengeBudget) * 100 : 0;
  const distance = challengeBudget - totalCo2;

  el.summaryTotalCo2.textContent = `${totalCo2.toFixed(2)} kg`;
  el.summaryGoalUsed.textContent = `${budgetUsed.toFixed(0)}%`;
  if (distance >= 0) {
    el.summaryGoalDistance.textContent = `${distance.toFixed(2)} kg under`;
  } else {
    el.summaryGoalDistance.textContent = `${Math.abs(distance).toFixed(2)} kg over`;
  }

  const typeTotals = {};
  visibleStats.forEach((day) => {
    if (!day.typeTotals) {
      return;
    }
    Object.entries(day.typeTotals).forEach(([type, amount]) => {
      if (!typeTotals[type]) {
        typeTotals[type] = 0;
      }
      typeTotals[type] += amount;
    });
  });

  const top = Object.entries(typeTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  el.topActivitiesBars.innerHTML = "";
  if (top.length === 0) {
    const empty = document.createElement("div");
    empty.className = "top-activity-empty";
    empty.textContent = "Top activity data will appear once daily activity breakdowns are recorded.";
    el.topActivitiesBars.appendChild(empty);
    return;
  }

  const maxValue = top[0][1];
  top.forEach(([type, total]) => {
    const row = document.createElement("div");
    row.className = "top-activity-row";

    const label = document.createElement("div");
    label.className = "top-activity-label";

    const name = document.createElement("span");
    const rawLabel = (factors[type] && factors[type].label) ? factors[type].label : type;
    name.textContent = rawLabel.replace(/ Counter$/, "");

    const value = document.createElement("strong");
    value.textContent = `${total.toFixed(2)} kg`;

    label.appendChild(name);
    label.appendChild(value);

    const track = document.createElement("div");
    track.className = "top-activity-track";
    const fill = document.createElement("div");
    fill.className = "top-activity-fill";
    fill.style.width = `${maxValue > 0 ? (total / maxValue) * 100 : 0}%`;

    track.appendChild(fill);
    row.appendChild(label);
    row.appendChild(track);
    el.topActivitiesBars.appendChild(row);
  });
}

function renderGoalScreen() {
  if (!el.goalScreen) {
    return;
  }
  const shouldShow = requiresGoalSelection();
  el.goalScreen.classList.toggle("open", shouldShow);
  if (shouldShow && el.goalInput && (!Number.isFinite(parseFloat(el.goalInput.value)) || parseFloat(el.goalInput.value) <= 0)) {
    el.goalInput.value = "8";
  }
}

function closeDay30Screen() {
  state.day30ScreenOpen = false;
  saveState();
  render();
}

function chooseDailyGoal(goalValue) {
  const goal = parseFloat(goalValue);
  if (!Number.isFinite(goal) || goal <= 0) {
    return;
  }
  state.dailyGoal = goal;
  saveState();
  render();
}

function submitGoalForm(e) {
  e.preventDefault();
  if (!el.goalInput) {
    return;
  }
  const goal = parseFloat(el.goalInput.value);
  if (!Number.isFinite(goal) || goal <= 0) {
    el.goalInput.setCustomValidity("Please enter a goal above 0.");
    el.goalInput.reportValidity();
    return;
  }
  el.goalInput.setCustomValidity("");
  chooseDailyGoal(goal);
}

function endDay() {
  if (requiresGoalSelection()) {
    return;
  }
  const summary = summarizeLogs(state.currentDay, state.logs, true);
  upsertDayStat(summary);

  if (state.currentDay < 30) {
    state.currentDay += 1;
    state.logs = [];
  }
  if (state.currentDay === 30) {
    state.day30ScreenOpen = true;
  }
  saveState();
  clearUndoState();
  render();
}

function resetData() {
  const ok = window.confirm("Reset all tracked data for this browser?");
  if (!ok) {
    return;
  }
  const fresh = defaultState();
  state.currentDay = fresh.currentDay;
  state.successDays = fresh.successDays;
  state.dailyGoal = fresh.dailyGoal;
  state.logs = fresh.logs;
  state.routine = fresh.routine;
  state.dayStats = fresh.dayStats;
  state.day30ScreenOpen = fresh.day30ScreenOpen;
  saveState();
  clearUndoState();
  render();
}

el.newBtn.addEventListener("click", openModal);

el.cancelBtn.addEventListener("click", closeModal);
el.modalWrap.addEventListener("click", (e) => {
  if (e.target === el.modalWrap) {
    closeModal();
  }
});

el.saveBtn.addEventListener("click", () => {
  const isAiMode = el.entryMode && el.entryMode.value === "ai";
  if (isAiMode) {
    const task = el.task.value;
    const country = el.country.value;
    const amount = parseFloat(el.taskAmount.value);
    addActivity(task, amount, true, country);
  } else {
    const type = el.type.value;
    const amount = parseFloat(el.amount.value);
    addActivity(type, amount);
  }
  closeModal();
});

if (el.entryMode) {
  el.entryMode.addEventListener("change", updateModalMode);
}

if (el.tableBody) {
  el.tableBody.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const actionBtn = target.closest("button[data-action]");
    if (!actionBtn) {
      return;
    }
    const index = parseInt(actionBtn.getAttribute("data-index"), 10);
    if (!Number.isInteger(index)) {
      return;
    }
    const action = actionBtn.getAttribute("data-action");
    if (action === "edit") {
      editActivityAt(index);
    } else if (action === "delete") {
      deleteActivityAt(index);
    }
  });
}

if (el.saveRoutineBtn) {
  el.saveRoutineBtn.addEventListener("click", saveRoutineFromToday);
}
if (el.applyRoutineBtn) {
  el.applyRoutineBtn.addEventListener("click", applySavedRoutine);
}
if (el.autoFillHistoryBtn) {
  el.autoFillHistoryBtn.addEventListener("click", applyHistoryAutoFill);
}
if (el.undoBtn) {
  el.undoBtn.addEventListener("click", undoLastChange);
}

el.nextDayBtn.addEventListener("click", endDay);
el.resetBtn.addEventListener("click", resetData);
if (el.goalForm) {
  el.goalForm.addEventListener("submit", submitGoalForm);
}
if (el.closeDay30Btn) {
  el.closeDay30Btn.addEventListener("click", closeDay30Screen);
}
if (el.day30Screen) {
  el.day30Screen.addEventListener("click", (e) => {
    if (e.target === el.day30Screen) {
      closeDay30Screen();
    }
  });
}

window.addEventListener("resize", () => {
  renderSpeedScale(dailyGoalValue());
});
