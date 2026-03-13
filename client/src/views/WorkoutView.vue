<script setup>
const props = defineProps({
  days: { type: Object, required: true },
  currentDay: { type: String, required: true },
  currentSession: { type: Object, required: true },
  workoutDate: { type: String, required: true },
  isDayCompleted: { type: Function, required: true },
});

const emit = defineEmits([
  "select-day",
  "update:workoutDate",
  "toggle-exercise",
  "save-ex-input",
  "toggle-cardio",
  "save-notes",
  "complete-day",
]);
</script>

<template>
  <div class="date-row">
    <span class="date-label">Tanggal</span>
    <input
      type="date"
      class="date-input"
      :value="workoutDate"
      @input="emit('update:workoutDate', $event.target.value)"
    />
  </div>

  <div class="day-selector">
    <button
      v-for="(day, key) in days"
      :key="key"
      class="day-btn"
      :class="[day.color, { active: currentDay === key, completed: isDayCompleted(key) }]"
      @click="emit('select-day', key)"
    >
      <div class="day-check">✓</div>
      <div class="day-label">{{ day.label }}</div>
      <div class="day-name">{{ key.toUpperCase() }}</div>
      <div class="day-focus">{{ day.focus }}</div>
    </button>
  </div>

  <div v-if="currentDay" id="workoutContent">
    <div class="workout-header">
      <div class="workout-title" :class="days[currentDay].color">
        {{ days[currentDay].name }}
      </div>
      <button class="btn-complete-day" @click="emit('complete-day')">✓ Selesai</button>
    </div>

    <div class="exercises-list">
      <div
        v-for="(ex, i) in days[currentDay].exercises"
        :key="ex.id"
        class="exercise-card"
        :class="{ done: currentSession.exercises?.[ex.id]?.done }"
        :id="`excard-${ex.id}`"
      >
        <div class="exercise-top" @click="emit('toggle-exercise', ex.id)">
          <div class="ex-checkbox">
            {{ currentSession.exercises?.[ex.id]?.done ? '✓' : '' }}
          </div>
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
              @input="emit('save-ex-input', ex.id, 'weight', $event.target.value)"
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
              @input="emit('save-ex-input', ex.id, 'reps', $event.target.value)"
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
              @input="emit('save-ex-input', ex.id, 'sets', $event.target.value)"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      class="cardio-card"
      :class="{ done: currentSession.cardio }"
      id="cardioCard"
      style="margin-top: 12px"
      @click="emit('toggle-cardio')"
    >
      <span class="cardio-icon">{{ days[currentDay].cardio.icon }}</span>
      <div class="cardio-info">
        <div class="cardio-title">{{ days[currentDay].cardio.name }}</div>
        <div class="cardio-desc">{{ days[currentDay].cardio.desc }}</div>
      </div>
      <div class="cardio-checkbox">{{ currentSession.cardio ? '✓' : '' }}</div>
    </div>

    <div class="notes-area" style="margin-top: 16px">
      <textarea
        class="notes-textarea"
        placeholder="Catatan hari ini... (opsional)"
        :value="currentSession.notes"
        @input="emit('save-notes', $event.target.value)"
      ></textarea>
    </div>
  </div>
</template>
