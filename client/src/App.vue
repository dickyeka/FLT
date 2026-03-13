<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const DAYS = {
  push: {
    label: 'Senin', name: 'Push Day', focus: 'Chest + Triceps',
    color: 'push', kcal: 390,
    exercises: [
      { id: 'chest_press', name: 'Machine Chest Press', target: '4 × 10', sets: 4, reps: 10, suggestedWeight: '15–20' },
      { id: 'chest_fly', name: 'Chest Fly', target: '3 × 12', sets: 3, reps: 12, suggestedWeight: '10–15' },
      { id: 'dips', name: 'Assisted Dips', target: '3 × 10', sets: 3, reps: 10, suggestedWeight: '—' },
    ],
    cardio: { icon: '🏃', name: 'Treadmill Incline', desc: 'Speed 5–6 km/h · Incline 7–10 · 12–15 menit' }
  },
  legs: {
    label: 'Selasa', name: 'Legs Day', focus: 'Big Fat Burner',
    color: 'legs', kcal: 430,
    exercises: [
      { id: 'leg_press', name: 'Leg Press', target: '4 × 12', sets: 4, reps: 12, suggestedWeight: '50–70' },
      { id: 'leg_ext', name: 'Leg Extension', target: '3 × 12', sets: 3, reps: 12, suggestedWeight: '20–25' },
      { id: 'leg_curl', name: 'Lying Leg Curl', target: '3 × 12', sets: 3, reps: 12, suggestedWeight: '20–25' },
      { id: 'squat', name: 'Bodyweight Squat', target: '3 × 15', sets: 3, reps: 15, suggestedWeight: 'BW' },
    ],
    cardio: { icon: '🏃', name: 'Treadmill', desc: '10–12 menit' }
  },
  pull: {
    label: 'Kamis', name: 'Pull Day', focus: 'Back + Biceps',
    color: 'pull', kcal: 380,
    exercises: [
      { id: 'lat_pull', name: 'Wide Lat Pulldown', target: '4 × 10', sets: 4, reps: 10, suggestedWeight: '20–25' },
      { id: 'seated_row', name: 'Seated Row', target: '3 × 10', sets: 3, reps: 10, suggestedWeight: '20–25' },
      { id: 'chinup', name: 'Assisted Chin-up', target: '3 × 8–10', sets: 3, reps: 10, suggestedWeight: '—' },
      { id: 'preacher', name: 'Preacher Curl', target: '3 × 12', sets: 3, reps: 12, suggestedWeight: '7–10' },
    ],
    cardio: { icon: '🚴', name: 'Elliptical / Treadmill', desc: '10–12 menit' }
  },
  core: {
    label: 'Jumat', name: 'Core + Fat Burn', focus: 'Abs + Cardio',
    color: 'core', kcal: 370,
    exercises: [
      { id: 'cable_crunch', name: 'Cable Crunch', target: '4 × 15', sets: 4, reps: 15, suggestedWeight: '10–15' },
      { id: 'plank', name: 'Plank', target: '3 × 30–40 detik', sets: 3, reps: null, suggestedWeight: 'BW' },
      { id: 'flutter', name: 'Flutter Kick', target: '3 × 20', sets: 3, reps: 20, suggestedWeight: 'BW' },
    ],
    cardio: { icon: '🚣', name: 'Rowing Machine', desc: '12–15 menit' }
  }
};

const tabs = [
  { id: 'workout', label: 'Latihan', icon: '🏋' },
  { id: 'progress', label: 'Progress', icon: '📊' },
  { id: 'weight', label: 'Berat Badan', icon: '⚖️' },
];

const currentTab = ref('workout');
const currentDay = ref('push');
const workoutDate = ref(today());
const calDate = ref(new Date());
const weightDate = ref(today());
const weightVal = ref('');

const sessions = ref([]);
const weights = ref([]);
const summary = ref({ totalSessions: 0, weekSessions: 0, totalKcal: 0, streak: 0 });

const toastMessage = ref('');
const toastVisible = ref(false);
let toastTimer;

const modalOpen = ref(false);
const modalDate = ref('');
const modalSessions = ref([]);

const chartCanvas = ref(null);
let chartInstance = null;

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
    .slice(0, 20)
);

const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const monthLabel = computed(() => {
  const month = calDate.value.toLocaleString('id-ID', { month: 'long' });
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
  for (let i = 0; i < startOffset; i++) cells.push({ empty: true, key: `e-${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const completedTypes = Object.keys(DAYS).filter(
      (dt) => sessionMap.value[`${dateStr}_${dt}`]?.completed
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

const latestWeight = computed(() => (weights.value.length ? weights.value[weights.value.length - 1].weight : null));
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
  if (!weights.value.length) return '—';
  const latest = weights.value[weights.value.length - 1].weight;
  const diff = latest - targetGoal;
  if (diff <= 0) return '🎉 Target tercapai!';
  return `Sisa ${diff.toFixed(1)} kg menuju target`;
});

watch(weights, () => nextTick(renderChart), { deep: true });
watch(currentTab, (tab) => { if (tab === 'weight') nextTick(renderChart); });

onMounted(async () => {
  await Promise.all([fetchSessions(), fetchWeights(), fetchSummary()]);
  await nextTick();
  renderChart();
});

function today() {
  return new Date().toISOString().split('T')[0];
}

function withDefaults(session) {
  const dayType = session.dayType;
  return {
    date: session.date,
    dayType,
    exercises: session.exercises || {},
    cardio: session.cardio || false,
    notes: session.notes || '',
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
    showToast('Gagal memuat sesi');
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
    showToast('Gagal memuat berat');
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
  const idx = sessions.value.findIndex((s) => s.date === session.date && (s.dayType || s.day_type) === dayType);
  const normalized = { ...session, dayType, exercises: session.exercises || {} };
  if (idx >= 0) sessions.value[idx] = normalized;
  else sessions.value.push(normalized);
}

async function saveSession(partial, toastMsg = '') {
  const payload = {
    ...currentSession.value,
    ...partial,
    date: workoutDate.value,
    dayType: currentDay.value,
    kcal: DAYS[currentDay.value].kcal,
  };
  try {
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save session');
    const saved = await res.json();
    upsertSessionLocal({ ...saved, dayType: saved.day_type || saved.dayType });
    fetchSummary();
    if (toastMsg) showToast(toastMsg);
  } catch (err) {
    console.error(err);
    showToast('Gagal menyimpan sesi');
  }
}

async function toggleExercise(exId) {
  const exercises = { ...currentSession.value.exercises };
  const ex = exercises[exId] || {};
  const nextDone = !ex.done;
  exercises[exId] = { ...ex, done: nextDone };
  await saveSession({ exercises, completed: false }, nextDone ? '✓ Latihan selesai!' : 'Dibatalkan');
}

async function saveExInput(exId, field, value) {
  const exercises = { ...currentSession.value.exercises };
  const ex = exercises[exId] || {};
  exercises[exId] = { ...ex, [field]: value };
  await saveSession({ exercises });
}

async function toggleCardio() {
  const nextVal = !currentSession.value.cardio;
  await saveSession({ cardio: nextVal }, nextVal ? '🏃 Cardio selesai!' : 'Cardio dibatalkan');
}

async function saveNotes(val) {
  await saveSession({ notes: val });
}

async function completeDay() {
  const day = DAYS[currentDay.value];
  const exercises = { ...currentSession.value.exercises };
  day.exercises.forEach((ex) => {
    exercises[ex.id] = { ...(exercises[ex.id] || {}), done: true };
  });
  await saveSession({ exercises, cardio: true, completed: true }, `🔥 ${day.name} selesai! +${day.kcal} kcal`);
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
    showToast('⚠ Masukkan tanggal & berat valid');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/weights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: weightDate.value, weight: val }),
    });
    if (!res.ok) throw new Error('Failed');
    const saved = await res.json();
    const cleaned = { ...saved, weight: Number(saved.weight) };
    const idx = weights.value.findIndex((w) => w.date === cleaned.date);
    if (idx >= 0) weights.value[idx] = cleaned;
    else weights.value.push(cleaned);
    weights.value.sort((a, b) => a.date.localeCompare(b.date));
    weights.value.sort((a, b) => a.date.localeCompare(b.date));
    weightVal.value = '';
    await fetchSummary();
    showToast(`⚖️ Berat ${val} kg dicatat`);
  } catch (err) {
    console.error(err);
    showToast('Gagal menyimpan berat');
  }
}

async function deleteWeight(date) {
  try {
    await fetch(`${API_BASE}/api/weights/${date}`, { method: 'DELETE' });
    weights.value = weights.value.filter((w) => w.date !== date);
    await fetchSummary();
    showToast('🗑 Data dihapus');
  } catch (err) {
    console.error(err);
  }
}

function renderChart() {
  if (!chartCanvas.value || chartCanvas.value.offsetParent === null) return;
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (weights.value.length < 2) return;
  const labels = weights.value.map((w) => formatDate(w.date));
  const data = weights.value.map((w) => w.weight);
  chartInstance = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Berat (kg)',
        data,
        borderColor: '#00e5ff',
        backgroundColor: 'rgba(0,229,255,0.2)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#00e5ff',
        pointBorderColor: '#080c10',
        pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#7a8fa0', font: { family: 'JetBrains Mono', size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: '#7a8fa0', font: { family: 'JetBrains Mono', size: 10 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });
}

function formatDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

function weightDiffText(list, idx) {
  if (idx === 0) return '—';
  const diff = list[idx].weight - list[idx - 1].weight;
  if (diff === 0) return '—';
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)} kg`;
}

function weightDiffClass(list, idx) {
  if (idx === 0) return 'same';
  const diff = list[idx].weight - list[idx - 1].weight;
  if (diff === 0) return 'same';
  return diff < 0 ? 'down' : 'up';
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
          <div class="ts-val">{{ latestWeight ? `${latestWeight} kg` : '—' }}</div>
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

    <!-- WORKOUT VIEW -->
    <div class="view" :class="{ active: currentTab === 'workout' }" id="view-workout">
      <div class="date-row">
        <span class="date-label">Tanggal</span>
        <input type="date" class="date-input" v-model="workoutDate" />
      </div>

      <div class="day-selector">
        <button
          v-for="(day, key) in DAYS"
          :key="key"
          class="day-btn"
          :class="[day.color, { active: currentDay === key, completed: isDayCompleted(key) }]"
          @click="selectDay(key)"
        >
          <div class="day-check">✓</div>
          <div class="day-label">{{ day.label }}</div>
          <div class="day-name">{{ key.toUpperCase() }}</div>
          <div class="day-focus">{{ day.focus }}</div>
        </button>
      </div>

      <div v-if="currentDay" id="workoutContent">
        <div class="workout-header">
          <div class="workout-title" :class="DAYS[currentDay].color">{{ DAYS[currentDay].name }}</div>
          <button class="btn-complete-day" @click="completeDay">✓ Selesai</button>
        </div>

        <div class="exercises-list">
          <div
            v-for="(ex, i) in DAYS[currentDay].exercises"
            :key="ex.id"
            class="exercise-card"
            :class="{ done: currentSession.exercises?.[ex.id]?.done }"
            :id="`excard-${ex.id}`"
          >
            <div class="exercise-top" @click="toggleExercise(ex.id)">
              <div class="ex-checkbox">{{ currentSession.exercises?.[ex.id]?.done ? '✓' : '' }}</div>
              <span class="ex-num">0{{ i + 1 }}</span>
              <span class="ex-name">{{ ex.name }}</span>
              <span class="ex-target">{{ ex.target }}</span>
            </div>
            <div class="exercise-inputs">
              <div class="ex-input-group">
                <div class="ex-input-label">Beban (kg)</div>
                <input
                  class="ex-input"
                  type="number"
                  :placeholder="ex.suggestedWeight"
                  min="0"
                  step="0.5"
                  :value="currentSession.exercises?.[ex.id]?.weight || ''"
                  @input="saveExInput(ex.id, 'weight', $event.target.value)"
                />
              </div>
              <div class="ex-input-group">
                <div class="ex-input-label">Reps</div>
                <input
                  class="ex-input"
                  type="number"
                  :placeholder="ex.reps || '—'"
                  min="0"
                  :value="currentSession.exercises?.[ex.id]?.reps || ''"
                  @input="saveExInput(ex.id, 'reps', $event.target.value)"
                />
              </div>
              <div class="ex-input-group">
                <div class="ex-input-label">Sets</div>
                <input
                  class="ex-input"
                  type="number"
                  :placeholder="ex.sets"
                  min="0"
                  :value="currentSession.exercises?.[ex.id]?.sets || ''"
                  @input="saveExInput(ex.id, 'sets', $event.target.value)"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          class="cardio-card"
          :class="{ done: currentSession.cardio }"
          id="cardioCard"
          style="margin-top:12px"
          @click="toggleCardio"
        >
          <span class="cardio-icon">{{ DAYS[currentDay].cardio.icon }}</span>
          <div class="cardio-info">
            <div class="cardio-title">{{ DAYS[currentDay].cardio.name }}</div>
            <div class="cardio-desc">{{ DAYS[currentDay].cardio.desc }}</div>
          </div>
          <div class="cardio-checkbox">{{ currentSession.cardio ? '✓' : '' }}</div>
        </div>

        <div class="notes-area" style="margin-top:16px">
          <textarea
            class="notes-textarea"
            placeholder="Catatan hari ini... (opsional)"
            :value="currentSession.notes"
            @input="saveNotes($event.target.value)"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- PROGRESS VIEW -->
    <div class="view" :class="{ active: currentTab === 'progress' }" id="view-progress">
      <div class="progress-top">
        <div class="prog-card accent">
          <div class="prog-label">Total Sesi</div>
          <div class="prog-val" id="pTotalSessions">{{ summary.totalSessions }}</div>
          <div class="prog-sub">sesi selesai</div>
        </div>
        <div class="prog-card green">
          <div class="prog-label">Minggu Ini</div>
          <div class="prog-val" id="pWeekSessions">{{ summary.weekSessions }}</div>
          <div class="prog-sub">dari 4 target</div>
        </div>
        <div class="prog-card orange">
          <div class="prog-label">Total Kalori</div>
          <div class="prog-val" id="pTotalKcal">{{ summary.totalKcal }}</div>
          <div class="prog-sub">kcal dibakar</div>
        </div>
        <div class="prog-card yellow">
          <div class="prog-label">Streak</div>
          <div class="prog-val" id="pStreak">{{ summary.streak }}</div>
          <div class="prog-sub">minggu aktif</div>
        </div>
      </div>

      <div class="cal-section">
        <div class="cal-title">
          <span id="calMonthLabel">{{ monthLabel }}</span>
          <div class="cal-nav">
            <button class="cal-nav-btn" @click="changeMonth(-1)">‹</button>
            <button class="cal-nav-btn" @click="changeMonth(1)">›</button>
          </div>
        </div>
        <div class="cal-grid">
          <div v-for="d in dayNames" :key="d" class="cal-day-name">{{ d }}</div>
          <template v-for="cell in calendarCells" :key="cell.key">
            <div
              v-if="cell.empty"
              class="cal-cell"
            ></div>
            <div
              v-else
              class="cal-cell"
              :class="[{ today: cell.today, 'has-workout': cell.hasWorkout }, cell.dayType ? `${cell.dayType}-day` : '']"
              @click="cell.hasWorkout && openDayModal(cell.dateStr)"
            >
              {{ cell.day }}
              <div v-if="cell.hasWorkout" class="cal-dot"></div>
            </div>
          </template>
        </div>
      </div>

      <div class="history-section">
        <div class="history-header">📋 Riwayat Latihan</div>
        <div v-if="!historyEntries.length" class="history-empty">
          Belum ada sesi selesai.<br>Mulai latihan dan tekan "✓ Selesai"!
        </div>
        <div v-else id="historyList">
          <div
            v-for="entry in historyEntries"
            :key="`${entry.date}_${entry.dayType}`"
            class="history-entry"
            @click="openDayModal(entry.date)"
          >
            <div class="he-date">{{ formatDate(entry.date) }}</div>
            <div class="he-info">
              <div class="he-day">
                {{ DAYS[entry.dayType]?.name }}
                <span class="he-day-badge" :class="entry.dayType">{{ entry.dayType.toUpperCase() }}</span>
              </div>
              <div class="he-exercises">
                {{ Object.values(entry.exercises || {}).filter((e) => e.done).length }}/{{ DAYS[entry.dayType]?.exercises.length }} latihan ·
                {{ entry.cardio ? '✓ Cardio' : '— Cardio' }}
              </div>
            </div>
            <div>
              <div class="he-kcal">{{ entry.kcal || DAYS[entry.dayType]?.kcal }}</div>
              <span class="he-kcal-unit">kcal</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- WEIGHT VIEW -->
    <div class="view" :class="{ active: currentTab === 'weight' }" id="view-weight">
      <div class="weight-form">
        <div class="wf-title">📥 Catat Berat Badan</div>
        <div class="wf-row">
          <div class="wf-group">
            <label class="wf-label">Tanggal</label>
            <input type="date" class="wf-input" v-model="weightDate" style="font-size:14px;font-weight:500" />
          </div>
          <div class="wf-group">
            <label class="wf-label">Berat (kg)</label>
            <input
              type="number"
              class="wf-input"
              v-model="weightVal"
              placeholder="68.0"
              step="0.1"
              min="30"
              max="200"
            />
          </div>
          <button class="btn-log" @click="logWeight">+ Catat</button>
        </div>
      </div>

      <div class="chart-box">
        <div class="chart-title">📈 Grafik Berat Badan</div>
        <div class="weight-chart">
          <canvas ref="chartCanvas"></canvas>
        </div>
        <div v-if="weights.length < 2" id="chartEmpty" style="text-align:center;color:var(--muted2);padding:40px 0;font-size:13px;">
          Belum ada data. Mulai catat berat badanmu! ↑
        </div>
      </div>

      <div style="background:var(--s1);border:1px solid var(--border);border-radius:var(--r2);padding:24px;margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:12px;color:var(--muted2)">
          <span>Target: <strong style="color:var(--text)">60 kg</strong></span>
          <span id="targetRemain">{{ targetLabel }}</span>
        </div>
        <div style="height:8px;background:var(--s3);border-radius:99px;overflow:hidden;">
          <div id="targetBar" :style="{ width: `${targetBarWidth}%` }" style="height:100%;background:linear-gradient(90deg,var(--orange),var(--accent));border-radius:99px;transition:width 1s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:var(--muted)">
          <span>60 kg</span>
          <span>Start: 68 kg</span>
        </div>
      </div>

      <div class="sec-title"><div class="sec-divider"></div> Riwayat Berat</div>
      <div class="weight-history" id="weightHistory">
        <div v-if="!weights.length" style="text-align:center;color:var(--muted2);padding:32px;font-size:13px;">Belum ada catatan berat badan.</div>
        <div v-else>
          <div
            v-for="(w, i) in [...weights].slice().reverse()"
            :key="w.date"
            class="wh-entry"
          >
            <span class="wh-date">{{ formatDate(w.date) }}</span>
            <span class="wh-val">{{ w.weight }}</span>
            <span class="wh-unit">kg</span>
            <span
              class="wh-diff"
              :class="weightDiffClass(weights, weights.length - 1 - i)"
            >
              {{ weightDiffText(weights, weights.length - 1 - i) }}
            </span>
            <button class="btn-del" @click="deleteWeight(w.date)" title="Hapus">✕</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- TOAST -->
  <div class="toast" id="toast" :class="{ show: toastVisible }">{{ toastMessage }}</div>

  <!-- MODAL -->
  <div class="modal-overlay" :class="{ open: modalOpen }" @click.self="closeModal">
    <div class="modal">
      <button class="modal-close" @click="closeModal">×</button>
      <div class="modal-title">
        {{ modalDate ? formatDate(modalDate) : '' }}
      </div>
      <div v-for="session in modalSessions" :key="session.dayType" id="modalBody">
        <div class="modal-entry" v-for="ex in DAYS[session.dayType]?.exercises || []" :key="ex.id">
          <div class="modal-ex">{{ session.exercises?.[ex.id]?.done ? '✓' : '○' }} {{ ex.name }}</div>
          <div class="modal-ex-data">
            <template v-if="session.exercises?.[ex.id]">
              <span v-if="session.exercises[ex.id].weight">Beban: <strong>{{ session.exercises[ex.id].weight }} kg</strong></span>
              <span v-if="session.exercises[ex.id].reps"> · Reps: <strong>{{ session.exercises[ex.id].reps }}</strong></span>
              <span v-if="session.exercises[ex.id].sets"> · Sets: <strong>{{ session.exercises[ex.id].sets }}</strong></span>
              <span v-if="!session.exercises[ex.id].weight && !session.exercises[ex.id].reps">Tidak ada data input</span>
            </template>
            <template v-else>
              Tidak ada data input
            </template>
          </div>
        </div>
        <div class="modal-entry">
          <div class="modal-ex">{{ session.cardio ? '✓' : '○' }} {{ DAYS[session.dayType]?.cardio.name }}</div>
        </div>
        <div class="modal-entry" v-if="session.notes">
          <div class="modal-ex">📝 Catatan</div>
          <div class="modal-ex-data">{{ session.notes }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
