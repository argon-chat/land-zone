<template>
  <div class="flex items-center gap-2">
    <button
      v-for="theme in themes"
      :key="theme.id"
      @click="setTheme(theme.id)"
      class="group relative flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 cursor-pointer"
      :class="active === theme.id
        ? 'border-accent/40 bg-accent-subtle'
        : 'border-oled-border-subtle hover:border-oled-border bg-oled-surface/50 hover:bg-oled-hover'"
    >
      <div
        class="w-5 h-5 rounded-full border"
        :style="{ background: theme.bg, borderColor: theme.border }"
      ></div>
      <span class="text-xs font-medium" :class="active === theme.id ? 'text-accent' : 'text-text-secondary'">
        {{ theme.label }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const themes = [
  { id: 'dark', label: 'Dark', bg: '#0e0e0e', border: '#222' },
  { id: 'oled', label: 'OLED', bg: '#000000', border: '#181818' },
  { id: 'light', label: 'Light', bg: '#fafafa', border: '#d4d4d8' },
];

const active = ref('dark');

onMounted(() => {
  const isDark = document.documentElement.classList.contains('dark');
  active.value = isDark ? 'dark' : 'light';
});

function setTheme(id: string) {
  active.value = id;
  if (id === 'light') {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
}
</script>
