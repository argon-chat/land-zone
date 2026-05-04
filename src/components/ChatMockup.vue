<template>
  <div class="chat-mockup" ref="mockupRef">
    <!-- Channel header -->
    <div class="chat-header">
      <svg class="size-4 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
      <span class="text-sm font-semibold text-text-primary">general</span>
      <span class="text-xs text-text-muted ml-1 hidden sm:inline">Hang out and chat</span>
    </div>

    <!-- Messages -->
    <div class="chat-body">
      <!-- Message 1 — always visible -->
      <div class="chat-msg">
        <img src="/avatars/yuuki.svg" alt="" class="chat-avatar-img" />
        <div class="chat-msg-content">
          <div class="chat-msg-header">
            <span class="chat-username" style="color: #a78bfa;">Yuuki</span>
            <span class="chat-time">Today at 12:01</span>
          </div>
          <div class="chat-text">Hey, anyone up for a voice call? 🎧</div>
        </div>
      </div>

      <!-- Message 2 -->
      <div class="chat-msg" :class="{ 'msg-enter': show2, 'msg-hidden': !show2 }">
        <img src="/avatars/ren.svg" alt="" class="chat-avatar-img" />
        <div class="chat-msg-content">
          <div class="chat-msg-header">
            <span class="chat-username" style="color: #22d3ee;">Ren</span>
            <span class="chat-time">Today at 12:02</span>
          </div>
          <div class="chat-text">Count me in! Let me grab my headset 🎤</div>
        </div>
      </div>

      <!-- Message 3 — rich text -->
      <div class="chat-msg" :class="{ 'msg-enter': show3, 'msg-hidden': !show3 }">
        <img src="/avatars/boba.svg" alt="" class="chat-avatar-img" />
        <div class="chat-msg-content">
          <div class="chat-msg-header">
            <span class="chat-username" style="color: #c084fc;">Boba</span>
            <span class="chat-time">Today at 12:02</span>
          </div>
          <div class="chat-text">
            Just shared the <span class="chat-spoiler">secret playlist</span> in
            <span class="chat-channel-mention">#music</span> ✨
          </div>
        </div>
      </div>

      <!-- Typing indicator -->
      <div class="chat-typing" :class="{ 'msg-enter': showTyping, 'msg-hidden': !showTyping }">
        <img src="/avatars/kai.svg" alt="" class="chat-avatar-img chat-avatar-sm" />
        <div class="flex items-center gap-1 ml-1">
          <span class="text-[11px] text-text-muted font-medium">Kai is typing</span>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>

    <!-- Input bar -->
    <div class="chat-input-area">
      <div class="chat-input">
        <svg class="size-4 text-text-muted shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
        <span class="text-xs text-text-muted flex-1">Message #general</span>
        <svg class="size-4 text-text-muted shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const mockupRef = ref<HTMLElement>();
const show2 = ref(false);
const show3 = ref(false);
const showTyping = ref(false);

let observer: IntersectionObserver | null = null;
let timeouts: ReturnType<typeof setTimeout>[] = [];

function startAnimation() {
  show2.value = false;
  show3.value = false;
  showTyping.value = false;

  timeouts.push(setTimeout(() => { show2.value = true; }, 800));
  timeouts.push(setTimeout(() => { show3.value = true; }, 1600));
  timeouts.push(setTimeout(() => { showTyping.value = true; }, 2400));
  timeouts.push(setTimeout(() => { showTyping.value = false; }, 4500));
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          startAnimation();
          observer?.unobserve(e.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  if (mockupRef.value) observer.observe(mockupRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
  timeouts.forEach(clearTimeout);
});
</script>

<style scoped>
.chat-mockup {
  border: 1px solid var(--color-oled-border);
  border-radius: 15px;
  background: var(--color-oled-surface);
  overflow: hidden;
  max-width: 28rem;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-oled-border-subtle);
  background: var(--color-oled-elevated);
}

.chat-body {
  padding: 12px;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-msg {
  display: flex;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-msg:hover {
  background: rgba(255, 255, 255, 0.02);
}

.msg-hidden {
  opacity: 0;
  transform: translateY(8px);
}

.msg-enter {
  opacity: 1;
  transform: translateY(0);
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.chat-avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  background: rgba(255,255,255,0.05);
}

.chat-avatar-img.chat-avatar-sm {
  width: 24px;
  height: 24px;
}

.chat-avatar-sm {
  width: 24px;
  height: 24px;
  font-size: 10px;
}

.chat-msg-content {
  min-width: 0;
}

.chat-msg-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.chat-username {
  font-size: 13px;
  font-weight: 600;
}

.chat-time {
  font-size: 10px;
  color: var(--color-text-muted);
}

.chat-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 1px;
  line-height: 1.4;
}

.chat-spoiler {
  background: var(--color-text-muted);
  color: transparent;
  border-radius: 3px;
  padding: 0 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.chat-spoiler:hover {
  background: var(--color-oled-hover);
  color: var(--color-text-secondary);
}

.chat-channel-mention {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: 3px;
  padding: 0 3px;
  font-weight: 500;
  cursor: pointer;
}

.chat-typing {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-input-area {
  padding: 0 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--color-oled-elevated);
  border: 1px solid var(--color-oled-border-subtle);
}
</style>
