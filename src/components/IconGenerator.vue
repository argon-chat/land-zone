<template>
  <div class="flex flex-col lg:flex-row gap-8 items-start">
    <!-- Preview -->
    <div class="flex-1 flex flex-col items-center gap-6 w-full">
      <!-- Main preview -->
      <div class="relative group">
        <div class="absolute -inset-4 rounded-3xl bg-accent/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <canvas
          ref="canvasRef"
          :width="canvasSize"
          :height="canvasSize"
          class="relative rounded-[28px] border border-oled-border shadow-2xl shadow-black/40"
          :style="{ width: previewSize + 'px', height: previewSize + 'px' }"
        />
      </div>

      <!-- Size previews -->
      <div class="flex items-end gap-4">
        <div v-for="s in [128, 64, 32, 16]" :key="s" class="flex flex-col items-center gap-1.5">
          <canvas
            :ref="(el) => { if (el) thumbRefs[s] = el as HTMLCanvasElement }"
            :width="s"
            :height="s"
            class="rounded-lg border border-oled-border-subtle"
            :style="{ width: s + 'px', height: s + 'px' }"
          />
          <span class="text-[10px] text-text-faint font-mono">{{ s }}px</span>
        </div>
      </div>

      <!-- Download buttons -->
      <div class="flex flex-wrap gap-2 justify-center">
        <button
          v-for="s in exportSizes"
          :key="s"
          @click="download(s)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-oled-border hover:border-accent/40 hover:bg-accent/5 text-text-secondary hover:text-accent transition-all cursor-pointer"
        >
          <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          {{ s }}×{{ s }}
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="w-full lg:w-80 flex flex-col gap-5">
      <!-- Presets -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Presets</legend>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="(p, i) in presets"
            :key="i"
            @click="applyPreset(p)"
            :class="[
              'relative w-full aspect-square rounded-xl border-2 transition-all cursor-pointer overflow-hidden group',
              activePresetIdx === i ? 'border-accent scale-105 shadow-lg shadow-accent/20' : 'border-oled-border hover:border-oled-hover'
            ]"
            :title="p.name"
          >
            <div class="absolute inset-0" :style="presetBgStyle(p)"></div>
            <!-- Mini cat silhouette preview -->
            <div class="absolute inset-0 flex items-center justify-center">
              <svg class="w-[55%] h-[55%]" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                <path :fill="p.logo" d="M114.54,88.82c5.35-2.75,9.96-6.72,13.46-11.53c-4.67-3.14-9.86-5.56-15.4-7.09c0.01-24.5-6.29-48.6-18.25-69.73c-7.96,8.45-14.3,18.49-18.62,29.31c-7.66-1.22-15.65-1.06-23.27,0.31C48.13,19.15,41.74,9.02,33.71,0.47C21.76,21.62,15.45,45.7,15.46,70.2c-5.54,1.53-10.73,3.95-15.4,7.09c3.49,4.82,8.1,8.78,13.46,11.53c-3.64,2.85-6.74,6.37-9.14,10.33c5.87,4.32,12.67,7.48,20.05,9.09c19.68,25.4,59.51,25.41,79.2,0c7.38-1.61,14.18-4.78,20.05-9.09C121.28,95.19,118.18,91.68,114.54,88.82z M23.7,68.22c0,0,4.13-2.07,12.4-2.07c8.27,0,19.64,11.37,19.64,11.37s-8.27,6.2-19.64,9.3C32.11,87.91,26.8,77.52,23.7,68.22z M64,98.19c-5.71,0-10.33-4.13-10.33-12.4c1.04-0.35,2.16-0.62,3.3-0.85l3,6.02l1.21-6.61c1.9-0.14,3.84-0.14,5.75,0.01l1.22,6.65l3.01-6.05c1.1,0.23,2.17,0.49,3.18,0.82C74.33,94.05,69.71,98.19,64,98.19z M92.99,86.03c-11.37-3.1-19.63-9.3-19.63-9.3s11.37-11.37,19.63-11.37s12.4,2.07,12.4,2.07C102.29,76.73,96.98,87.12,92.99,86.03z"/>
              </svg>
            </div>
            <!-- Name tooltip on hover -->
            <div class="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{{ p.name }}</div>
          </button>
        </div>
      </fieldset>

      <!-- Divider -->
      <div class="flex items-center gap-2">
        <div class="flex-1 h-px bg-oled-border"></div>
        <span class="text-[10px] text-text-faint uppercase tracking-wider">Advanced</span>
        <div class="flex-1 h-px bg-oled-border"></div>
      </div>

      <!-- Shape -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Shape</legend>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="opt in shapes"
            :key="opt.value"
            @click="shape = opt.value"
            :class="[
              'flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer',
              shape === opt.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-oled-border text-text-muted hover:border-oled-hover hover:text-text-secondary'
            ]"
          >
            <div :class="['w-6 h-6 bg-current opacity-40', opt.cls]"></div>
            {{ opt.label }}
          </button>
        </div>
      </fieldset>

      <!-- Background -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Background</legend>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="bg in backgrounds"
            :key="bg.label"
            @click="selectedBg = bg"
            :class="[
              'relative w-full aspect-square rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
              selectedBg.label === bg.label ? 'border-accent scale-105 shadow-lg shadow-accent/20' : 'border-oled-border hover:border-oled-hover'
            ]"
          >
            <div class="absolute inset-0" :style="bgPreviewStyle(bg)"></div>
          </button>
        </div>
      </fieldset>

      <!-- Custom colors -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Custom Colors</legend>
        <div class="flex gap-3">
          <label class="flex items-center gap-2 text-xs text-text-secondary">
            <span>BG</span>
            <input type="color" v-model="customBgColor" class="w-8 h-8 rounded-lg border border-oled-border cursor-pointer bg-transparent" />
          </label>
          <label class="flex items-center gap-2 text-xs text-text-secondary">
            <span>Logo</span>
            <input type="color" v-model="logoColor" class="w-8 h-8 rounded-lg border border-oled-border cursor-pointer bg-transparent" />
          </label>
        </div>
      </fieldset>

      <!-- Logo scale -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
          Logo Size <span class="text-text-faint font-mono">{{ Math.round(logoScale * 100) }}%</span>
        </legend>
        <input type="range" v-model.number="logoScale" min="0.3" max="0.95" step="0.01" class="w-full accent-accent" />
      </fieldset>

      <!-- Padding -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
          Padding <span class="text-text-faint font-mono">{{ Math.round(padding * 100) }}%</span>
        </legend>
        <input type="range" v-model.number="padding" min="0" max="0.35" step="0.01" class="w-full accent-accent" />
      </fieldset>

      <!-- Glow -->
      <fieldset>
        <div class="flex items-center gap-2 mb-2">
          <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Glow Effect</legend>
          <button
            @click="glow = !glow"
            :class="[
              'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
              glow ? 'bg-accent' : 'bg-oled-border'
            ]"
          >
            <div
              :class="[
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                glow ? 'translate-x-4' : 'translate-x-0.5'
              ]"
            ></div>
          </button>
        </div>
      </fieldset>

      <!-- Noise texture -->
      <fieldset>
        <div class="flex items-center gap-2">
          <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Noise Texture</legend>
          <button
            @click="noise = !noise"
            :class="[
              'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
              noise ? 'bg-accent' : 'bg-oled-border'
            ]"
          >
            <div
              :class="[
                'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                noise ? 'translate-x-4' : 'translate-x-0.5'
              ]"
            ></div>
          </button>
        </div>
      </fieldset>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, nextTick } from 'vue';

const canvasSize = 1024;
const previewSize = 280;
const exportSizes = [1024, 512, 256, 128, 64, 32];

const canvasRef = ref<HTMLCanvasElement | null>(null);
const thumbRefs = reactive<Record<number, HTMLCanvasElement>>({});

// Options
const shape = ref<'circle' | 'rounded' | 'square'>('rounded');
const logoColor = ref('#8b5cf6');
const customBgColor = ref('#0e0e0e');
const logoScale = ref(0.6);
const padding = ref(0.1);
const glow = ref(true);
const noise = ref(false);

const shapes = [
  { value: 'circle' as const, label: 'Circle', cls: 'rounded-full' },
  { value: 'rounded' as const, label: 'Rounded', cls: 'rounded-lg' },
  { value: 'square' as const, label: 'Square', cls: 'rounded-none' },
];

interface BgDef {
  label: string;
  type: 'solid' | 'gradient' | 'custom';
  colors?: string[];
  angle?: number;
}

const backgrounds: BgDef[] = [
  { label: 'Dark', type: 'solid', colors: ['#0e0e0e'] },
  { label: 'Black', type: 'solid', colors: ['#000000'] },
  { label: 'Violet', type: 'gradient', colors: ['#4c1d95', '#7c3aed'], angle: 135 },
  { label: 'Sunset', type: 'gradient', colors: ['#7c3aed', '#ec4899'], angle: 135 },
  { label: 'Ocean', type: 'gradient', colors: ['#0e7490', '#8b5cf6'], angle: 135 },
  { label: 'Emerald', type: 'gradient', colors: ['#065f46', '#34d399'], angle: 135 },
  { label: 'Fire', type: 'gradient', colors: ['#9a3412', '#f59e0b'], angle: 135 },
  { label: 'Custom', type: 'custom' },
];

const selectedBg = ref<BgDef>(backgrounds[0]);

// ── Presets: curated bg + logo color combos ──
interface Preset {
  name: string;
  logo: string;
  bg: BgDef;
  glow?: boolean;
}

const presets: Preset[] = [
  // Dark backgrounds
  { name: 'Classic', logo: '#8b5cf6', bg: { label: 'Dark', type: 'solid', colors: ['#0e0e0e'] }, glow: true },
  { name: 'White on Black', logo: '#ffffff', bg: { label: 'Black', type: 'solid', colors: ['#000000'] } },
  { name: 'Neon Violet', logo: '#c084fc', bg: { label: 'Black', type: 'solid', colors: ['#0a0a0a'] }, glow: true },
  { name: 'Cyan Glow', logo: '#22d3ee', bg: { label: 'Dark', type: 'solid', colors: ['#0e0e0e'] }, glow: true },
  // Gradient backgrounds
  { name: 'Violet Fade', logo: '#ffffff', bg: { label: 'Violet', type: 'gradient', colors: ['#4c1d95', '#7c3aed'], angle: 135 } },
  { name: 'Sunset', logo: '#ffffff', bg: { label: 'Sunset', type: 'gradient', colors: ['#7c3aed', '#ec4899'], angle: 135 } },
  { name: 'Ocean', logo: '#ffffff', bg: { label: 'Ocean', type: 'gradient', colors: ['#0e7490', '#8b5cf6'], angle: 135 } },
  { name: 'Emerald', logo: '#ffffff', bg: { label: 'Emerald', type: 'gradient', colors: ['#065f46', '#34d399'], angle: 135 } },
  // Colored backgrounds
  { name: 'Mono Purple', logo: '#1a0533', bg: { label: 'L-Purple', type: 'solid', colors: ['#c4b5fd'] } },
  { name: 'Mint', logo: '#064e3b', bg: { label: 'L-Mint', type: 'solid', colors: ['#a7f3d0'] } },
  { name: 'Fire', logo: '#ffffff', bg: { label: 'Fire', type: 'gradient', colors: ['#9a3412', '#f59e0b'], angle: 135 } },
  { name: 'Ghost', logo: '#a1a1aa', bg: { label: 'Zinc', type: 'solid', colors: ['#18181b'] } },
];

const activePresetIdx = ref(0);

function applyPreset(p: Preset) {
  activePresetIdx.value = presets.indexOf(p);
  logoColor.value = p.logo;
  selectedBg.value = p.bg;
  if (p.bg.type === 'solid' && p.bg.colors?.[0]) {
    customBgColor.value = p.bg.colors[0];
  }
  glow.value = p.glow ?? false;
}

function presetBgStyle(p: Preset) {
  const bg = p.bg;
  if (bg.type === 'gradient' && bg.colors) {
    return { background: `linear-gradient(${bg.angle ?? 135}deg, ${bg.colors.join(', ')})` };
  }
  return { background: bg.colors?.[0] ?? '#0e0e0e' };
}

function bgPreviewStyle(bg: BgDef) {
  if (bg.type === 'custom') {
    return { background: customBgColor.value };
  }
  if (bg.type === 'gradient' && bg.colors) {
    return { background: `linear-gradient(${bg.angle ?? 135}deg, ${bg.colors.join(', ')})` };
  }
  return { background: bg.colors?.[0] ?? '#0e0e0e' };
}

// Cat SVG path - created lazily on client only
let catPath: Path2D | null = null;
function getCatPath() {
  if (!catPath) {
    catPath = new Path2D('M114.54,88.82c5.35-2.75,9.96-6.72,13.46-11.53c-4.67-3.14-9.86-5.56-15.4-7.09c0.01-24.5-6.29-48.6-18.25-69.73c-7.96,8.45-14.3,18.49-18.62,29.31c-7.66-1.22-15.65-1.06-23.27,0.31C48.13,19.15,41.74,9.02,33.71,0.47C21.76,21.62,15.45,45.7,15.46,70.2c-5.54,1.53-10.73,3.95-15.4,7.09c3.49,4.82,8.1,8.78,13.46,11.53c-3.64,2.85-6.74,6.37-9.14,10.33c5.87,4.32,12.67,7.48,20.05,9.09c19.68,25.4,59.51,25.41,79.2,0c7.38-1.61,14.18-4.78,20.05-9.09C121.28,95.19,118.18,91.68,114.54,88.82z M23.7,68.22c0,0,4.13-2.07,12.4-2.07c8.27,0,19.64,11.37,19.64,11.37s-8.27,6.2-19.64,9.3C32.11,87.91,26.8,77.52,23.7,68.22z M64,98.19c-5.71,0-10.33-4.13-10.33-12.4c1.04-0.35,2.16-0.62,3.3-0.85l3,6.02l1.21-6.61c1.9-0.14,3.84-0.14,5.75,0.01l1.22,6.65l3.01-6.05c1.1,0.23,2.17,0.49,3.18,0.82C74.33,94.05,69.71,98.19,64,98.19z M92.99,86.03c-11.37-3.1-19.63-9.3-19.63-9.3s11.37-11.37,19.63-11.37s12.4,2.07,12.4,2.07C102.29,76.73,96.98,87.12,92.99,86.03z');
  }
  return catPath;
}

function drawToCanvas(canvas: HTMLCanvasElement, size: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Clip shape
  ctx.save();
  if (shape.value === 'circle') {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape.value === 'rounded') {
    const r = size * 0.18;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, r);
    ctx.clip();
  }

  // Background
  const bg = selectedBg.value;
  if (bg.type === 'gradient' && bg.colors) {
    const rad = (bg.angle ?? 135) * Math.PI / 180;
    const cx = size / 2, cy = size / 2;
    const dx = Math.cos(rad) * size / 2, dy = Math.sin(rad) * size / 2;
    const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    bg.colors.forEach((c, i) => grad.addColorStop(i / (bg.colors!.length - 1), c));
    ctx.fillStyle = grad;
  } else if (bg.type === 'custom') {
    ctx.fillStyle = customBgColor.value;
  } else {
    ctx.fillStyle = bg.colors?.[0] ?? '#0e0e0e';
  }
  ctx.fillRect(0, 0, size, size);

  // Noise
  if (noise.value) {
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Glow
  if (glow.value) {
    const glowGrad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.5);
    glowGrad.addColorStop(0, logoColor.value + '30');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, size, size);
  }

  // Draw cat logo
  const pad = size * padding.value;
  const available = size - pad * 2;
  const logoSz = available * logoScale.value;
  const offset = (size - logoSz) / 2;

  ctx.save();
  ctx.translate(offset, offset);
  ctx.scale(logoSz / 128, logoSz / 128);
  ctx.fillStyle = logoColor.value;
  ctx.fill(getCatPath());
  ctx.restore();

  ctx.restore();
}

function render() {
  if (canvasRef.value) {
    drawToCanvas(canvasRef.value, canvasSize);
  }
  for (const [s, el] of Object.entries(thumbRefs)) {
    drawToCanvas(el, Number(s));
  }
}

function download(size: number) {
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  drawToCanvas(offscreen, size);
  const a = document.createElement('a');
  a.download = `argon-${shape.value}-${size}x${size}.png`;
  a.href = offscreen.toDataURL('image/png');
  a.click();
}

watch([shape, selectedBg, customBgColor, logoColor, logoScale, padding, glow, noise], () => {
  activePresetIdx.value = -1;
  nextTick(render);
}, { deep: true });

onMounted(() => {
  nextTick(render);
});
</script>
