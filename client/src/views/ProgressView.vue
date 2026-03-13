<script setup>
const props = defineProps({
 summary: { type: Object, required: true },
 monthLabel: { type: String, required: true },
 dayNames: { type: Array, required: true },
 calendarCells: { type: Array, required: true },
 historyEntries: { type: Array, required: true },
 days: { type: Object, required: true },
 formatDate: { type: Function, required: true },
});

const emit = defineEmits(["change-month", "open-day-modal", "delete-session"]);
</script>

<template>
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
    <button class="cal-nav-btn" @click="emit('change-month', -1)">‹</button>
    <button class="cal-nav-btn" @click="emit('change-month', 1)">›</button>
   </div>
  </div>
  <div class="cal-grid">
   <div v-for="d in dayNames" :key="d" class="cal-day-name">{{ d }}</div>
   <template v-for="cell in calendarCells" :key="cell.key">
    <div v-if="cell.empty" class="cal-cell"></div>
    <div
     v-else
     class="cal-cell"
     :class="[
      { today: cell.today, 'has-workout': cell.hasWorkout },
      cell.dayType ? `${cell.dayType}-day` : '',
     ]"
     @click="cell.hasWorkout && emit('open-day-modal', cell.dateStr)"
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
   Belum ada sesi selesai.<br />Mulai latihan dan tekan "✓ Selesai"!
  </div>
  <div v-else id="historyList">
   <div
    v-for="entry in historyEntries"
    :key="`${entry.date}_${entry.dayType}`"
    class="history-entry"
    @click="emit('open-day-modal', entry.date)"
   >
    <div class="he-date">{{ formatDate(entry.date) }}</div>
    <div class="he-info">
     <div class="he-day">
      {{ days[entry.dayType]?.name }}
      <span class="he-day-badge" :class="entry.dayType">{{
       entry.dayType.toUpperCase()
      }}</span>
     </div>
     <div class="he-exercises">
      {{ Object.values(entry.exercises || {}).filter((e) => e.done).length }}/{{
       days[entry.dayType]?.exercises.length
      }}
      latihan ·
      {{ entry.cardio ? "✓ Cardio" : "— Cardio" }}
     </div>
    </div>
    <div class="history-actions">
     <div class="he-kcal">{{ entry.kcal || days[entry.dayType]?.kcal }}</div>
     <span class="he-kcal-unit">kcal</span>
     <button
      class="btn-del"
      title="Hapus sesi"
      @click.stop="emit('delete-session', entry.date, entry.dayType)"
     >
      ✕
     </button>
    </div>
   </div>
  </div>
 </div>
</template>
