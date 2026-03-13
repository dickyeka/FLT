<script setup>
import { ref, computed, onMounted } from "vue";
import { DAYS } from "./days";
import WorkoutView from "./views/WorkoutView.vue";
import ProgressView from "./views/ProgressView.vue";
import WeightView from "./views/WeightView.vue";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const tabs = [
 { id: "workout", label: "Latihan", icon: "🏋" },
 { id: "progress", label: "Progress", icon: "📊" },
 { id: "weight", label: "Berat Badan", icon: "⚖️" },
];

const currentTab = ref("workout");
const currentDay = ref("push");
const workoutDate = ref(today());
const calDate = ref(new Date());
const weightDate = ref(today());
const weightVal = ref("");

const sessions = ref([]);
const weights = ref([]);
const summary = ref({
 totalSessions: 0,
 weekSessions: 0,
 totalKcal: 0,
 streak: 0,
});

const toastMessage = ref("");
const toastVisible = ref(false);
let toastTimer;

const modalOpen = ref(false);
const modalDate = ref("");
const modalSessions = ref([]);

const sessionMap = computed(() => {
 const map = {};
 sessions.value.forEach((s) => {
  const dayType = s.dayType || s.day_type;
  map[`${s.date}_${dayType}`] = { ...s, dayType };
 });
 return map;
});

const currentSession = computed(() => {
 const key = `${workoutDate.value}_${currentDay.value}`;
 const found = sessionMap.value[key];
 if (found) return withDefaults(found);
 return withDefaults({ date: workoutDate.value, dayType: currentDay.value });
});

const historyEntries = computed(() =>
 sessions.value
  .filter((s) => s.completed)
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 20),
);

const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const monthLabel = computed(() => {
 const month = calDate.value.toLocaleString("id-ID", { month: "long" });
 return `${month} ${calDate.value.getFullYear()}`;
});

const calendarCells = computed(() => {
 const year = calDate.value.getFullYear();
 const month = calDate.value.getMonth();
 const firstDay = new Date(year, month, 1).getDay();
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const startOffset = firstDay === 0 ? 6 : firstDay - 1;
 const todayStr = today();
 const cells = [];
 for (let i = 0; i < startOffset; i++)
  cells.push({ empty: true, key: `e-${i}` });
 for (let d = 1; d <= daysInMonth; d++) {
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const completedTypes = Object.keys(DAYS).filter(
   (dt) => sessionMap.value[`${dateStr}_${dt}`]?.completed,
  );
  cells.push({
   empty: false,
   key: dateStr,
   day: d,
   dateStr,
   today: dateStr === todayStr,
   hasWorkout: completedTypes.length > 0,
   dayType: completedTypes[0] || null,
  });
 }
 return cells;
});

const latestWeight = computed(() =>
 weights.value.length ? weights.value[weights.value.length - 1].weight : null,
);
const targetStart = 68;
const targetGoal = 60;
const targetBarWidth = computed(() => {
 if (!weights.value.length) return 0;
 const latest = weights.value[weights.value.length - 1].weight;
 const lost = targetStart - latest;
 const total = targetStart - targetGoal;
 return Math.max(0, Math.min(100, (lost / total) * 100));
});
const targetLabel = computed(() => {
 if (!weights.value.length) return "—";
 const latest = weights.value[weights.value.length - 1].weight;
 const diff = latest - targetGoal;
 if (diff <= 0) return "🎉 Target tercapai!";
 return `Sisa ${diff.toFixed(1)} kg menuju target`;
});

onMounted(async () => {
 await Promise.all([fetchSessions(), fetchWeights(), fetchSummary()]);
});

function today() {
 return new Date().toISOString().split("T")[0];
}

function withDefaults(session) {
 const dayType = session.dayType;
 return {
  date: session.date,
  dayType,
  exercises: session.exercises || {},
  cardio: session.cardio || false,
  notes: session.notes || "",
  completed: session.completed || false,
  kcal: session.kcal ?? (DAYS[dayType]?.kcal || 0),
 };
}

async function fetchSessions() {
 try {
  const res = await fetch(`${API_BASE}/api/sessions`);
  const data = await res.json();
  sessions.value = data.map((row) => ({
   ...row,
   dayType: row.day_type || row.dayType,
   exercises: row.exercises || {},
  }));
 } catch (err) {
  showToast("Gagal memuat sesi");
  console.error(err);
 }
}

async function fetchWeights() {
 try {
  const res = await fetch(`${API_BASE}/api/weights`);
  const data = await res.json();
  weights.value = data
   .map((w) => ({ ...w, weight: Number(w.weight) }))
   .sort((a, b) => a.date.localeCompare(b.date));
 } catch (err) {
  showToast("Gagal memuat berat");
  console.error(err);
 }
}

async function fetchSummary() {
 try {
  const res = await fetch(`${API_BASE}/api/summary`);
  const data = await res.json();
  summary.value = data;
 } catch (err) {
  console.error(err);
 }
}

function upsertSessionLocal(session) {
 const dayType = session.dayType || session.day_type;
 const idx = sessions.value.findIndex(
  (s) => s.date === session.date && (s.dayType || s.day_type) === dayType,
 );
 const normalized = { ...session, dayType, exercises: session.exercises || {} };
 if (idx >= 0) sessions.value[idx] = normalized;
 else sessions.value.push(normalized);
}

async function saveSession(partial, toastMsg = "") {
 const payload = {
  ...currentSession.value,
  ...partial,
  date: workoutDate.value,
  dayType: currentDay.value,
  kcal: DAYS[currentDay.value].kcal,
 };
 try {
  const res = await fetch(`${API_BASE}/api/sessions`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save session");
  const saved = await res.json();
  upsertSessionLocal({ ...saved, dayType: saved.day_type || saved.dayType });
  fetchSummary();
  if (toastMsg) showToast(toastMsg);
 } catch (err) {
  console.error(err);
  showToast("Gagal menyimpan sesi");
 }
}

async function deleteSession(date, dayType) {
 try {
  const res = await fetch(`${API_BASE}/api/sessions/${date}/${dayType}`, {
   method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete");
  sessions.value = sessions.value.filter(
   (s) => !(s.date === date && (s.dayType || s.day_type) === dayType),
  );
  await fetchSummary();
  showToast("🗑 Sesi dihapus");
 } catch (err) {
  console.error(err);
  showToast("Gagal menghapus sesi");
 }
}

async function toggleExercise(exId) {
 const exercises = { ...currentSession.value.exercises };
 const ex = exercises[exId] || {};
 const nextDone = !ex.done;
 exercises[exId] = { ...ex, done: nextDone };
 // Optimistic UI update so checkbox responds instantly
 upsertSessionLocal({ ...currentSession.value, exercises, completed: false });
 await saveSession(
  { exercises, completed: false },
  nextDone ? "✓ Latihan selesai!" : "Dibatalkan",
 );
}

async function saveExInput(exId, field, value) {
 const exercises = { ...currentSession.value.exercises };
 const ex = exercises[exId] || {};
 exercises[exId] = { ...ex, [field]: value };
 // Optimistic local update to keep input responsive
 upsertSessionLocal({ ...currentSession.value, exercises });
 await saveSession({ exercises });
}

async function saveExSet(exId, setIdx, field, value) {
 const exercises = { ...currentSession.value.exercises };
 const ex = { ...(exercises[exId] || {}) };
 const setRows = [...(ex.setRows || [])];
 setRows[setIdx] = { ...(setRows[setIdx] || {}), [field]: value };
 ex.setRows = setRows;
 exercises[exId] = ex;
 upsertSessionLocal({ ...currentSession.value, exercises });
 await saveSession({ exercises });
}

async function removeExSet(exId, setIdx) {
 const exercises = { ...currentSession.value.exercises };
 const ex = { ...(exercises[exId] || {}) };
 const setRows = [...(ex.setRows || [])];
 if (setRows.length <= 1) return;
 setRows.splice(setIdx, 1);
 ex.setRows = setRows;
 exercises[exId] = ex;
 upsertSessionLocal({ ...currentSession.value, exercises });
 await saveSession({ exercises });
}

async function toggleCardio() {
 const nextVal = !currentSession.value.cardio;
 upsertSessionLocal({ ...currentSession.value, cardio: nextVal });
 await saveSession(
  { cardio: nextVal },
  nextVal ? "🏃 Cardio selesai!" : "Cardio dibatalkan",
 );
}

async function saveNotes(val) {
 upsertSessionLocal({ ...currentSession.value, notes: val });
 await saveSession({ notes: val });
}

async function completeDay() {
 const day = DAYS[currentDay.value];
 const exercises = { ...currentSession.value.exercises };
 day.exercises.forEach((ex) => {
  exercises[ex.id] = { ...(exercises[ex.id] || {}), done: true };
 });
 upsertSessionLocal({
  ...currentSession.value,
  exercises,
  cardio: true,
  completed: true,
 });
 await saveSession(
  { exercises, cardio: true, completed: true },
  `🔥 ${day.name} selesai! +${day.kcal} kcal`,
 );
}

function isDayCompleted(dayType) {
 const key = `${workoutDate.value}_${dayType}`;
 return !!sessionMap.value[key]?.completed;
}

function switchTab(tab) {
 currentTab.value = tab;
}

function selectDay(dayType) {
 currentDay.value = dayType;
}

function changeMonth(delta) {
 const next = new Date(calDate.value);
 next.setMonth(next.getMonth() + delta);
 calDate.value = next;
}

function openDayModal(dateStr) {
 const list = sessions.value.filter((s) => s.date === dateStr);
 if (!list.length) return;
 modalDate.value = dateStr;
 modalSessions.value = list;
 modalOpen.value = true;
}

function closeModal() {
 modalOpen.value = false;
 modalSessions.value = [];
}

function showToast(msg) {
 toastMessage.value = msg;
 toastVisible.value = true;
 clearTimeout(toastTimer);
 toastTimer = setTimeout(() => (toastVisible.value = false), 2200);
}

async function logWeight() {
 const val = parseFloat(weightVal.value);
 if (!weightDate.value || Number.isNaN(val) || val < 30 || val > 300) {
  showToast("⚠ Masukkan tanggal & berat valid");
  return;
 }
 try {
  const res = await fetch(`${API_BASE}/api/weights`, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ date: weightDate.value, weight: val }),
  });
  if (!res.ok) throw new Error("Failed");
  const saved = await res.json();
  const cleaned = { ...saved, weight: Number(saved.weight) };
  const idx = weights.value.findIndex((w) => w.date === cleaned.date);
  if (idx >= 0) weights.value[idx] = cleaned;
  else weights.value.push(cleaned);
  weights.value.sort((a, b) => a.date.localeCompare(b.date));
  weights.value.sort((a, b) => a.date.localeCompare(b.date));
  weightVal.value = "";
  await fetchSummary();
  showToast(`⚖️ Berat ${val} kg dicatat`);
 } catch (err) {
  console.error(err);
  showToast("Gagal menyimpan berat");
 }
}

async function deleteWeight(date) {
 try {
  await fetch(`${API_BASE}/api/weights/${date}`, { method: "DELETE" });
  weights.value = weights.value.filter((w) => w.date !== date);
  await fetchSummary();
  showToast("🗑 Data dihapus");
 } catch (err) {
  console.error(err);
 }
}

function formatDate(str) {
 const d = new Date(str + "T12:00:00");
 return d.toLocaleDateString("id-ID", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
 });
}

function weightDiffText(list, idx) {
 if (idx === 0) return "—";
 const diff = list[idx].weight - list[idx - 1].weight;
 if (diff === 0) return "—";
 const sign = diff > 0 ? "+" : "";
 return `${sign}${diff.toFixed(1)} kg`;
}

function weightDiffClass(list, idx) {
 if (idx === 0) return "same";
 const diff = list[idx].weight - list[idx - 1].weight;
 if (diff === 0) return "same";
 return diff < 0 ? "down" : "up";
}
</script>

<template>
 <div class="app">
  <div class="topbar">
   <div class="logo">
    <div class="logo-dot"></div>
    FAT LOSS TRACKER
   </div>
   <div class="topbar-stats">
    <div class="ts-item">
     <div class="ts-val">{{ summary.totalSessions }}</div>
     <div class="ts-lbl">Sesi Total</div>
    </div>
    <div class="ts-item">
     <div class="ts-val">{{ summary.weekSessions }}</div>
     <div class="ts-lbl">Minggu Ini</div>
    </div>
    <div class="ts-item">
     <div class="ts-val">{{ latestWeight ? `${latestWeight} kg` : "—" }}</div>
     <div class="ts-lbl">Berat Skrg</div>
    </div>
   </div>
  </div>

  <div class="nav-tabs">
   <button
    v-for="tab in tabs"
    :key="tab.id"
    class="nav-tab"
    :class="{ active: currentTab === tab.id }"
    @click="switchTab(tab.id)"
   >
    <span class="tab-icon">{{ tab.icon }}</span> {{ tab.label }}
   </button>
  </div>

  <div
   class="view"
   :class="{ active: currentTab === 'workout' }"
   id="view-workout"
  >
   <WorkoutView
    :days="DAYS"
    :current-day="currentDay"
    :current-session="currentSession"
    :workout-date="workoutDate"
    :is-day-completed="isDayCompleted"
    @select-day="selectDay"
    @update:workoutDate="(val) => (workoutDate.value = val)"
    @toggle-exercise="toggleExercise"
    @save-ex-input="saveExInput"
    @save-ex-set="saveExSet"
    @remove-ex-set="removeExSet"
    @toggle-cardio="toggleCardio"
    @save-notes="saveNotes"
    @complete-day="completeDay"
   />
  </div>

  <div
   class="view"
   :class="{ active: currentTab === 'progress' }"
   id="view-progress"
  >
   <ProgressView
    :summary="summary"
    :month-label="monthLabel"
    :day-names="dayNames"
    :calendar-cells="calendarCells"
    :history-entries="historyEntries"
    :days="DAYS"
    :format-date="formatDate"
    @change-month="changeMonth"
    @open-day-modal="openDayModal"
    @delete-session="deleteSession"
   />
  </div>

  <div
   class="view"
   :class="{ active: currentTab === 'weight' }"
   id="view-weight"
  >
   <WeightView
    v-model:weightDate="weightDate"
    v-model:weightVal="weightVal"
    :weights="weights"
    :target-bar-width="targetBarWidth"
    :target-label="targetLabel"
    :format-date="formatDate"
    :weight-diff-text="weightDiffText"
    :weight-diff-class="weightDiffClass"
    :active="currentTab === 'weight'"
    @log-weight="logWeight"
    @delete-weight="deleteWeight"
   />
  </div>
 </div>

 <!-- TOAST -->
 <div class="toast" id="toast" :class="{ show: toastVisible }">
  {{ toastMessage }}
 </div>

 <!-- MODAL -->
 <div
  class="modal-overlay"
  :class="{ open: modalOpen }"
  @click.self="closeModal"
 >
  <div class="modal">
   <button class="modal-close" @click="closeModal">×</button>
   <div class="modal-title">
    {{ modalDate ? formatDate(modalDate) : "" }}
   </div>
   <div v-for="session in modalSessions" :key="session.dayType" id="modalBody">
    <div
     class="modal-entry"
     v-for="ex in DAYS[session.dayType]?.exercises || []"
     :key="ex.id"
    >
     <div class="modal-ex">
      {{ session.exercises?.[ex.id]?.done ? "✓" : "○" }} {{ ex.name }}
     </div>
     <div class="modal-ex-data">
      <template v-if="session.exercises?.[ex.id]">
       <span v-if="session.exercises[ex.id].weight"
        >Beban: <strong>{{ session.exercises[ex.id].weight }} kg</strong></span
       >
       <span v-if="session.exercises[ex.id].reps">
        · Reps: <strong>{{ session.exercises[ex.id].reps }}</strong></span
       >
       <span v-if="session.exercises[ex.id].sets">
        · Sets: <strong>{{ session.exercises[ex.id].sets }}</strong></span
       >
       <span
        v-if="
         !session.exercises[ex.id].weight && !session.exercises[ex.id].reps
        "
        >Tidak ada data input</span
       >
      </template>
      <template v-else> Tidak ada data input </template>
     </div>
    </div>
    <div class="modal-entry">
     <div class="modal-ex">
      {{ session.cardio ? "✓" : "○" }} {{ DAYS[session.dayType]?.cardio.name }}
     </div>
    </div>
    <div class="modal-entry" v-if="session.notes">
     <div class="modal-ex">📝 Catatan</div>
     <div class="modal-ex-data">{{ session.notes }}</div>
    </div>
   </div>
  </div>
 </div>
</template>
