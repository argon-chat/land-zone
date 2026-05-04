<template>
  <div class="coin-rain-container" ref="container">
    <div
      v-for="coin in coins"
      :key="coin.id"
      class="coin"
      :style="{
        left: coin.x + '%',
        animationDuration: coin.duration + 's',
        animationDelay: coin.delay + 's',
        width: coin.size + 'px',
        height: coin.size + 'px',
      }"
    >
      <img
        :src="coin.img"
        :width="coin.size"
        :height="coin.size"
        alt=""
        class="coin-img"
        loading="lazy"
        draggable="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const COIN_IMAGES = [
  '/coins/staff.png',
  '/coins/year2026.png',
  '/coins/contributor.png',
  '/coins/secret.png',
];

interface Coin {
  id: number;
  x: number;
  duration: number;
  delay: number;
  size: number;
  img: string;
}

const container = ref<HTMLElement>();
const coins = ref<Coin[]>([]);

onMounted(() => {
  const result: Coin[] = [];
  for (let i = 0; i < 18; i++) {
    result.push({
      id: i,
      x: Math.random() * 100,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 6,
      size: 24 + Math.random() * 20,
      img: COIN_IMAGES[Math.floor(Math.random() * COIN_IMAGES.length)],
    });
  }
  coins.value = result;
});
</script>

<style scoped>
.coin-rain-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.coin {
  position: absolute;
  top: -40px;
  animation: coinFall linear infinite;
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
  opacity: 0;
}

.coin-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

@keyframes coinFall {
  0% {
    transform: translateY(-40px) rotate(0deg);
    opacity: 0;
  }
  5% {
    opacity: 0.7;
  }
  80% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(calc(100vh + 40px)) rotate(720deg);
    opacity: 0;
  }
}
</style>
