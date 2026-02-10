const DB_NAME = "workout-tracker";
const DB_VERSION = 1;
const EXPORT_VERSION = 1;
const EXPORT_APP_ID = "workout-tracker";

const state = {
  exercises: [],
  selectedExerciseId: null,
  selectedDate: toDateKey(new Date()),
  calendarDate: startOfMonth(new Date()),
  range: "daily",
  entriesMap: new Map(),
};

const elements = {
  addExerciseForm: document.getElementById("addExerciseForm"),
  exerciseList: document.getElementById("exerciseList"),
  focusName: document.getElementById("focusName"),
  focusMeta: document.getElementById("focusMeta"),
  selectedDateLabel: document.getElementById("selectedDateLabel"),
  countValue: document.getElementById("countValue"),
  countInput: document.getElementById("countInput"),
  applyCount: document.getElementById("applyCount"),
  goalStatus: document.getElementById("goalStatus"),
  todayBtn: document.getElementById("todayBtn"),
  setGoalBtn: document.getElementById("setGoalBtn"),
  calendarTitle: document.getElementById("calendarTitle"),
  calendarGrid: document.getElementById("calendarGrid"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  rangeButtons: document.getElementById("rangeButtons"),
  trendChart: document.getElementById("trendChart"),
  chartNote: document.getElementById("chartNote"),
  installBtn: document.getElementById("installBtn"),
  focusCard: document.getElementById("focusCard"),
  editToggle: document.getElementById("editToggle"),
  deleteBtn: document.getElementById("deleteBtn"),
  editPanel: document.getElementById("editPanel"),
  editName: document.getElementById("editName"),
  editGoal: document.getElementById("editGoal"),
  saveEdit: document.getElementById("saveEdit"),
  cancelEdit: document.getElementById("cancelEdit"),
  rankingList: document.getElementById("rankingList"),
  pageTrack: document.getElementById("pageTrack"),
  pagerButtons: Array.from(document.querySelectorAll(".pager-btn")),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importFile: document.getElementById("importFile"),
  dataNote: document.getElementById("dataNote"),
};

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("exercises")) {
        const store = db.createObjectStore("exercises", { keyPath: "id", autoIncrement: true });
        store.createIndex("name", "name", { unique: false });
      }
      if (!db.objectStoreNames.contains("entries")) {
        const store = db.createObjectStore("entries", { keyPath: ["exerciseId", "date"] });
        store.createIndex("exerciseId", "exerciseId", { unique: false });
        store.createIndex("date", "date", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function withStore(name, mode, callback) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const store = tx.objectStore(name);
    const request = callback(store, tx);
    let result;
    if (request && typeof request === "object" && "onsuccess" in request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error);
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllExercises() {
  return withStore("exercises", "readonly", (store) => store.getAll());
}

async function addExercise(name, goal) {
  return withStore("exercises", "readwrite", (store) => store.add({ name, goal }));
}

async function updateExercise(exercise) {
  return withStore("exercises", "readwrite", (store) => store.put(exercise));
}

async function deleteEntriesForExercise(exerciseId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readwrite");
    const store = tx.objectStore("entries");
    const index = store.index("exerciseId");
    const range = IDBKeyRange.only(exerciseId);
    index.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteExercise(exerciseId) {
  await deleteEntriesForExercise(exerciseId);
  await withStore("exercises", "readwrite", (store) => store.delete(exerciseId));
}

async function getEntriesForExercise(exerciseId) {
  return withStore("entries", "readonly", (store) => store.index("exerciseId").getAll(exerciseId));
}

async function getAllEntries() {
  return withStore("entries", "readonly", (store) => store.getAll());
}

async function setEntry(exerciseId, date, count) {
  return withStore("entries", "readwrite", (store) => {
    if (count <= 0) {
      return store.delete([exerciseId, date]);
    }
    return store.put({ exerciseId, date, count });
  });
}

async function replaceDatabaseData(exercises, entries) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["exercises", "entries"], "readwrite");
    const exercisesStore = tx.objectStore("exercises");
    const entriesStore = tx.objectStore("entries");
    exercisesStore.clear();
    entriesStore.clear();
    exercises.forEach((exercise) => exercisesStore.put(exercise));
    entries.forEach((entry) => entriesStore.put(entry));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function buildExportFilename(extension) {
  const stamp = toDateKey(new Date()).replace(/-/g, "");
  return `workout-data-${stamp}.${extension}`;
}

function setDataNote(message, tone = "muted") {
  if (!elements.dataNote) return;
  elements.dataNote.textContent = message;
  elements.dataNote.classList.remove("success", "error");
  elements.dataNote.classList.toggle("muted", tone === "muted");
  if (tone === "success") {
    elements.dataNote.classList.add("success");
  }
  if (tone === "error") {
    elements.dataNote.classList.add("error");
  }
}

function updateDataNoteDefaults() {
  if (!elements.dataNote) return;
  const supportsGzip = "CompressionStream" in window;
  elements.dataNote.textContent = supportsGzip
    ? "압축 JSON(gzip) 저장 · 가져오면 기존 데이터는 교체됩니다."
    : "JSON 저장 · 가져오면 기존 데이터는 교체됩니다.";
}

async function buildExportPayload() {
  const exercises = await getAllExercises();
  const entries = await getAllEntries();
  return {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    exercises,
    entries,
  };
}

async function createExportBlob(text) {
  if ("CompressionStream" in window) {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return {
      blob: new Blob([buffer], { type: "application/gzip" }),
      extension: "json.gz",
      compressed: true,
    };
  }
  return {
    blob: new Blob([text], { type: "application/json" }),
    extension: "json",
    compressed: false,
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}

async function readImportFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (isGzip) {
    if (!("DecompressionStream" in window)) {
      throw new Error("gzip 해제를 지원하지 않는 브라우저입니다.");
    }
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  }
  return new TextDecoder().decode(buffer);
}

function normalizeImportPayload(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("파일 형식이 올바르지 않습니다.");
  }
  if (raw.app && raw.app !== EXPORT_APP_ID) {
    throw new Error("다른 앱에서 내보낸 파일입니다.");
  }

  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];
  const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];

  const exercises = [];
  const exerciseIds = new Set();

  rawExercises.forEach((item) => {
    if (!item) return;
    const id = Number(item.id);
    const name = String(item.name || "").trim();
    const goal = Number(item.goal);
    if (!Number.isFinite(id) || !name || !Number.isFinite(goal)) return;
    if (exerciseIds.has(id)) return;
    exercises.push({ id, name, goal });
    exerciseIds.add(id);
  });

  const entries = [];
  rawEntries.forEach((item) => {
    if (!item) return;
    const exerciseId = Number(item.exerciseId);
    const date = String(item.date || "");
    const count = Number(item.count);
    if (!Number.isFinite(exerciseId) || !exerciseIds.has(exerciseId)) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (!Number.isFinite(count) || count <= 0) return;
    entries.push({ exerciseId, date, count });
  });

  return { exercises, entries };
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatKoreanDate(key) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return formatter.format(fromDateKey(key));
}

function formatMonthTitle(date) {
  const formatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" });
  return formatter.format(date);
}

function isFutureDate(key) {
  const todayKey = toDateKey(new Date());
  return key > todayKey;
}

function isPastOrToday(key) {
  const todayKey = toDateKey(new Date());
  return key <= todayKey;
}

function setFocusEnabled(enabled) {
  elements.focusCard.classList.toggle("disabled", !enabled);
  elements.focusCard.querySelectorAll("button, input").forEach((el) => {
    el.disabled = !enabled;
  });
}

function closeEditPanel() {
  elements.editPanel.classList.add("hidden");
  if (elements.editToggle) {
    elements.editToggle.textContent = "수정";
  }
}

function openEditPanel() {
  elements.editPanel.classList.remove("hidden");
  if (elements.editToggle) {
    elements.editToggle.textContent = "닫기";
  }
  elements.editName.focus();
}

function syncEditFields() {
  const exercise = getSelectedExercise();
  if (!exercise) return;
  elements.editName.value = exercise.name;
  elements.editGoal.value = exercise.goal;
}

function getSelectedExercise() {
  return state.exercises.find((exercise) => exercise.id === state.selectedExerciseId) || null;
}

function getCountForDate(dateKey) {
  return state.entriesMap.get(dateKey) || 0;
}

function updateSelectedDateLabel() {
  elements.selectedDateLabel.textContent = formatKoreanDate(state.selectedDate);
}

function updateGoalStatus() {
  const exercise = getSelectedExercise();
  const statusEl = elements.goalStatus;
  statusEl.className = "status";

  if (!exercise) {
    statusEl.textContent = "운동 선택";
    return;
  }

  if (isFutureDate(state.selectedDate)) {
    statusEl.textContent = "미래 날짜";
    return;
  }

  const count = getCountForDate(state.selectedDate);
  const goal = Number(exercise.goal) || 0;
  if (goal <= 0) {
    statusEl.textContent = "목표 설정";
    return;
  }

  if (count >= goal) {
    statusEl.classList.add("goal");
    statusEl.textContent = `달성 · ${count}/${goal}회`;
  } else {
    statusEl.classList.add("miss");
    statusEl.textContent = `남음 ${goal - count}회 · ${count}/${goal}회`;
  }
}

function updateFocusCard() {
  const exercise = getSelectedExercise();
  if (!exercise) {
    elements.focusName.textContent = "운동 선택";
    elements.focusMeta.textContent = "추가 후 선택";
    elements.countValue.textContent = "0";
    elements.countInput.value = "";
    elements.editName.value = "";
    elements.editGoal.value = "";
    closeEditPanel();
    setFocusEnabled(false);
    updateSelectedDateLabel();
    updateGoalStatus();
    return;
  }

  setFocusEnabled(true);
  elements.focusName.textContent = exercise.name;
  elements.focusMeta.textContent = `목표 ${exercise.goal}회`;
  const count = getCountForDate(state.selectedDate);
  elements.countValue.textContent = String(count);
  elements.countInput.value = count;
  updateSelectedDateLabel();
  updateGoalStatus();
}

function updateExerciseList() {
  const list = elements.exerciseList;
  list.innerHTML = "";

  if (state.exercises.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "운동 없음";
    list.appendChild(empty);
    return;
  }

  state.exercises.forEach((exercise) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "exercise-item" + (exercise.id === state.selectedExerciseId ? " active" : "");

    const meta = document.createElement("div");
    meta.className = "exercise-meta";
    const name = document.createElement("strong");
    name.textContent = exercise.name;
    const sub = document.createElement("small");
    sub.textContent = `목표 ${exercise.goal}회`;
    meta.append(name, sub);

    const badge = document.createElement("span");
    badge.className = "exercise-badge";
    if (exercise.id === state.selectedExerciseId) {
      const todayValue = getCountForDate(toDateKey(new Date()));
      badge.textContent = todayValue > 0 ? `${todayValue}회` : "";
    } else {
      badge.textContent = "";
    }
    item.append(meta, badge);

    item.addEventListener("click", () => selectExercise(exercise.id));
    list.appendChild(item);
  });
}

async function selectExercise(id) {
  state.selectedExerciseId = id;
  state.entriesMap = new Map();
  closeEditPanel();

  if (id != null) {
    const entries = await getEntriesForExercise(id);
    entries.forEach((entry) => state.entriesMap.set(entry.date, entry.count));
  }

  updateExerciseList();
  updateFocusCard();
  syncEditFields();
  renderCalendar();
  renderChart();
}

async function refreshExercises() {
  const exercises = await getAllExercises();
  state.exercises = exercises.sort((a, b) => a.id - b.id);
  if (state.exercises.length === 0) {
    state.selectedExerciseId = null;
    state.entriesMap = new Map();
  }
  if (!state.selectedExerciseId && state.exercises.length > 0) {
    await selectExercise(state.exercises[0].id);
  } else {
    updateExerciseList();
    updateFocusCard();
    renderCalendar();
    renderChart();
  }
  await renderRanking();
}

async function applyCountChange(newCount) {
  const exercise = getSelectedExercise();
  if (!exercise) return;
  const safeCount = Math.max(0, Number(newCount) || 0);
  await setEntry(exercise.id, state.selectedDate, safeCount);
  if (safeCount <= 0) {
    state.entriesMap.delete(state.selectedDate);
  } else {
    state.entriesMap.set(state.selectedDate, safeCount);
  }
  updateFocusCard();
  updateExerciseList();
  renderCalendar();
  renderChart();
  await renderRanking();
}

function bindEvents() {
  elements.addExerciseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(elements.addExerciseForm);
    const name = String(formData.get("name") || "").trim();
    const goal = Number(formData.get("goal"));
    if (!name || !goal) return;
    await addExercise(name, goal);
    elements.addExerciseForm.reset();
    await refreshExercises();
  });

  elements.focusCard.querySelectorAll("button[data-delta]").forEach((button) => {
    button.addEventListener("click", () => {
      const delta = Number(button.dataset.delta || 0);
      const count = getCountForDate(state.selectedDate);
      applyCountChange(count + delta);
    });
  });

  elements.focusCard.querySelectorAll("button[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const add = Number(button.dataset.add || 0);
      const count = getCountForDate(state.selectedDate);
      applyCountChange(count + add);
    });
  });

  elements.applyCount.addEventListener("click", () => {
    applyCountChange(elements.countInput.value);
  });

  elements.countInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyCountChange(elements.countInput.value);
    }
  });

  elements.todayBtn.addEventListener("click", () => {
    state.selectedDate = toDateKey(new Date());
    state.calendarDate = startOfMonth(new Date());
    updateFocusCard();
    renderCalendar();
    renderChart();
  });

  elements.setGoalBtn.addEventListener("click", () => {
    const exercise = getSelectedExercise();
    if (!exercise) return;
    applyCountChange(exercise.goal);
  });

  elements.prevMonth.addEventListener("click", () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
    renderCalendar();
    renderChart();
  });

  elements.nextMonth.addEventListener("click", () => {
    state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
    renderCalendar();
    renderChart();
  });

  elements.rangeButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-range]");
    if (!button) return;
    state.range = button.dataset.range;
    elements.rangeButtons.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });
    renderChart();
  });

  if (elements.editToggle) {
    elements.editToggle.addEventListener("click", () => {
      const exercise = getSelectedExercise();
      if (!exercise) return;
      const isHidden = elements.editPanel.classList.contains("hidden");
      if (isHidden) {
        syncEditFields();
        openEditPanel();
      } else {
        closeEditPanel();
      }
    });
  }

  elements.cancelEdit.addEventListener("click", () => {
    closeEditPanel();
  });

  elements.saveEdit.addEventListener("click", async () => {
    const exercise = getSelectedExercise();
    if (!exercise) return;
    const name = String(elements.editName.value || "").trim();
    const goal = Number(elements.editGoal.value);
    if (!name || goal <= 0) {
      window.alert("이름/목표 확인");
      return;
    }
    await updateExercise({ ...exercise, name, goal });
    closeEditPanel();
    await refreshExercises();
  });

  elements.deleteBtn.addEventListener("click", async () => {
    const exercise = getSelectedExercise();
    if (!exercise) return;
    const confirmed = window.confirm(`'${exercise.name}' 삭제할까요?`);
    if (!confirmed) return;
    await deleteExercise(exercise.id);
    state.selectedExerciseId = null;
    closeEditPanel();
    await refreshExercises();
  });

  if (elements.exportBtn) {
    elements.exportBtn.addEventListener("click", async () => {
      setDataNote("내보내는 중...");
      try {
        const payload = await buildExportPayload();
        const json = JSON.stringify(payload);
        const { blob, extension, compressed } = await createExportBlob(json);
        downloadBlob(blob, buildExportFilename(extension));
        setDataNote(compressed ? "내보내기 완료 · gzip" : "내보내기 완료 · JSON", "success");
      } catch (error) {
        console.error(error);
        setDataNote("내보내기 실패", "error");
      }
    });
  }

  if (elements.importBtn && elements.importFile) {
    elements.importBtn.addEventListener("click", () => {
      elements.importFile.click();
    });

    elements.importFile.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const confirmed = window.confirm("가져오면 현재 데이터는 교체됩니다. 계속할까요?");
      if (!confirmed) {
        event.target.value = "";
        return;
      }
      setDataNote("가져오는 중...");
      try {
        const text = await readImportFile(file);
        const raw = JSON.parse(text);
        const { exercises, entries } = normalizeImportPayload(raw);
        await replaceDatabaseData(exercises, entries);
        state.selectedExerciseId = null;
        state.entriesMap = new Map();
        await refreshExercises();
        setDataNote("가져오기 완료", "success");
      } catch (error) {
        console.error(error);
        setDataNote("가져오기 실패", "error");
        window.alert(error?.message || "가져오기 실패");
      } finally {
        event.target.value = "";
      }
    });
  }
}

function renderCalendar() {
  elements.calendarTitle.textContent = formatMonthTitle(state.calendarDate);
  const grid = elements.calendarGrid;
  grid.innerHTML = "";

  const exercise = getSelectedExercise();
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < startWeekday; i += 1) {
    const empty = document.createElement("div");
    empty.className = "calendar-day muted";
    empty.textContent = "";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(new Date(year, month, day));
    const count = getCountForDate(dateKey);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    if (dateKey === state.selectedDate) button.classList.add("selected");

    if (exercise && isPastOrToday(dateKey)) {
      const goal = Number(exercise.goal) || 0;
      if (goal > 0) {
        if (count >= goal) {
          button.classList.add("goal");
        } else {
          button.classList.add("miss");
        }
      }
    }

    const countLabel = isFutureDate(dateKey) ? "" : String(count);
    button.innerHTML = `<span>${day}</span><small>${countLabel}</small>`;
    button.addEventListener("click", () => {
      state.selectedDate = dateKey;
      updateFocusCard();
      renderCalendar();
    });

    grid.appendChild(button);
  }
}

function getRangeData() {
  const exercise = getSelectedExercise();
  if (!exercise) {
    return { labels: [], values: [], caption: "운동 선택" };
  }

  const values = [];
  const labels = [];
  const entries = Array.from(state.entriesMap.entries());

  if (state.range === "daily") {
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = toDateKey(new Date(year, month, day));
      values.push(getCountForDate(dateKey));
      labels.push(String(day));
    }
    return {
      labels,
      values,
      caption: `${formatMonthTitle(state.calendarDate)} · 일`,
    };
  }

  if (state.range === "monthly") {
    const year = state.calendarDate.getFullYear();
    const monthlyTotals = Array.from({ length: 12 }, () => 0);
    entries.forEach(([dateKey, count]) => {
      const [entryYear, entryMonth] = dateKey.split("-").map(Number);
      if (entryYear === year) {
        monthlyTotals[entryMonth - 1] += count;
      }
    });
    for (let month = 1; month <= 12; month += 1) {
      labels.push(`${month}월`);
      values.push(monthlyTotals[month - 1]);
    }
    return {
      labels,
      values,
      caption: `${year} · 월`,
    };
  }

  const years = entries
    .map(([dateKey]) => Number(dateKey.split("-")[0]))
    .filter(Boolean);
  const currentYear = new Date().getFullYear();
  years.push(currentYear);
  const uniqueYears = Array.from(new Set(years)).sort((a, b) => a - b);
  const recentYears = uniqueYears.slice(-6);
  recentYears.forEach((year) => {
    let total = 0;
    entries.forEach(([dateKey, count]) => {
      const entryYear = Number(dateKey.split("-")[0]);
      if (entryYear === year) total += count;
    });
    labels.push(String(year));
    values.push(total);
  });

  return {
    labels,
    values,
    caption: `${recentYears[0]}–${recentYears[recentYears.length - 1]} · 연`,
  };
}

function drawChart(labels, values, goalValue = 0) {
  const canvas = elements.trendChart;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, rect.width, rect.height);

  if (values.length === 0) {
    ctx.fillStyle = "rgba(18, 18, 18, 0.5)";
    ctx.font = "14px \"IBM Plex Sans KR\", sans-serif";
    ctx.fillText("운동 선택", 16, 32);
    return;
  }

  const padding = 28;
  const width = rect.width - padding * 2;
  const height = rect.height - padding * 2;
  const maxValue = Math.max(...values, goalValue || 0, 1);

  ctx.strokeStyle = "rgba(18, 18, 18, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = padding + (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + width, y);
    ctx.stroke();
  }

  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = padding + stepX * index;
    const y = padding + height - (value / maxValue) * height;
    return { x, y, value };
  });

  const gradient = ctx.createLinearGradient(0, padding, 0, padding + height);
  gradient.addColorStop(0, "rgba(42, 111, 219, 0.35)");
  gradient.addColorStop(1, "rgba(42, 111, 219, 0)");

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#2a6fdb";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.lineTo(padding + width, padding + height);
  ctx.lineTo(padding, padding + height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  if (goalValue > 0) {
    const goalY = padding + height - (goalValue / maxValue) * height;
    ctx.save();
    ctx.strokeStyle = "rgba(45, 139, 87, 0.85)";
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, goalY);
    ctx.lineTo(padding + width, goalY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(45, 139, 87, 0.9)";
    ctx.font = "12px \"IBM Plex Sans KR\", sans-serif";
    const label = `목표 ${goalValue}`;
    ctx.fillText(label, padding + 6, Math.max(goalY - 6, padding + 12));
    ctx.restore();
  }

  ctx.fillStyle = "#121212";
  points.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(18, 18, 18, 0.6)";
  ctx.font = "11px \"IBM Plex Sans KR\", sans-serif";
  const labelStep = values.length > 14 ? Math.ceil(values.length / 6) : 1;
  labels.forEach((label, index) => {
    if (index % labelStep !== 0 && index !== labels.length - 1) return;
    const x = padding + stepX * index;
    const y = padding + height + 16;
    ctx.fillText(label, x - 6, y);
  });
}

function renderChart() {
  const exercise = getSelectedExercise();
  const { labels, values, caption } = getRangeData();
  const goalValue =
    state.range === "daily" && exercise ? Math.max(0, Number(exercise.goal) || 0) : 0;
  drawChart(labels, values, goalValue);

  if (values.length === 0) {
    elements.chartNote.textContent = caption;
    return;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  const avg = Math.round((total / values.length) * 10) / 10;
  const max = Math.max(...values);

  const goalNote = goalValue > 0 && state.range === "daily" ? ` · 목표 ${goalValue}` : "";
  elements.chartNote.textContent = `${caption} · 합 ${total} · 평균 ${avg} · 최고 ${max}${goalNote}`;
}

async function renderRanking() {
  const list = elements.rankingList;
  if (!list) return;
  list.innerHTML = "";

  if (state.exercises.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "운동 추가";
    list.appendChild(empty);
    return;
  }

  const entries = await getAllEntries();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "기록 없음";
    list.appendChild(empty);
    return;
  }

  const maxByExercise = new Map();
  entries.forEach((entry) => {
    if (!entry || entry.count <= 0) return;
    const current = maxByExercise.get(entry.exerciseId);
    if (
      !current ||
      entry.count > current.count ||
      (entry.count === current.count && entry.date > current.date)
    ) {
      maxByExercise.set(entry.exerciseId, { count: entry.count, date: entry.date });
    }
  });

  const ranking = state.exercises
    .map((exercise) => {
      const record = maxByExercise.get(exercise.id);
      if (!record) return null;
      return { id: exercise.id, name: exercise.name, count: record.count, date: record.date };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.name.localeCompare(b.name, "ko");
    });

  if (ranking.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "기록 없음";
    list.appendChild(empty);
    return;
  }

  ranking.slice(0, 10).forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "ranking-item";
    row.setAttribute("role", "listitem");

    const rank = document.createElement("span");
    rank.className = "ranking-rank";
    rank.textContent = String(index + 1);

    const main = document.createElement("div");
    main.className = "ranking-main";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const sub = document.createElement("small");
    sub.textContent = "최고";
    main.append(name, sub);

    const metric = document.createElement("div");
    metric.className = "ranking-metric";
    const count = document.createElement("span");
    count.textContent = `${item.count}회`;
    const date = document.createElement("small");
    date.textContent = formatKoreanDate(item.date);
    metric.append(count, date);

    row.append(rank, main, metric);
    list.appendChild(row);
  });
}

function setupInstallPrompt() {
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    elements.installBtn.classList.remove("hidden");
  });

  elements.installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    elements.installBtn.classList.add("hidden");
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

function setupMobilePager() {
  const track = elements.pageTrack;
  const buttons = elements.pagerButtons;
  if (!track || !buttons || buttons.length === 0) return;

  const media = window.matchMedia("(max-width: 980px)");
  let activeIndex = 1;

  const clampIndex = (index) => Math.max(0, Math.min(index, buttons.length - 1));

  const setActive = (index) => {
    const safeIndex = clampIndex(index);
    activeIndex = safeIndex;
    buttons.forEach((btn, idx) => {
      const isActive = idx === safeIndex;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  };

  const pageWidth = () => track.getBoundingClientRect().width || track.clientWidth;

  const scrollToIndex = (index, behavior = "smooth") => {
    const safeIndex = clampIndex(index);
    const width = pageWidth();
    if (!width) return;
    track.scrollTo({ left: width * safeIndex, behavior });
    setActive(safeIndex);
  };

  buttons.forEach((button, idx) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.page ?? idx);
      scrollToIndex(index, "smooth");
    });
  });

  let rafId = null;
  const updateFromScroll = () => {
    if (!media.matches) return;
    const width = pageWidth();
    if (!width) return;
    const index = clampIndex(Math.round(track.scrollLeft / width));
    if (index !== activeIndex) setActive(index);
  };

  const handleScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateFromScroll();
    });
  };

  track.addEventListener("scroll", handleScroll, { passive: true });

  const handleResize = () => {
    if (!media.matches) return;
    scrollToIndex(activeIndex, "auto");
  };

  window.addEventListener("resize", handleResize);

  if (media.matches) {
    scrollToIndex(activeIndex, "auto");
  } else {
    setActive(activeIndex);
  }

  const handleMediaChange = () => {
    if (media.matches) {
      scrollToIndex(activeIndex, "auto");
    }
  };

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handleMediaChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(handleMediaChange);
  }
}

async function init() {
  bindEvents();
  setupInstallPrompt();
  registerServiceWorker();
  setupMobilePager();
  updateDataNoteDefaults();
  updateSelectedDateLabel();
  await refreshExercises();
}

init();
