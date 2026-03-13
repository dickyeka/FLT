<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const props = defineProps({
  weightDate: { type: String, required: true },
  weightVal: { type: [String, Number], required: true },
  weights: { type: Array, required: true },
  targetBarWidth: { type: Number, required: true },
  targetLabel: { type: String, required: true },
  formatDate: { type: Function, required: true },
  weightDiffText: { type: Function, required: true },
  weightDiffClass: { type: Function, required: true },
  active: { type: Boolean, required: true },
});

const emit = defineEmits([
  "update:weightDate",
  "update:weightVal",
  "log-weight",
  "delete-weight",
]);

const chartCanvas = ref(null);
let chartInstance = null;

function renderChart() {
  if (!props.active) return;
  if (!chartCanvas.value || chartCanvas.value.offsetParent === null) return;
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (props.weights.length < 2) return;

  const labels = props.weights.map((w) => props.formatDate(w.date));
  const data = props.weights.map((w) => w.weight);

  chartInstance = new Chart(chartCanvas.value, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Berat (kg)",
          data,
          borderColor: "#00e5ff",
          backgroundColor: "rgba(0,229,255,0.2)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: "#00e5ff",
          pointBorderColor: "#080c10",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: "#7a8fa0", font: { family: "JetBrains Mono", size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: "#7a8fa0", font: { family: "JetBrains Mono", size: 10 } },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });
}

watch(
  () => props.weights,
  () => nextTick(renderChart),
  { deep: true },
);

watch(
  () => props.active,
  (val) => {
    if (val) nextTick(renderChart);
  },
);

onMounted(() => {
  renderChart();
});

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy();
});
</script>

<template>
  <div class="weight-form">
    <div class="wf-title">📥 Catat Berat Badan</div>
    <div class="wf-row">
      <div class="wf-group">
        <label class="wf-label">Tanggal</label>
        <input
          type="date"
          class="wf-input"
          :value="weightDate"
          @input="emit('update:weightDate', $event.target.value)"
          style="font-size: 14px; font-weight: 500"
        />
      </div>
      <div class="wf-group">
        <label class="wf-label">Berat (kg)</label>
        <input
          type="number"
          class="wf-input"
          :value="weightVal"
          placeholder="68.0"
          step="0.1"
          min="30"
          max="200"
          @input="emit('update:weightVal', $event.target.value)"
        />
      </div>
      <button class="btn-log" @click="emit('log-weight')">+ Catat</button>
    </div>
  </div>

  <div class="chart-box">
    <div class="chart-title">📈 Grafik Berat Badan</div>
    <div class="weight-chart">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div
      v-if="weights.length < 2"
      id="chartEmpty"
      style="
        text-align: center;
        color: var(--muted2);
        padding: 40px 0;
        font-size: 13px;
      "
    >
      Belum ada data. Mulai catat berat badanmu! ↑
    </div>
  </div>

  <div
    style="
      background: var(--s1);
      border: 1px solid var(--border);
      border-radius: var(--r2);
      padding: 24px;
      margin-bottom: 24px;
    "
  >
    <div
      style="
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 12px;
        color: var(--muted2);
      "
    >
      <span>Target: <strong style="color: var(--text)">60 kg</strong></span>
      <span id="targetRemain">{{ targetLabel }}</span>
    </div>
    <div
      style="
        height: 8px;
        background: var(--s3);
        border-radius: 99px;
        overflow: hidden;
      "
    >
      <div
        id="targetBar"
        :style="{ width: `${targetBarWidth}%` }"
        style="
          height: 100%;
          background: linear-gradient(90deg, var(--orange), var(--accent));
          border-radius: 99px;
          transition: width 1s ease;
        "
      ></div>
    </div>
    <div
      style="
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        font-size: 10px;
        color: var(--muted);
      "
    >
      <span>60 kg</span>
      <span>Start: 68 kg</span>
    </div>
  </div>

  <div class="sec-title">
    <div class="sec-divider"></div>
    Riwayat Berat
  </div>
  <div class="weight-history" id="weightHistory">
    <div
      v-if="!weights.length"
      style="
        text-align: center;
        color: var(--muted2);
        padding: 32px;
        font-size: 13px;
      "
    >
      Belum ada catatan berat badan.
    </div>
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
        <button class="btn-del" @click="emit('delete-weight', w.date)" title="Hapus">
          ✕
        </button>
      </div>
    </div>
  </div>
</template>
