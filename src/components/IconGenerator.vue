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
    <div class="w-full lg:w-80 flex flex-col gap-5 max-h-[85vh] overflow-y-auto pr-1">
      <!-- Preset Categories -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Presets</legend>
        <!-- Category tabs -->
        <div class="flex gap-1 mb-3 flex-wrap">
          <button
            v-for="cat in presetCategories"
            :key="cat"
            @click="activeCategory = cat"
            :class="[
              'px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer',
              activeCategory === cat ? 'bg-accent/15 text-accent border border-accent/30' : 'text-text-faint hover:text-text-muted border border-transparent'
            ]"
          >{{ cat }}</button>
        </div>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="(p, i) in filteredPresets"
            :key="p.name"
            @click="applyPreset(p)"
            :class="[
              'relative w-full aspect-square rounded-xl border-2 transition-all cursor-pointer overflow-hidden group',
              activePresetName === p.name ? 'border-accent scale-105 shadow-lg shadow-accent/20' : 'border-oled-border hover:border-oled-hover'
            ]"
            :title="p.name"
          >
            <div class="absolute inset-0" :style="presetBgStyle(p)"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <svg class="w-[55%] h-[55%]" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
                <path :fill="p.logo" d="M114.54,88.82c5.35-2.75,9.96-6.72,13.46-11.53c-4.67-3.14-9.86-5.56-15.4-7.09c0.01-24.5-6.29-48.6-18.25-69.73c-7.96,8.45-14.3,18.49-18.62,29.31c-7.66-1.22-15.65-1.06-23.27,0.31C48.13,19.15,41.74,9.02,33.71,0.47C21.76,21.62,15.45,45.7,15.46,70.2c-5.54,1.53-10.73,3.95-15.4,7.09c3.49,4.82,8.1,8.78,13.46,11.53c-3.64,2.85-6.74,6.37-9.14,10.33c5.87,4.32,12.67,7.48,20.05,9.09c19.68,25.4,59.51,25.41,79.2,0c7.38-1.61,14.18-4.78,20.05-9.09C121.28,95.19,118.18,91.68,114.54,88.82z M23.7,68.22c0,0,4.13-2.07,12.4-2.07c8.27,0,19.64,11.37,19.64,11.37s-8.27,6.2-19.64,9.3C32.11,87.91,26.8,77.52,23.7,68.22z M64,98.19c-5.71,0-10.33-4.13-10.33-12.4c1.04-0.35,2.16-0.62,3.3-0.85l3,6.02l1.21-6.61c1.9-0.14,3.84-0.14,5.75,0.01l1.22,6.65l3.01-6.05c1.1,0.23,2.17,0.49,3.18,0.82C74.33,94.05,69.71,98.19,64,98.19z M92.99,86.03c-11.37-3.1-19.63-9.3-19.63-9.3s11.37-11.37,19.63-11.37s12.4,2.07,12.4,2.07C102.29,76.73,96.98,87.12,92.99,86.03z"/>
              </svg>
            </div>
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
        <div class="grid grid-cols-5 gap-2">
          <button
            v-for="bg in backgrounds"
            :key="bg.label"
            @click="selectedBg = bg"
            :class="[
              'relative w-full aspect-square rounded-xl border-2 transition-all cursor-pointer overflow-hidden',
              selectedBg.label === bg.label ? 'border-accent scale-105 shadow-lg shadow-accent/20' : 'border-oled-border hover:border-oled-hover'
            ]"
            :title="bg.label"
          >
            <div class="absolute inset-0" :style="bgPreviewStyle(bg)"></div>
          </button>
        </div>
      </fieldset>

      <!-- Logo Effect -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Logo Effect</legend>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="eff in logoEffects"
            :key="eff.value"
            @click="logoEffect = eff.value"
            :class="[
              'flex flex-col items-center gap-1 py-2 px-1.5 rounded-xl border text-[10px] font-medium transition-all cursor-pointer',
              logoEffect === eff.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-oled-border text-text-muted hover:border-oled-hover hover:text-text-secondary'
            ]"
          >
            <span class="text-sm">{{ eff.icon }}</span>
            {{ eff.label }}
          </button>
        </div>
      </fieldset>

      <!-- Overlay -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Overlay Elements</legend>
        <div class="grid grid-cols-3 gap-2 mb-3">
          <button
            v-for="ov in overlayTypes"
            :key="ov.value"
            @click="overlayType = ov.value"
            :class="[
              'flex flex-col items-center gap-1 py-2 px-1.5 rounded-xl border text-[10px] font-medium transition-all cursor-pointer',
              overlayType === ov.value
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-oled-border text-text-muted hover:border-oled-hover hover:text-text-secondary'
            ]"
          >
            <span class="text-sm">{{ ov.icon }}</span>
            {{ ov.label }}
          </button>
        </div>
        <div v-if="overlayType !== 'none'" class="space-y-2">
          <div>
            <span class="text-[10px] text-text-faint">Density <span class="font-mono">{{ overlayDensity }}</span></span>
            <input type="range" v-model.number="overlayDensity" min="3" max="20" step="1" class="w-full accent-accent" />
          </div>
          <div>
            <span class="text-[10px] text-text-faint">Size <span class="font-mono">{{ Math.round(overlaySize * 100) }}%</span></span>
            <input type="range" v-model.number="overlaySize" min="0.02" max="0.12" step="0.005" class="w-full accent-accent" />
          </div>
          <div>
            <span class="text-[10px] text-text-faint">Opacity <span class="font-mono">{{ Math.round(overlayOpacity * 100) }}%</span></span>
            <input type="range" v-model.number="overlayOpacity" min="0.1" max="1.0" step="0.05" class="w-full accent-accent" />
          </div>
        </div>
      </fieldset>

      <!-- Custom colors -->
      <fieldset>
        <legend class="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Custom Colors</legend>
        <div class="flex gap-3 flex-wrap">
          <label class="flex items-center gap-2 text-xs text-text-secondary">
            <span>BG</span>
            <input type="color" v-model="customBgColor" class="w-8 h-8 rounded-lg border border-oled-border cursor-pointer bg-transparent" />
          </label>
          <label class="flex items-center gap-2 text-xs text-text-secondary">
            <span>Logo</span>
            <input type="color" v-model="logoColor" class="w-8 h-8 rounded-lg border border-oled-border cursor-pointer bg-transparent" />
          </label>
          <label class="flex items-center gap-2 text-xs text-text-secondary">
            <span>2nd</span>
            <input type="color" v-model="logoColor2" class="w-8 h-8 rounded-lg border border-oled-border cursor-pointer bg-transparent" />
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
import { ref, reactive, watch, onMounted, nextTick, computed } from 'vue';

const canvasSize = 1024;
const previewSize = 280;
const exportSizes = [1024, 512, 256, 128, 64, 32];

const canvasRef = ref<HTMLCanvasElement | null>(null);
const thumbRefs = reactive<Record<number, HTMLCanvasElement>>({});

// ── Options ──
const shape = ref<'circle' | 'rounded' | 'square'>('rounded');
const logoColor = ref('#8b5cf6');
const logoColor2 = ref('#ec4899');
const customBgColor = ref('#0e0e0e');
const logoScale = ref(0.8);
const padding = ref(0.08);
const glow = ref(true);
const noise = ref(false);
const logoEffect = ref<LogoEffect>('none');
const overlayType = ref<OverlayType>('none');
const overlayDensity = ref(10);
const overlaySize = ref(0.07);
const overlayOpacity = ref(0.75);

const shapes = [
  { value: 'circle' as const, label: 'Circle', cls: 'rounded-full' },
  { value: 'rounded' as const, label: 'Rounded', cls: 'rounded-lg' },
  { value: 'square' as const, label: 'Square', cls: 'rounded-none' },
];

// ── Types ──
type LogoEffect = 'none' | 'gradient' | 'metallic' | 'holographic' | 'neon' | 'glass' | 'outline' | 'emboss' | 'duotone';
type OverlayType = 'none' | 'sparkles' | 'sakura' | 'hearts' | 'stars' | 'rings' | 'bubbles' | 'diamonds' | 'geometric';

interface BgDef {
  label: string;
  type: 'solid' | 'gradient' | 'custom' | 'mesh' | 'conic' | 'radial' | 'aurora';
  colors?: string[];
  angle?: number;
}

// ── Logo Effects ──
const logoEffects: { value: LogoEffect; label: string; icon: string }[] = [
  { value: 'none', label: 'Solid', icon: '■' },
  { value: 'gradient', label: 'Gradient', icon: '◐' },
  { value: 'metallic', label: 'Metallic', icon: '✦' },
  { value: 'holographic', label: 'Holo', icon: '🌈' },
  { value: 'neon', label: 'Neon', icon: '💡' },
  { value: 'glass', label: 'Glass', icon: '🧊' },
  { value: 'outline', label: 'Outline', icon: '○' },
  { value: 'emboss', label: 'Emboss', icon: '🔲' },
  { value: 'duotone', label: 'Duotone', icon: '◑' },
];

// ── Overlay Types ──
const overlayTypes: { value: OverlayType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '✕' },
  { value: 'sparkles', label: 'Sparkles', icon: '✨' },
  { value: 'sakura', label: 'Sakura', icon: '🌸' },
  { value: 'hearts', label: 'Hearts', icon: '💖' },
  { value: 'stars', label: 'Stars', icon: '⭐' },
  { value: 'rings', label: 'Rings', icon: '◎' },
  { value: 'bubbles', label: 'Bubbles', icon: '🫧' },
  { value: 'diamonds', label: 'Diamonds', icon: '💎' },
  { value: 'geometric', label: 'Geo', icon: '⬡' },
];

// ── Backgrounds ──
const backgrounds: BgDef[] = [
  { label: 'Dark', type: 'solid', colors: ['#0e0e0e'] },
  { label: 'Black', type: 'solid', colors: ['#000000'] },
  { label: 'Violet', type: 'gradient', colors: ['#4c1d95', '#7c3aed'], angle: 135 },
  { label: 'Sunset', type: 'gradient', colors: ['#7c3aed', '#ec4899'], angle: 135 },
  { label: 'Ocean', type: 'gradient', colors: ['#0e7490', '#8b5cf6'], angle: 135 },
  { label: 'Emerald', type: 'gradient', colors: ['#065f46', '#34d399'], angle: 135 },
  { label: 'Fire', type: 'gradient', colors: ['#9a3412', '#f59e0b'], angle: 135 },
  { label: 'Cotton Candy', type: 'gradient', colors: ['#f9a8d4', '#c4b5fd', '#93c5fd'], angle: 135 },
  { label: 'Holographic', type: 'conic', colors: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'] },
  { label: 'Aurora', type: 'aurora', colors: ['#064e3b', '#0d9488', '#8b5cf6', '#1e1b4b'] },
  { label: 'Mesh Violet', type: 'mesh', colors: ['#4c1d95', '#ec4899', '#8b5cf6', '#3b0764'] },
  { label: 'Mesh Pastel', type: 'mesh', colors: ['#fecdd3', '#c4b5fd', '#a7f3d0', '#fef3c7'] },
  { label: 'Sakura', type: 'radial', colors: ['#fce7f3', '#fbcfe8', '#f9a8d4'] },
  { label: 'Midnight Gold', type: 'radial', colors: ['#1c1917', '#44403c', '#d97706'] },
  { label: 'Ice Crystal', type: 'conic', colors: ['#ecfeff', '#a5f3fc', '#67e8f9', '#22d3ee', '#a5f3fc', '#ecfeff'] },
  { label: 'Deep Space', type: 'radial', colors: ['#0f0520', '#1e1b4b', '#312e81'] },
  { label: 'UwU Pink', type: 'gradient', colors: ['#ff6b9d', '#ff8ec4', '#ffb3d9'], angle: 160 },
  { label: 'Pastel Dream', type: 'mesh', colors: ['#e9d5ff', '#fecdd3', '#ccfbf1', '#fef9c3'] },
  { label: 'Vaporwave', type: 'gradient', colors: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'], angle: 135 },
  { label: 'Custom', type: 'custom' },
];

const selectedBg = ref<BgDef>(backgrounds[0]);

// ── Preset system ──
interface Preset {
  name: string;
  category: string;
  logo: string;
  logo2?: string;
  bg: BgDef;
  glow?: boolean;
  noise?: boolean;
  effect?: LogoEffect;
  overlay?: OverlayType;
  overlayDensity?: number;
  overlaySize?: number;
  overlayOpacity?: number;
}

const presetCategories = ['All', 'Classic', 'Premium', 'Kawaii', 'Luxury'];
const activeCategory = ref('All');

const presets: Preset[] = [
  // ── Classic ──
  { name: 'Classic', category: 'Classic', logo: '#8b5cf6', logo2: '#7c3aed', bg: { label: 'Dark', type: 'solid', colors: ['#0e0e0e'] }, glow: true, effect: 'neon' },
  { name: 'White on Black', category: 'Classic', logo: '#ffffff', logo2: '#e5e7eb', bg: { label: 'Black', type: 'solid', colors: ['#000000'] }, effect: 'emboss' },
  { name: 'Neon Violet', category: 'Classic', logo: '#c084fc', logo2: '#a855f7', bg: { label: 'Black', type: 'solid', colors: ['#0a0a0a'] }, glow: true, effect: 'neon', overlay: 'sparkles', overlayDensity: 6, overlaySize: 0.05, overlayOpacity: 0.5 },
  { name: 'Cyan Glow', category: 'Classic', logo: '#22d3ee', logo2: '#06b6d4', bg: { label: 'Dark', type: 'solid', colors: ['#0e0e0e'] }, glow: true, effect: 'neon', overlay: 'sparkles', overlayDensity: 6, overlaySize: 0.04, overlayOpacity: 0.4 },
  { name: 'Violet Fade', category: 'Classic', logo: '#ffffff', logo2: '#e9d5ff', bg: { label: 'Violet', type: 'gradient', colors: ['#4c1d95', '#7c3aed'], angle: 135 }, effect: 'glass' },
  { name: 'Sunset', category: 'Classic', logo: '#ffffff', logo2: '#fecdd3', bg: { label: 'Sunset', type: 'gradient', colors: ['#7c3aed', '#ec4899'], angle: 135 }, effect: 'glass' },
  { name: 'Ocean', category: 'Classic', logo: '#ffffff', logo2: '#a5f3fc', bg: { label: 'Ocean', type: 'gradient', colors: ['#0e7490', '#8b5cf6'], angle: 135 }, effect: 'glass' },
  { name: 'Emerald', category: 'Classic', logo: '#ffffff', logo2: '#a7f3d0', bg: { label: 'Emerald', type: 'gradient', colors: ['#065f46', '#34d399'], angle: 135 }, effect: 'glass' },
  { name: 'Mono Purple', category: 'Classic', logo: '#1a0533', logo2: '#3b0764', bg: { label: 'L-Purple', type: 'solid', colors: ['#c4b5fd'] }, effect: 'emboss' },
  { name: 'Mint', category: 'Classic', logo: '#064e3b', logo2: '#065f46', bg: { label: 'L-Mint', type: 'solid', colors: ['#a7f3d0'] }, effect: 'emboss' },
  { name: 'Fire', category: 'Classic', logo: '#ffffff', logo2: '#fde68a', bg: { label: 'Fire', type: 'gradient', colors: ['#9a3412', '#f59e0b'], angle: 135 }, effect: 'glass', overlay: 'sparkles', overlayDensity: 6, overlaySize: 0.05, overlayOpacity: 0.5 },
  { name: 'Ghost', category: 'Classic', logo: '#a1a1aa', logo2: '#d4d4d8', bg: { label: 'Zinc', type: 'solid', colors: ['#18181b'] }, effect: 'outline' },

  // ── Premium ──
  { name: 'Holographic', category: 'Premium', logo: '#ffffff', bg: { label: 'Holographic', type: 'conic', colors: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'] }, effect: 'metallic', overlay: 'sparkles', overlayDensity: 8, overlaySize: 0.06, overlayOpacity: 0.7 },
  { name: 'Aurora', category: 'Premium', logo: '#ffffff', bg: { label: 'Aurora', type: 'aurora', colors: ['#064e3b', '#0d9488', '#8b5cf6', '#1e1b4b'] }, effect: 'glass', overlay: 'sparkles', overlayDensity: 12, overlaySize: 0.07, overlayOpacity: 0.7 },
  { name: 'Midnight Luxe', category: 'Premium', logo: '#fbbf24', logo2: '#f59e0b', bg: { label: 'Dark', type: 'solid', colors: ['#0c0a09'] }, effect: 'metallic', overlay: 'stars', overlayDensity: 10, overlaySize: 0.08, overlayOpacity: 0.8, glow: true },
  { name: 'Ice Queen', category: 'Premium', logo: '#ffffff', logo2: '#a5f3fc', bg: { label: 'Ice Crystal', type: 'conic', colors: ['#ecfeff', '#a5f3fc', '#67e8f9', '#22d3ee', '#a5f3fc', '#ecfeff'] }, effect: 'glass', overlay: 'diamonds', overlayDensity: 10, overlaySize: 0.08, overlayOpacity: 0.6 },
  { name: 'Neon Cyber', category: 'Premium', logo: '#a855f7', logo2: '#06b6d4', bg: { label: 'Black', type: 'solid', colors: ['#030712'] }, effect: 'neon', overlay: 'geometric', overlayDensity: 8, overlaySize: 0.07, overlayOpacity: 0.5 },
  { name: 'Vaporwave', category: 'Premium', logo: '#ffffff', logo2: '#ff71ce', bg: { label: 'Vaporwave', type: 'gradient', colors: ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'], angle: 135 }, effect: 'holographic', overlay: 'rings', overlayDensity: 8, overlaySize: 0.09, overlayOpacity: 0.6 },
  { name: 'Deep Space', category: 'Premium', logo: '#e0e7ff', logo2: '#a5b4fc', bg: { label: 'Deep Space', type: 'radial', colors: ['#0f0520', '#1e1b4b', '#312e81'] }, effect: 'holographic', overlay: 'stars', overlayDensity: 16, overlaySize: 0.04, overlayOpacity: 0.9 },
  { name: 'Royal Gold', category: 'Premium', logo: '#fbbf24', logo2: '#d97706', bg: { label: 'Royal', type: 'gradient', colors: ['#1e1b4b', '#312e81'], angle: 160 }, effect: 'metallic', overlay: 'sparkles', overlayDensity: 10, overlaySize: 0.07, overlayOpacity: 0.7, glow: true },
  { name: 'Rose Gold', category: 'Premium', logo: '#fecdd3', logo2: '#fb7185', bg: { label: 'RGold', type: 'gradient', colors: ['#1c1917', '#292524'], angle: 135 }, effect: 'metallic', overlay: 'sparkles', overlayDensity: 6, overlaySize: 0.05, overlayOpacity: 0.5, glow: true },
  { name: 'Chrome', category: 'Premium', logo: '#e5e7eb', logo2: '#6b7280', bg: { label: 'Chrome', type: 'solid', colors: ['#111827'] }, effect: 'metallic', overlay: 'geometric', overlayDensity: 5, overlaySize: 0.06, overlayOpacity: 0.3, glow: true },
  { name: 'Mesh Violet', category: 'Premium', logo: '#ffffff', logo2: '#e9d5ff', bg: { label: 'Mesh Violet', type: 'mesh', colors: ['#4c1d95', '#ec4899', '#8b5cf6', '#3b0764'] }, effect: 'glass', overlay: 'sparkles', overlayDensity: 8, overlaySize: 0.06, overlayOpacity: 0.6 },
  { name: 'Galaxy', category: 'Premium', logo: '#e0e7ff', logo2: '#c4b5fd', bg: { label: 'Deep Space', type: 'radial', colors: ['#0f0520', '#1e1b4b', '#312e81'] }, effect: 'holographic', overlay: 'stars', overlayDensity: 20, overlaySize: 0.035, overlayOpacity: 0.9 },

  // ── Kawaii ──
  { name: 'UwU', category: 'Kawaii', logo: '#ffffff', logo2: '#fecdd3', bg: { label: 'UwU Pink', type: 'gradient', colors: ['#ff6b9d', '#ff8ec4', '#ffb3d9'], angle: 160 }, effect: 'neon', overlay: 'hearts', overlayDensity: 14, overlaySize: 0.08, overlayOpacity: 0.8 },
  { name: 'Sakura', category: 'Kawaii', logo: '#ffffff', logo2: '#fce7f3', bg: { label: 'Sakura', type: 'radial', colors: ['#fce7f3', '#fbcfe8', '#f9a8d4'] }, effect: 'glass', overlay: 'sakura', overlayDensity: 14, overlaySize: 0.09, overlayOpacity: 0.8 },
  { name: 'Pastel Dream', category: 'Kawaii', logo: '#7c3aed', logo2: '#ec4899', bg: { label: 'Pastel Dream', type: 'mesh', colors: ['#e9d5ff', '#fecdd3', '#ccfbf1', '#fef9c3'] }, effect: 'gradient', overlay: 'sparkles', overlayDensity: 12, overlaySize: 0.07, overlayOpacity: 0.7 },
  { name: 'Cotton Candy', category: 'Kawaii', logo: '#ffffff', logo2: '#f9a8d4', bg: { label: 'Cotton Candy', type: 'gradient', colors: ['#f9a8d4', '#c4b5fd', '#93c5fd'], angle: 135 }, effect: 'glass', overlay: 'bubbles', overlayDensity: 12, overlaySize: 0.08, overlayOpacity: 0.6 },
  { name: 'Kawaii Gold', category: 'Kawaii', logo: '#fbbf24', logo2: '#f59e0b', bg: { label: 'KGold', type: 'solid', colors: ['#fef3c7'] }, effect: 'emboss', overlay: 'stars', overlayDensity: 10, overlaySize: 0.07, overlayOpacity: 0.6 },
  { name: 'Lavender', category: 'Kawaii', logo: '#6d28d9', logo2: '#a78bfa', bg: { label: 'Lav', type: 'solid', colors: ['#ede9fe'] }, effect: 'emboss', overlay: 'sparkles', overlayDensity: 10, overlaySize: 0.06, overlayOpacity: 0.7 },
  { name: 'Peach', category: 'Kawaii', logo: '#ffffff', logo2: '#fecaca', bg: { label: 'Peach', type: 'gradient', colors: ['#fed7aa', '#fecaca', '#fde68a'], angle: 135 }, effect: 'glass', overlay: 'hearts', overlayDensity: 10, overlaySize: 0.08, overlayOpacity: 0.7 },
  { name: 'Mint Choco', category: 'Kawaii', logo: '#3b2f2f', logo2: '#064e3b', bg: { label: 'MintC', type: 'gradient', colors: ['#a7f3d0', '#6ee7b7'], angle: 160 }, effect: 'emboss', overlay: 'bubbles', overlayDensity: 8, overlaySize: 0.06, overlayOpacity: 0.5 },
  { name: 'Bubblegum', category: 'Kawaii', logo: '#ffffff', logo2: '#f9a8d4', bg: { label: 'Bubblegum', type: 'gradient', colors: ['#f472b6', '#e879f9', '#a78bfa'], angle: 120 }, effect: 'neon', overlay: 'bubbles', overlayDensity: 12, overlaySize: 0.08, overlayOpacity: 0.7 },
  { name: 'Strawberry', category: 'Kawaii', logo: '#ffffff', logo2: '#fecdd3', bg: { label: 'Straw', type: 'gradient', colors: ['#be123c', '#e11d48', '#fb7185'], angle: 160 }, effect: 'glass', overlay: 'hearts', overlayDensity: 10, overlaySize: 0.07, overlayOpacity: 0.7 },
  { name: 'Sky', category: 'Kawaii', logo: '#ffffff', logo2: '#bae6fd', bg: { label: 'Sky', type: 'gradient', colors: ['#bae6fd', '#7dd3fc', '#38bdf8'], angle: 180 }, effect: 'glass', overlay: 'bubbles', overlayDensity: 10, overlaySize: 0.08, overlayOpacity: 0.6 },
  { name: 'Fairy', category: 'Kawaii', logo: '#ffffff', logo2: '#e9d5ff', bg: { label: 'Fairy', type: 'mesh', colors: ['#fce7f3', '#ede9fe', '#e0f2fe', '#fef9c3'] }, effect: 'holographic', overlay: 'sparkles', overlayDensity: 14, overlaySize: 0.07, overlayOpacity: 0.8 },

  // ── Luxury ──
  { name: 'Black Gold', category: 'Luxury', logo: '#d4af37', logo2: '#fbbf24', bg: { label: 'Black', type: 'solid', colors: ['#000000'] }, effect: 'metallic', overlay: 'sparkles', overlayDensity: 8, overlaySize: 0.06, overlayOpacity: 0.6, glow: true },
  { name: 'Platinum', category: 'Luxury', logo: '#c0c0c0', logo2: '#e8e8e8', bg: { label: 'Plat', type: 'solid', colors: ['#0a0a0a'] }, effect: 'metallic', overlay: 'diamonds', overlayDensity: 6, overlaySize: 0.05, overlayOpacity: 0.4, glow: true },
  { name: 'Diamond', category: 'Luxury', logo: '#ffffff', logo2: '#a5f3fc', bg: { label: 'Dark', type: 'solid', colors: ['#0c0c0c'] }, effect: 'holographic', overlay: 'diamonds', overlayDensity: 10, overlaySize: 0.07, overlayOpacity: 0.6, glow: true },
  { name: 'Ruby', category: 'Luxury', logo: '#fecaca', logo2: '#dc2626', bg: { label: 'Ruby', type: 'gradient', colors: ['#1c1917', '#450a0a'], angle: 160 }, effect: 'metallic', overlay: 'sparkles', overlayDensity: 8, overlaySize: 0.05, overlayOpacity: 0.5, glow: true },
  { name: 'Sapphire', category: 'Luxury', logo: '#bfdbfe', logo2: '#2563eb', bg: { label: 'Saph', type: 'gradient', colors: ['#0f172a', '#1e1b4b'], angle: 160 }, effect: 'metallic', overlay: 'diamonds', overlayDensity: 7, overlaySize: 0.06, overlayOpacity: 0.5, glow: true },
  { name: 'Emerald Lux', category: 'Luxury', logo: '#a7f3d0', logo2: '#059669', bg: { label: 'EmLux', type: 'gradient', colors: ['#022c22', '#064e3b'], angle: 160 }, effect: 'metallic', overlay: 'sparkles', overlayDensity: 7, overlaySize: 0.05, overlayOpacity: 0.5, glow: true },
  { name: 'Obsidian', category: 'Luxury', logo: '#525252', logo2: '#a3a3a3', bg: { label: 'Obsidian', type: 'solid', colors: ['#0a0a0a'] }, effect: 'metallic', overlay: 'geometric', overlayDensity: 6, overlaySize: 0.07, overlayOpacity: 0.2, noise: true },
  { name: 'Amethyst', category: 'Luxury', logo: '#d8b4fe', logo2: '#7e22ce', bg: { label: 'Ameth', type: 'gradient', colors: ['#0f0520', '#3b0764'], angle: 135 }, effect: 'metallic', overlay: 'sparkles', overlayDensity: 10, overlaySize: 0.06, overlayOpacity: 0.7, glow: true },
  { name: 'Ivory', category: 'Luxury', logo: '#1c1917', logo2: '#44403c', bg: { label: 'Ivory', type: 'solid', colors: ['#fafaf9'] }, effect: 'emboss', overlay: 'geometric', overlayDensity: 5, overlaySize: 0.06, overlayOpacity: 0.15 },
  { name: 'Onyx', category: 'Luxury', logo: '#fafafa', logo2: '#a1a1aa', bg: { label: 'Onyx', type: 'solid', colors: ['#0a0a0a'] }, effect: 'outline', overlay: 'rings', overlayDensity: 5, overlaySize: 0.08, overlayOpacity: 0.3, noise: true },
  { name: 'Titanium', category: 'Luxury', logo: '#94a3b8', logo2: '#cbd5e1', bg: { label: 'Titan', type: 'gradient', colors: ['#1e293b', '#0f172a'], angle: 135 }, effect: 'metallic', overlay: 'geometric', overlayDensity: 6, overlaySize: 0.06, overlayOpacity: 0.25 },
  { name: 'Vermeil', category: 'Luxury', logo: '#fcd34d', logo2: '#b45309', bg: { label: 'Verm', type: 'gradient', colors: ['#27272a', '#18181b'], angle: 160 }, effect: 'metallic', overlay: 'sparkles', overlayDensity: 8, overlaySize: 0.06, overlayOpacity: 0.5, glow: true },
];

const activePresetName = ref('Classic');

const filteredPresets = computed(() => {
  if (activeCategory.value === 'All') return presets;
  return presets.filter(p => p.category === activeCategory.value);
});

function applyPreset(p: Preset) {
  activePresetName.value = p.name;
  logoColor.value = p.logo;
  logoColor2.value = p.logo2 ?? p.logo;
  selectedBg.value = p.bg;
  if (p.bg.type === 'solid' && p.bg.colors?.[0]) {
    customBgColor.value = p.bg.colors[0];
  }
  glow.value = p.glow ?? false;
  noise.value = p.noise ?? false;
  logoEffect.value = p.effect ?? 'none';
  overlayType.value = p.overlay ?? 'none';
  overlayDensity.value = p.overlayDensity ?? 10;
  overlaySize.value = p.overlaySize ?? 0.07;
  overlayOpacity.value = p.overlayOpacity ?? 0.75;
  nextTick(render);
}

function presetBgStyle(p: Preset) {
  const bg = p.bg;
  if ((bg.type === 'gradient' || bg.type === 'aurora') && bg.colors) {
    return { background: `linear-gradient(${bg.angle ?? 135}deg, ${bg.colors.join(', ')})` };
  }
  if (bg.type === 'conic' && bg.colors) {
    return { background: `conic-gradient(from 0deg, ${bg.colors.join(', ')})` };
  }
  if (bg.type === 'radial' && bg.colors) {
    return { background: `radial-gradient(circle, ${bg.colors.join(', ')})` };
  }
  if (bg.type === 'mesh' && bg.colors) {
    return { background: `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[2]})` };
  }
  return { background: bg.colors?.[0] ?? '#0e0e0e' };
}

function bgPreviewStyle(bg: BgDef) {
  if (bg.type === 'custom') return { background: customBgColor.value };
  if (bg.type === 'conic' && bg.colors) return { background: `conic-gradient(from 0deg, ${bg.colors.join(', ')})` };
  if (bg.type === 'radial' && bg.colors) return { background: `radial-gradient(circle, ${bg.colors.join(', ')})` };
  if (bg.type === 'aurora' && bg.colors) return { background: `linear-gradient(180deg, ${bg.colors.join(', ')})` };
  if (bg.type === 'mesh' && bg.colors) return { background: `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[2]})` };
  if (bg.type === 'gradient' && bg.colors) return { background: `linear-gradient(${bg.angle ?? 135}deg, ${bg.colors.join(', ')})` };
  return { background: bg.colors?.[0] ?? '#0e0e0e' };
}

// ── Seeded PRNG for deterministic overlay placement ──
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ── Path2D generators for decorative overlays ──
function createSparkle4Path(size: number): Path2D {
  const path = new Path2D();
  const r = size;
  const ir = size * 0.25;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const midAngle = ((i + 0.5) / 4) * Math.PI * 2 - Math.PI / 2;
    const ox = Math.cos(angle) * r;
    const oy = Math.sin(angle) * r;
    const mx = Math.cos(midAngle) * ir;
    const my = Math.sin(midAngle) * ir;
    if (i === 0) path.moveTo(ox, oy);
    else path.lineTo(ox, oy);
    path.lineTo(mx, my);
  }
  path.closePath();
  return path;
}

function createStarPath(points: number, outerR: number, innerR: number): Path2D {
  const path = new Path2D();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

function createHeartPath(size: number): Path2D {
  const path = new Path2D();
  const s = size;
  path.moveTo(0, s * 0.3);
  path.bezierCurveTo(-s * 0.02, s * 0.1, -s * 0.5, s * 0.1, -s * 0.5, -s * 0.2);
  path.bezierCurveTo(-s * 0.5, -s * 0.55, 0, -s * 0.55, 0, -s * 0.25);
  path.bezierCurveTo(0, -s * 0.55, s * 0.5, -s * 0.55, s * 0.5, -s * 0.2);
  path.bezierCurveTo(s * 0.5, s * 0.1, s * 0.02, s * 0.1, 0, s * 0.3);
  path.closePath();
  return path;
}

function createPetalPath(size: number): Path2D {
  const path = new Path2D();
  const s = size;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * s * 0.4;
    const y = Math.sin(angle) * s * 0.4;
    path.moveTo(0, 0);
    path.ellipse(x, y, s * 0.35, s * 0.2, angle + Math.PI / 2, 0, Math.PI * 2);
  }
  return path;
}

function createDiamondPath(size: number): Path2D {
  const path = new Path2D();
  path.moveTo(0, -size);
  path.lineTo(size * 0.6, 0);
  path.lineTo(0, size);
  path.lineTo(-size * 0.6, 0);
  path.closePath();
  return path;
}

function createRingPath(radius: number, thickness: number): Path2D {
  const path = new Path2D();
  path.arc(0, 0, radius, 0, Math.PI * 2);
  path.arc(0, 0, radius - thickness, 0, Math.PI * 2, true);
  return path;
}

function createBubblePath(radius: number): Path2D {
  const path = new Path2D();
  path.arc(0, 0, radius, 0, Math.PI * 2);
  return path;
}

function createHexPath(size: number): Path2D {
  const path = new Path2D();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

// ── Overlay color palettes per type ──
function getOverlayColors(type: OverlayType): string[] {
  switch (type) {
    case 'sparkles': return [logoColor.value, '#fbbf24', '#ffffff', logoColor2.value];
    case 'sakura': return ['#f9a8d4', '#fbcfe8', '#fce7f3', '#f472b6', '#ffffff'];
    case 'hearts': return ['#fb7185', '#f43f5e', '#fda4af', '#fecdd3', '#ffffff'];
    case 'stars': return [logoColor.value, '#fbbf24', '#fde68a', '#ffffff'];
    case 'rings': return [logoColor.value, logoColor2.value, 'rgba(255,255,255,0.5)'];
    case 'bubbles': return [logoColor.value, '#ffffff', logoColor2.value, 'rgba(255,255,255,0.6)'];
    case 'diamonds': return [logoColor.value, '#ffffff', '#a5f3fc', '#c4b5fd'];
    case 'geometric': return [logoColor.value, logoColor2.value, 'rgba(255,255,255,0.4)'];
    default: return [logoColor.value];
  }
}

// ── Draw overlays ──
function drawOverlays(ctx: CanvasRenderingContext2D, size: number) {
  if (overlayType.value === 'none') return;

  const rng = seededRandom(42 + overlayDensity.value * 7);
  const count = overlayDensity.value;
  const elSize = size * overlaySize.value;
  const colors = getOverlayColors(overlayType.value);

  ctx.save();

  for (let i = 0; i < count; i++) {
    // Distribute elements across the whole canvas, not just a ring
    const angle = (i / count) * Math.PI * 2 + rng() * 1.2;
    // Layer 1: outer ring, Layer 2: mid ring, Layer 3: near corners
    const layer = i % 3;
    let dist: number;
    if (layer === 0) dist = size * 0.33 + rng() * size * 0.15;
    else if (layer === 1) dist = size * 0.18 + rng() * size * 0.12;
    else dist = size * 0.4 + rng() * size * 0.08;

    const x = size / 2 + Math.cos(angle) * dist;
    const y = size / 2 + Math.sin(angle) * dist;
    const rotation = rng() * Math.PI * 2;
    const scale = 0.6 + rng() * 0.8;
    const alpha = overlayOpacity.value * (0.5 + rng() * 0.5);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    // Pick color from palette
    const color = colors[i % colors.length];
    let path: Path2D;
    let useStroke = false;

    switch (overlayType.value) {
      case 'sparkles':
        path = createSparkle4Path(elSize);
        ctx.fillStyle = color;
        // Add glow to sparkles
        ctx.shadowColor = color;
        ctx.shadowBlur = elSize * 0.8;
        break;
      case 'sakura':
        path = createPetalPath(elSize);
        ctx.fillStyle = color;
        ctx.shadowColor = '#f9a8d4';
        ctx.shadowBlur = elSize * 0.4;
        break;
      case 'hearts':
        path = createHeartPath(elSize);
        ctx.fillStyle = color;
        ctx.shadowColor = '#fb7185';
        ctx.shadowBlur = elSize * 0.5;
        break;
      case 'stars':
        path = createStarPath(5, elSize, elSize * 0.4);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = elSize * 0.6;
        break;
      case 'rings':
        path = createRingPath(elSize, elSize * 0.25);
        useStroke = true;
        ctx.strokeStyle = color;
        ctx.lineWidth = elSize * 0.15;
        ctx.shadowColor = color;
        ctx.shadowBlur = elSize * 0.5;
        break;
      case 'bubbles':
        path = createBubblePath(elSize);
        useStroke = true;
        ctx.strokeStyle = color;
        ctx.lineWidth = elSize * 0.1;
        ctx.shadowColor = color;
        ctx.shadowBlur = elSize * 0.4;
        break;
      case 'diamonds':
        path = createDiamondPath(elSize);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = elSize * 0.5;
        break;
      case 'geometric':
        path = createHexPath(elSize);
        useStroke = true;
        ctx.strokeStyle = color;
        ctx.lineWidth = elSize * 0.08;
        ctx.shadowColor = color;
        ctx.shadowBlur = elSize * 0.3;
        break;
      default:
        path = createSparkle4Path(elSize);
        ctx.fillStyle = color;
    }

    if (useStroke) {
      ctx.stroke(path);
    } else {
      ctx.fill(path);
    }
    ctx.restore();
  }

  ctx.restore();
}

// ── Draw logo with effect ──
function drawLogoWithEffect(ctx: CanvasRenderingContext2D, size: number) {
  const pad = size * padding.value;
  const available = size - pad * 2;
  const logoSz = available * logoScale.value;
  const offset = (size - logoSz) / 2;
  const scaleFactor = logoSz / 128;

  ctx.save();
  ctx.translate(offset, offset);
  ctx.scale(scaleFactor, scaleFactor);

  const catP = getCatPath();

  switch (logoEffect.value) {
    case 'none':
      ctx.fillStyle = logoColor.value;
      ctx.fill(catP);
      break;

    case 'gradient': {
      const grad = ctx.createLinearGradient(0, 0, 128, 128);
      grad.addColorStop(0, logoColor.value);
      grad.addColorStop(1, logoColor2.value);
      ctx.fillStyle = grad;
      ctx.fill(catP);
      break;
    }

    case 'metallic': {
      const metal = ctx.createLinearGradient(0, 0, 128, 128);
      metal.addColorStop(0, logoColor.value);
      metal.addColorStop(0.2, logoColor2.value);
      metal.addColorStop(0.4, '#ffffff');
      metal.addColorStop(0.5, logoColor.value);
      metal.addColorStop(0.6, '#ffffff');
      metal.addColorStop(0.8, logoColor2.value);
      metal.addColorStop(1, logoColor.value);
      ctx.fillStyle = metal;
      ctx.fill(catP);
      // Strong shimmer highlight band
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const shimmer = ctx.createLinearGradient(20, 0, 108, 128);
      shimmer.addColorStop(0, 'rgba(255,255,255,0)');
      shimmer.addColorStop(0.35, 'rgba(255,255,255,0)');
      shimmer.addColorStop(0.45, 'rgba(255,255,255,0.8)');
      shimmer.addColorStop(0.55, 'rgba(255,255,255,0.8)');
      shimmer.addColorStop(0.65, 'rgba(255,255,255,0)');
      shimmer.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shimmer;
      ctx.fill(catP);
      ctx.restore();
      // Second pass: specular edge highlight
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const spec = ctx.createLinearGradient(0, 0, 128, 0);
      spec.addColorStop(0, 'rgba(255,255,255,0)');
      spec.addColorStop(0.3, 'rgba(255,255,255,0.15)');
      spec.addColorStop(0.5, 'rgba(255,255,255,0.4)');
      spec.addColorStop(0.7, 'rgba(255,255,255,0.15)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.fill(catP);
      ctx.restore();
      break;
    }

    case 'holographic': {
      const holo = ctx.createConicGradient(0, 64, 64);
      const hColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#0066ff', '#8800ff', '#ff00ff', '#ff0000'];
      hColors.forEach((c, i) => holo.addColorStop(i / (hColors.length - 1), c));
      ctx.fillStyle = holo;
      ctx.fill(catP);
      // White sheen overlay for iridescence
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const irid = ctx.createLinearGradient(0, 0, 128, 128);
      irid.addColorStop(0, 'rgba(255,255,255,0.4)');
      irid.addColorStop(0.3, 'rgba(255,255,255,0)');
      irid.addColorStop(0.6, 'rgba(255,255,255,0.3)');
      irid.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = irid;
      ctx.fill(catP);
      ctx.restore();
      // Sparkle glints
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const glint = ctx.createRadialGradient(40, 35, 0, 40, 35, 20);
      glint.addColorStop(0, 'rgba(255,255,255,0.7)');
      glint.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glint;
      ctx.fill(catP);
      ctx.restore();
      break;
    }

    case 'neon': {
      // Outer glow - large diffuse
      ctx.save();
      ctx.shadowColor = logoColor.value;
      ctx.shadowBlur = 40;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill(catP);
      ctx.restore();
      // Mid glow
      ctx.save();
      ctx.shadowColor = logoColor.value;
      ctx.shadowBlur = 25;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill(catP);
      ctx.restore();
      // Inner glow
      ctx.save();
      ctx.shadowColor = logoColor.value;
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill(catP);
      ctx.restore();
      // Core fill
      ctx.save();
      ctx.shadowColor = logoColor.value;
      ctx.shadowBlur = 6;
      ctx.fillStyle = logoColor.value;
      ctx.fill(catP);
      ctx.restore();
      // Hot white core
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.fill(catP);
      ctx.restore();
      // Secondary color outer glow
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.shadowColor = logoColor2.value;
      ctx.shadowBlur = 30;
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill(catP);
      ctx.restore();
      break;
    }

    case 'glass': {
      // Background shadow for depth
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = logoColor.value;
      ctx.globalAlpha = 0.5;
      ctx.fill(catP);
      ctx.restore();
      // Main semi-transparent fill
      ctx.save();
      ctx.globalAlpha = 0.55;
      const glassFill = ctx.createLinearGradient(0, 0, 0, 128);
      glassFill.addColorStop(0, logoColor.value);
      glassFill.addColorStop(1, logoColor2.value);
      ctx.fillStyle = glassFill;
      ctx.fill(catP);
      ctx.restore();
      // Top highlight - frosted glass shine
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 128, 55);
      ctx.clip();
      ctx.globalAlpha = 0.4;
      const glassHighlight = ctx.createLinearGradient(0, 0, 0, 55);
      glassHighlight.addColorStop(0, 'rgba(255,255,255,0.9)');
      glassHighlight.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glassHighlight;
      ctx.fill(catP);
      ctx.restore();
      // White edge border
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke(catP);
      ctx.restore();
      // Inner light refraction
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.2;
      const refraction = ctx.createLinearGradient(30, 30, 100, 100);
      refraction.addColorStop(0, '#ffffff');
      refraction.addColorStop(0.5, 'transparent');
      refraction.addColorStop(1, '#ffffff');
      ctx.fillStyle = refraction;
      ctx.fill(catP);
      ctx.restore();
      break;
    }

    case 'outline': {
      // Outer glow
      ctx.save();
      ctx.shadowColor = logoColor.value;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = logoColor.value;
      ctx.lineWidth = 4;
      ctx.stroke(catP);
      ctx.restore();
      // Main stroke
      ctx.save();
      ctx.strokeStyle = logoColor.value;
      ctx.lineWidth = 3.5;
      ctx.stroke(catP);
      ctx.restore();
      // Inner stroke with second color
      ctx.save();
      ctx.strokeStyle = logoColor2.value;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke(catP);
      ctx.restore();
      // Very subtle fill
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = logoColor.value;
      ctx.fill(catP);
      ctx.restore();
      break;
    }

    case 'emboss': {
      // Deep shadow for 3D depth
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = logoColor.value;
      ctx.fill(catP);
      ctx.restore();
      // Main fill with gradient for dimension
      ctx.save();
      const embossGrad = ctx.createLinearGradient(0, 0, 128, 128);
      embossGrad.addColorStop(0, logoColor.value);
      embossGrad.addColorStop(0.5, logoColor2.value);
      embossGrad.addColorStop(1, logoColor.value);
      ctx.fillStyle = embossGrad;
      ctx.fill(catP);
      ctx.restore();
      // Top-left highlight for raised look
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const embossHighlight = ctx.createLinearGradient(0, 0, 90, 90);
      embossHighlight.addColorStop(0, 'rgba(255,255,255,0.5)');
      embossHighlight.addColorStop(0.5, 'rgba(255,255,255,0.1)');
      embossHighlight.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = embossHighlight;
      ctx.fill(catP);
      ctx.restore();
      // Bottom-right darkening
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const embossDark = ctx.createLinearGradient(40, 40, 128, 128);
      embossDark.addColorStop(0, 'rgba(255,255,255,1)');
      embossDark.addColorStop(0.6, 'rgba(255,255,255,1)');
      embossDark.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = embossDark;
      ctx.fill(catP);
      ctx.restore();
      break;
    }

    case 'duotone': {
      // Top half color 1
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 128, 64);
      ctx.clip();
      ctx.fillStyle = logoColor.value;
      ctx.fill(catP);
      ctx.restore();
      // Bottom half color 2
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 64, 128, 64);
      ctx.clip();
      ctx.fillStyle = logoColor2.value;
      ctx.fill(catP);
      ctx.restore();
      break;
    }
  }

  ctx.restore();
}

// Cat SVG path
let catPath: Path2D | null = null;
function getCatPath() {
  if (!catPath) {
    catPath = new Path2D('M114.54,88.82c5.35-2.75,9.96-6.72,13.46-11.53c-4.67-3.14-9.86-5.56-15.4-7.09c0.01-24.5-6.29-48.6-18.25-69.73c-7.96,8.45-14.3,18.49-18.62,29.31c-7.66-1.22-15.65-1.06-23.27,0.31C48.13,19.15,41.74,9.02,33.71,0.47C21.76,21.62,15.45,45.7,15.46,70.2c-5.54,1.53-10.73,3.95-15.4,7.09c3.49,4.82,8.1,8.78,13.46,11.53c-3.64,2.85-6.74,6.37-9.14,10.33c5.87,4.32,12.67,7.48,20.05,9.09c19.68,25.4,59.51,25.41,79.2,0c7.38-1.61,14.18-4.78,20.05-9.09C121.28,95.19,118.18,91.68,114.54,88.82z M23.7,68.22c0,0,4.13-2.07,12.4-2.07c8.27,0,19.64,11.37,19.64,11.37s-8.27,6.2-19.64,9.3C32.11,87.91,26.8,77.52,23.7,68.22z M64,98.19c-5.71,0-10.33-4.13-10.33-12.4c1.04-0.35,2.16-0.62,3.3-0.85l3,6.02l1.21-6.61c1.9-0.14,3.84-0.14,5.75,0.01l1.22,6.65l3.01-6.05c1.1,0.23,2.17,0.49,3.18,0.82C74.33,94.05,69.71,98.19,64,98.19z M92.99,86.03c-11.37-3.1-19.63-9.3-19.63-9.3s11.37-11.37,19.63-11.37s12.4,2.07,12.4,2.07C102.29,76.73,96.98,87.12,92.99,86.03z');
  }
  return catPath;
}

// ── Background rendering ──
function drawBackground(ctx: CanvasRenderingContext2D, size: number) {
  const bg = selectedBg.value;

  switch (bg.type) {
    case 'solid':
      ctx.fillStyle = bg.colors?.[0] ?? '#0e0e0e';
      ctx.fillRect(0, 0, size, size);
      break;

    case 'gradient': {
      if (!bg.colors) break;
      const rad = (bg.angle ?? 135) * Math.PI / 180;
      const cx = size / 2, cy = size / 2;
      const dx = Math.cos(rad) * size / 2, dy = Math.sin(rad) * size / 2;
      const grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      bg.colors.forEach((c, i) => grad.addColorStop(i / (bg.colors!.length - 1), c));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'custom':
      ctx.fillStyle = customBgColor.value;
      ctx.fillRect(0, 0, size, size);
      break;

    case 'conic': {
      if (!bg.colors) break;
      const conic = ctx.createConicGradient(0, size / 2, size / 2);
      bg.colors.forEach((c, i) => conic.addColorStop(i / (bg.colors!.length - 1), c));
      ctx.fillStyle = conic;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'radial': {
      if (!bg.colors) break;
      const radGrad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
      bg.colors.forEach((c, i) => radGrad.addColorStop(i / (bg.colors!.length - 1), c));
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'mesh': {
      if (!bg.colors || bg.colors.length < 4) break;
      // Base fill
      ctx.fillStyle = bg.colors[3];
      ctx.fillRect(0, 0, size, size);
      // Blob 1 - top left
      const g1 = ctx.createRadialGradient(size * 0.25, size * 0.25, 0, size * 0.25, size * 0.25, size * 0.55);
      g1.addColorStop(0, bg.colors[0]);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, size, size);
      // Blob 2 - top right
      const g2 = ctx.createRadialGradient(size * 0.75, size * 0.2, 0, size * 0.75, size * 0.2, size * 0.5);
      g2.addColorStop(0, bg.colors[1]);
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, size, size);
      // Blob 3 - bottom
      const g3 = ctx.createRadialGradient(size * 0.5, size * 0.8, 0, size * 0.5, size * 0.8, size * 0.5);
      g3.addColorStop(0, bg.colors[2]);
      g3.addColorStop(1, 'transparent');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, size, size);
      break;
    }

    case 'aurora': {
      if (!bg.colors) break;
      // Base dark
      ctx.fillStyle = bg.colors[bg.colors.length - 1];
      ctx.fillRect(0, 0, size, size);
      // Horizontal aurora bands
      const bandCount = bg.colors.length - 1;
      for (let i = 0; i < bandCount; i++) {
        const y = (i / bandCount) * size;
        const h = size / bandCount;
        const aGrad = ctx.createRadialGradient(
          size * (0.3 + i * 0.15), y + h / 2, 0,
          size * (0.3 + i * 0.15), y + h / 2, size * 0.6
        );
        aGrad.addColorStop(0, bg.colors[i]);
        aGrad.addColorStop(0.6, bg.colors[i] + '40');
        aGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = aGrad;
        ctx.fillRect(0, 0, size, size);
      }
      break;
    }
  }
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
  drawBackground(ctx, size);

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

  // Overlays (behind logo)
  drawOverlays(ctx, size);

  // Draw cat logo with effect
  drawLogoWithEffect(ctx, size);

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
  const presetSlug = activePresetName.value ? activePresetName.value.toLowerCase().replace(/\s+/g, '-') : 'custom';
  a.download = `argon-${presetSlug}-${shape.value}-${size}x${size}.png`;
  a.href = offscreen.toDataURL('image/png');
  a.click();
}

watch([shape, selectedBg, customBgColor, logoColor, logoColor2, logoScale, padding, glow, noise, logoEffect, overlayType, overlayDensity, overlaySize, overlayOpacity], () => {
  activePresetName.value = '';
  nextTick(render);
}, { deep: true });

onMounted(() => {
  nextTick(render);
});
</script>
