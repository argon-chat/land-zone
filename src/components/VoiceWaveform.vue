<template>
  <div class="vu-meter" ref="barsRef">
    <div class="vu-track">
      <div
        class="vu-fill"
        :style="{ width: active ? level + '%' : '0%' }"
      ></div>
      <div class="vu-fill-glow" :style="{ width: active ? level + '%' : '0%' }"></div>
    </div>
    <div class="vu-bars">
      <div
        v-for="(bar, i) in bars"
        :key="i"
        class="vu-bar"
        :style="{
          height: active ? bar.height + 'px' : '2px',
          opacity: active ? bar.opacity : 0.15,
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const barsRef = ref<HTMLElement>();
const active = ref(false);
const level = ref(0);

const bars = ref(Array.from({ length: 32 }, () => ({ height: 2, opacity: 0.15 })));

let interval: ReturnType<typeof setInterval> | null = null;
let observer: IntersectionObserver | null = null;

function animate() {
  const t = Date.now() / 1000;
  // Simulate voice activity with natural variation
  const base = 0.4 + 0.3 * Math.sin(t * 2.1) + 0.2 * Math.sin(t * 5.3);
  const burst = Math.random() > 0.85 ? Math.random() * 0.3 : 0;
  const rawLevel = Math.max(0, Math.min(1, base + burst));
  level.value = rawLevel * 85;

  bars.value = bars.value.map((_, i) => {
    const phase = Math.sin(t * 3 + i * 0.4) * 0.5 + 0.5;
    const h = 2 + rawLevel * phase * 24;
    return {
      height: h,
      opacity: 0.2 + rawLevel * phase * 0.8,
    };
  });
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !active.value) {
          active.value = true;
          interval = setInterval(animate, 50);
        }
      });
    },
    { threshold: 0.3 }
  );
  if (barsRef.value) observer.observe(barsRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
  if (interval) clearInterval(interval);
});
</script>

<style scoped>
.vu-meter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vu-track {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: var(--color-oled-elevated);
  overflow: hidden;
}

.vu-fill {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
  transition: width 0.08s linear;
}

.vu-fill-glow {
  position: absolute;
  inset: -2px 0;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(34,197,94,0.3), rgba(234,179,8,0.3), rgba(239,68,68,0.3));
  filter: blur(4px);
  transition: width 0.08s linear;
}

.vu-bars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 28px;
}

.vu-bar {
  width: 2px;
  border-radius: 1px;
  background: var(--color-accent);
  transition: height 0.08s ease, opacity 0.08s ease;
}
</style>
