// <argon-client-mock> — isolated, logic-free replica of the Argon desktop
// client shell, for honest landing mocks + future docs. Renders into a Shadow
// DOM (full style isolation) and scales a fixed-design layout to the host width.
//
// Usage:  <argon-client-mock></argon-client-mock>                 (full shell)
//         <argon-client-mock view="chat|voice|inventory|playframe"></…>
//         attrs: view, accent (#hex), theme (dark)

import sheet from "./argon-mock.css?raw";
import {
  demoScene, demoCoins, demoGames, demoVoicePool, demoPresences, ROSTER,
  type Scene, type Message, type Member, type VoiceMember,
} from "./scenes";
import { chatPresets } from "./presets";
import {
  Hash, Volume2, Antenna, Mic, MicOff, Headphones, ScreenShare, Camera,
  Gamepad2, PhoneOff, OctagonMinus, ChevronDown, Rocket, BadgeCheck, Plus,
  Search, Bell, Paperclip, Smile, Signal, Settings, MessageSquareWarning, Terminal,
  Monitor, Radio,
} from "lucide";

type View = "shell" | "chat" | "voice" | "inventory" | "playframe";

// Design widths = inner card width + the 36px stage padding (18px each side),
// so the scaled content never overflows / clips.
const DESIGN: Record<View, number> = {
  shell: 1240,
  chat: 516,
  voice: 556,
  inventory: 496,
  playframe: 496,
};

/* ---- icons from the Lucide library, rendered to SVG strings ------------- */
const ICONS: Record<string, any> = {
  hash: Hash, volume: Volume2, announce: Antenna, mic: Mic, micOff: MicOff,
  headphones: Headphones, screen: ScreenShare, camera: Camera, gamepad: Gamepad2,
  phoneOff: PhoneOff, octagon: OctagonMinus, chevron: ChevronDown, rocket: Rocket,
  seal: BadgeCheck, plus: Plus, search: Search, bell: Bell, clip: Paperclip,
  smile: Smile, signal: Signal, gear: Settings, feedback: MessageSquareWarning, terminal: Terminal,
  monitor: Monitor, radio: Radio,
};

const icon = (n: string, w = 2) => {
  const node: [string, Record<string, unknown>][] = ICONS[n] ?? [];
  const body = node
    .map(([tag, attrs]) =>
      `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`,
    )
    .join("");
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const initial = (name: string) => name.trim().charAt(0).toUpperCase();

// Rolling timestamp for preset messages (starts ~11:50 PM, +1 min per 2 messages).
const clock = (i: number) => {
  const mins = 23 * 60 + 50 + Math.floor(i / 2);
  const h24 = Math.floor(mins / 60) % 24;
  const mm = String(mins % 60).padStart(2, "0");
  const h = h24 % 12 || 12;
  return `${h}:${mm} ${h24 >= 12 ? "PM" : "AM"}`;
};

const PRESENCE_ICON: Record<string, string> = {
  game: "gamepad", listen: "headphones", software: "monitor", stream: "radio",
};

// ONE dialogue preset per page load — shared by every <argon-client-mock> on the
// page so the whole landing tells a single coherent conversation (not all four at once).
const PAGE_PRESET = chatPresets[Math.floor(Math.random() * chatPresets.length)] ?? [];

/* ---- panel builders ----------------------------------------------------- */

function rail(s: Scene) {
  const slots = s.rail
    .map(
      (r) => `<div class="rail-slot${r.active ? " active" : ""}"><span class="rail-ind"></span>
        <div class="rail-av" style="${r.color ? `background:${r.color}` : ""}">
          ${r.src ? `<img src="${r.src}" alt="">` : esc(r.initial ?? "")}
        </div></div>`,
    )
    .join("");
  return `<div class="rail">${slots}<div class="rail-sep"></div>
    <div class="rail-slot"><button class="rail-btn add">${icon("plus")}</button></div></div>`;
}

function channelRow(c: Scene["categories"][number]["channels"][number]) {
  const ic = c.type === "voice" ? "volume" : c.type === "announce" ? "announce" : "hash";
  const live = c.type === "voice" && c.members && c.members.length ? " live" : "";
  const count = c.members?.length ? `<span class="count">${c.members.length}</span>` : "";
  let html = `<div class="chan ${c.type}${c.active ? " active" : ""}${live}">
    <span class="ico">${icon(ic)}</span><span>${esc(c.name)}</span>${count}</div>`;
  if (c.members?.length) {
    const vu = c.members
      .map((m) => {
        const st =
          m.state === "speaking"
            ? `<span class="bars"><i></i><i></i><i></i></span>`
            : m.state === "screen"
              ? `<span class="vstate screen">${icon("screen")}</span>`
              : m.state === "muted"
                ? `<span class="vstate muted">${icon("micOff")}</span>`
                : `<span class="vstate">${icon("mic")}</span>`;
        return `<div class="vuser${m.me ? " me" : ""}${m.state === "speaking" ? " speaking" : ""}">
          <img src="${m.avatar}" alt=""><span class="vn">${esc(m.name)}</span>${st}</div>`;
      })
      .join("");
    html += `<div class="vusers">${vu}</div>`;
  }
  return html;
}

function serverPanel(s: Scene) {
  const cats = s.categories
    .map(
      (cat) => `<div class="cat"><span class="cat-chevron">${icon("chevron")}</span>
        <span class="cat-label">${esc(cat.label)}</span></div>
        ${cat.channels.map(channelRow).join("")}`,
    )
    .join("");
  return `<div class="sp-col">
    <div class="panel sp">
      <div class="sp-banner"${s.server.banner ? ` style="background-image:linear-gradient(180deg,rgba(0,0,0,0) 25%,rgba(0,0,0,0.62) 100%),url('${s.server.banner}');background-size:cover;background-position:center"` : ""}>
        <div class="sp-name">${s.server.verified ? `<span class="seal">${icon("seal")}</span>` : ""}${esc(s.server.name)}</div>
      </div>
      <div class="sp-chans">${cats}</div>
    </div>
    <div class="ctrlbar">
      <span class="ctrl-btn danger">${icon("phoneOff")}</span>
      <span class="ctrl-btn">${icon("mic")}</span>
      <span class="ctrl-btn">${icon("headphones")}</span>
      <span class="ctrl-btn">${icon("screen")}</span>
      <span class="ctrl-btn">${icon("camera")}</span>
      <span class="ctrl-btn">${icon("gamepad")}</span>
      <span class="ctrl-btn">${icon("octagon")}</span>
    </div>
    <div class="userbar">
      <div class="ub-info"><img src="${s.user.avatar}" alt="">
        <div><div class="ub-name">${esc(s.user.name)}</div><div class="ub-status">${esc(s.user.status)}</div></div>
      </div>
      <span class="ub-gear">${icon("gear")}</span>
    </div>
  </div>`;
}

function oneMessage(m: Message, grouped = false) {
  const r = ROSTER[m.author];
  const color = m.color ?? r?.color ?? "#9aa0aa";
  const avatar = m.avatar ?? r?.avatar;
  const av = avatar
    ? `<img class="msg-av" src="${avatar}" alt="">`
    : `<div class="msg-av msg-av-fb" style="background:${color}">${esc(initial(m.author))}</div>`;
  const div = m.date ? `<div class="divider"><span>${esc(m.date)}</span></div>` : "";
  let reply = "";
  if (m.reply) {
    const rc = m.reply.color ?? ROSTER[m.reply.author]?.color ?? "#9aa0aa";
    reply = `<div class="reply" style="border-color:${rc}"><span class="rn" style="color:${rc}">${esc(m.reply.author)}</span><span class="rt">${esc(m.reply.text)}</span></div>`;
  }
  const meta = grouped
    ? ""
    : `<div class="msg-meta"><span class="msg-name" style="color:${color}">${esc(m.author)}</span><span class="msg-time">${esc(m.time ?? "")}</span></div>`;
  return `${div}<div class="msg${grouped ? " grouped" : ""}">${av}<div class="msg-body">${meta}${reply}<div class="bubble">${esc(m.text)}</div></div></div>`;
}

function buildVuser(m: VoiceMember, speaking = false) {
  const st = speaking
    ? `<span class="bars"><i></i><i></i><i></i></span>`
    : `<span class="vstate">${icon("mic")}</span>`;
  return `<div class="vuser${speaking ? " speaking" : ""}"><img src="${m.avatar}" alt=""><span class="vn">${esc(m.name)}</span>${st}</div>`;
}

function messages(msgs: Message[]) {
  let prev = "";
  return msgs
    .map((m) => {
      const grouped = !m.date && !m.reply && m.author === prev;
      prev = m.author;
      return oneMessage(m, grouped);
    })
    .join("");
}

function chatPanel(s: Scene, cls = "chat") {
  return `<div class="${cls === "chat" ? "panel chat" : cls}">
    <div class="chat-head"><span class="ico">${icon("hash")}</span>
      <span class="cname">${esc(s.channel)}</span><span class="bell">${icon("bell")}</span>
      <div class="typing-pill"><span class="tp-dots"><i></i><i></i><i></i></span><span class="tp-text"></span></div>
    </div>
    <div class="chat-msgs">${messages(s.messages)}</div>
    <div class="chat-input"><span class="ci-ico">${icon("clip")}</span>
      <span class="ci-ph">Message #${esc(s.channel)}</span><span class="ci-ico">${icon("smile")}</span></div>
  </div>`;
}

function memberRow(m: Member) {
  const off = m.status === "offline";
  const av = m.avatar
    ? `<img class="mem-av" src="${m.avatar}" alt="">`
    : `<div class="mem-av mem-av-fb" style="background:${m.color ?? "#3a3a44"}">${esc(initial(m.name))}</div>`;
  let sub = "";
  if (!off && m.presence) {
    sub = `<span class="mem-act"><span class="act-ico kind-${m.presence.kind}">${icon(PRESENCE_ICON[m.presence.kind])}</span><span class="act-title">${esc(m.presence.title)}</span></span>`;
  } else if (!off && m.customStatus) {
    sub = `<span class="mem-cs">${esc(m.customStatus)}</span>`;
  }
  return `<div class="mem${off ? " offline" : ""}">
    <div class="mem-avw">${av}<span class="sdot s-${m.status}"></span></div>
    <div class="mem-text"><span class="mn">${esc(m.name)}</span>${sub}</div>
  </div>`;
}

function memberList(s: Scene) {
  const groups = s.members
    .map(
      (g) => `<div class="mem-grp">
        <div class="mem-grp-head">
          <span class="mem-chev">${icon("chevron")}</span>
          <span class="mem-grp-name" style="color:${g.color}">${esc(g.label)}</span>
          <span class="mem-grp-ct">— ${g.members.length}</span>
        </div>
        ${g.members.map(memberRow).join("")}
      </div>`,
    )
    .join("");
  return `<div class="panel members">
    <div class="mem-head"><span class="dot"></span><span class="ct">${s.online} online</span>
      <span class="search">${icon("search")}</span></div>
    <div class="mem-scroll">${groups}</div></div>`;
}

function titlebar(s: Scene) {
  const vc = s.categories[1]?.channels[0]?.name ?? "Lounge";
  const winMin = `<svg width="10" height="10" viewBox="0 0 10 10"><rect y="4.5" width="10" height="1" fill="currentColor"/></svg>`;
  const winMax = `<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor"/></svg>`;
  const winClose = `<svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/></svg>`;
  return `<div class="tb">
    <span class="tb-brand"><img class="tb-cat" src="/argon-cat.svg" alt=""></span>
    <span class="tb-sep"></span>
    <span class="tb-crumb">${esc(s.server.name)}</span>
    <span class="tb-pill"><span class="sig">${icon("signal")}</span>${esc(vc)}<span class="timer">00:08</span><span class="dot"></span></span>
    <span class="tb-spacer"></span>
    <span class="tb-actions"><span class="tb-act">${icon("feedback")}</span><span class="tb-act">${icon("terminal")}</span></span>
    <span class="tb-ctrls"><span class="tb-wbtn">${winMin}</span><span class="tb-wbtn">${winMax}</span><span class="tb-wbtn close">${winClose}</span></span>
  </div>`;
}

/* ---- view renderers ----------------------------------------------------- */

function renderShell(s: Scene) {
  return `<div class="stage"><div class="win">
    ${titlebar(s)}
    <div class="shell">${rail(s)}${serverPanel(s)}${chatPanel(s)}${memberList(s)}</div>
  </div></div>`;
}

function renderChat(s: Scene) {
  return `<div class="stage" style="padding:18px">${chatPanel(s, "card chat")}</div>`;
}

function renderVoice(s: Scene) {
  const vc = s.categories[1].channels[0];
  const tiles = (vc.members ?? [])
    .map((m) => {
      if (m.state === "screen")
        return `<div class="vc-tile screen">
          <video class="vc-stream" data-src="/stream.webm" muted loop playsinline preload="none"></video>
          <span class="screenlabel">${icon("screen")} Sharing screen</span>
          <span class="tag"><img src="${m.avatar}" style="width:18px;height:18px;border-radius:50%">${esc(m.name)}</span></div>`;
      const cls = m.state === "speaking" ? " speaking" : "";
      const st =
        m.state === "muted"
          ? `<span class="tstate" style="color:hsl(0 72% 60%)">${icon("micOff")}</span>`
          : "";
      return `<div class="vc-tile${cls}"><img src="${m.avatar}" alt="">
        <span class="tag">${esc(m.name)}</span>${st}</div>`;
    })
    .join("");
  return `<div class="stage" style="padding:18px"><div class="card vc">
    <div class="vc-head"><span class="ico">${icon("volume")}</span><span class="cname">${esc(vc.name)}</span>
      <span class="ct">${vc.members?.length} connected</span></div>
    <div class="vc-grid">${tiles}</div>
    <div class="ctrlbar">
      <span class="ctrl-btn danger">${icon("phoneOff")}</span>
      <span class="ctrl-btn">${icon("mic")}</span>
      <span class="ctrl-btn">${icon("headphones")}</span>
      <span class="ctrl-btn">${icon("screen")}</span>
      <span class="ctrl-btn">${icon("camera")}</span>
      <span class="ctrl-btn">${icon("gamepad")}</span>
      <span class="ctrl-btn">${icon("octagon")}</span>
    </div>
  </div></div>`;
}

function renderInventory() {
  const items = demoCoins
    .map(
      (c) => `<div class="inv-item ${c.tier}"><img src="${c.src}" alt="">
        <span class="inv-lbl">${esc(c.label)}</span><span class="inv-rar">${esc(c.rarity)}</span></div>`,
    )
    .join("");
  return `<div class="stage" style="padding:18px"><div class="card inv">
    <div class="inv-grid">${items}</div>
    <div class="inv-level">
      <div class="inv-level-top"><span class="lv">Level 100</span><span class="xp">12,000 / 12,000 XP</span></div>
      <div class="inv-track"><span class="inv-fill" style="width:100%"></span></div>
    </div>
  </div></div>`;
}

function renderPlayframe() {
  const cards = demoGames
    .map(
      (g) => `<div class="pf-card${g.soon ? " soon" : ""}">
        <div class="pf-icon" style="background:linear-gradient(150deg,${g.color}33,${g.color}0d)">${g.glyph}</div>
        <span class="pf-name">${esc(g.name)}</span><span class="pf-meta">${esc(g.meta)}</span>
        ${g.soon ? "" : `<span class="pf-play">Play</span>`}</div>`,
    )
    .join("");
  return `<div class="stage" style="padding:18px"><div class="card pf">
    <div class="pf-head"><span class="ico">${icon("gamepad")}</span><span class="cname">PlayFrame</span>
      <span class="badge">In Voice</span></div>
    <div class="pf-grid">${cards}</div>
  </div></div>`;
}

const RENDER: Record<View, (s: Scene) => string> = {
  shell: renderShell,
  chat: renderChat,
  voice: renderVoice,
  inventory: () => renderInventory(),
  playframe: () => renderPlayframe(),
};

/* ---- element ------------------------------------------------------------ */

class ArgonClientMock extends HTMLElement {
  private ro?: ResizeObserver;
  private videoObserver?: IntersectionObserver;
  private fit?: HTMLElement;
  private outer?: HTMLElement;
  private timers: number[] = [];
  private stream: Message[] = [];
  private voiceJoinIv?: number;

  connectedCallback() {
    const view = ((this.getAttribute("view") as View) || "shell") in DESIGN
      ? (this.getAttribute("view") as View) || "shell"
      : "shell";
    const accent = this.getAttribute("accent");

    const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = sheet;
    root.replaceChildren(style);

    if (accent) root.host.setAttribute("style", `--primary:${accent}`);

    const outer = document.createElement("div");
    outer.className = "fit-outer";
    const fit = document.createElement("div");
    fit.className = "fit";
    fit.style.width = DESIGN[view] + "px";

    // Chat-bearing views: pick a random dialogue preset, show the first slice, stream the rest.
    let sceneForRender = demoScene;
    if (view === "shell" || view === "chat") {
      const stamped: Message[] = PAGE_PRESET.map((m, i) => ({ ...m, time: m.time ?? clock(i) }));
      if (stamped.length) stamped[0] = { ...stamped[0], date: "Today" };
      const INITIAL = 6;
      sceneForRender = { ...demoScene, messages: stamped.slice(0, INITIAL) };
      this.stream = stamped.slice(INITIAL);
    }

    fit.innerHTML = RENDER[view](sceneForRender);
    outer.appendChild(fit);
    root.appendChild(outer);

    // Screen-share clips load and play only while the mock is on screen, and
    // never for visitors who asked for reduced motion. Attaching src lazily
    // keeps the clip off the critical path of the landing page entirely.
    const videos = root.querySelectorAll<HTMLVideoElement>("video.vc-stream");
    if (videos.length) {
      const reduceMotion =
        typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduceMotion) {
        this.videoObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const v = entry.target as HTMLVideoElement;
            if (entry.isIntersecting) {
              if (!v.src && v.dataset.src) v.src = v.dataset.src;
              v.muted = true;
              v.play().catch(() => {});
            } else if (!v.paused) {
              v.pause();
            }
          }
        }, { rootMargin: "200px" });
        videos.forEach((v) => this.videoObserver!.observe(v));
      }
    }

    this.fit = fit;
    this.outer = outer;

    this.scale(view);
    this.ro = new ResizeObserver(() => this.scale(view));
    this.ro.observe(this);

    // Live presentation loop — pure mock motion (talk / join / leave / type), no logic.
    // Safe because the window has a fixed height: inner panels scroll, layout never grows.
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) this.startAnim(view, root);
  }

  disconnectedCallback() {
    this.ro?.disconnect();
    this.videoObserver?.disconnect();
    this.timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
    this.timers = [];
  }

  private startAnim(view: View, root: ShadowRoot) {
    if (view === "shell" || view === "chat") this.animChat(root);
    if (view === "shell" || view === "voice") this.animVoice(root, view);
    if (view === "shell") { this.animPresence(root); this.animTimer(root); }
  }

  /** Tick the titlebar voice-call timer (starts at 00:08). */
  private animTimer(root: ShadowRoot) {
    const el = root.querySelector<HTMLElement>(".tb-pill .timer");
    if (!el) return;
    let secs = 8;
    const iv = window.setInterval(() => {
      secs++;
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      el.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }, 1000);
    this.timers.push(iv);
  }

  /** Stream the chosen preset one message at a time — typing pill (real-client style)
   *  under the header → bubble. Plays through once, then everyone winds down. */
  private animChat(root: ShadowRoot) {
    const box = root.querySelector<HTMLElement>(".chat-msgs");
    const pill = root.querySelector<HTMLElement>(".typing-pill");
    const pillText = root.querySelector<HTMLElement>(".typing-pill .tp-text");
    if (!box || !this.stream.length) return;
    const cap = 14;
    let si = 0;
    const scrollDown = () => { box.scrollTop = box.scrollHeight; };
    scrollDown();
    const iv = window.setInterval(() => {
      if (si >= this.stream.length) { clearInterval(iv); this.windDown(root); return; }
      const m = this.stream[si++];
      if (pill && pillText) { pillText.textContent = `${m.author} is typing`; pill.classList.add("show"); }
      const t = window.setTimeout(() => {
        pill?.classList.remove("show");
        const wrap = document.createElement("div");
        wrap.innerHTML = oneMessage(m, false);
        const row = wrap.firstElementChild as HTMLElement | null;
        if (!row) return;
        row.classList.add("msg-enter");
        box.appendChild(row);
        requestAnimationFrame(() => row.classList.remove("msg-enter"));
        scrollDown();
        let msgs = box.querySelectorAll(".msg");
        while (msgs.length > cap) {
          const firstDivider = box.querySelector(".divider");
          if (firstDivider && firstDivider === box.firstElementChild) firstDivider.remove();
          box.querySelector(".msg")?.remove();
          msgs = box.querySelectorAll(".msg");
        }
      }, 1200);
      this.timers.push(t);
    }, 3800);
    this.timers.push(iv);
  }

  /** End of the night: stop people joining; drain voice down to the local user + one. */
  private windDown(root: ShadowRoot) {
    if (this.voiceJoinIv) { clearInterval(this.voiceJoinIv); this.voiceJoinIv = undefined; }
    const vusers = root.querySelector<HTMLElement>(".vusers");
    const countEl = root.querySelector<HTMLElement>(".chan.voice.live .count");
    if (!vusers) return;
    const drain = window.setInterval(() => {
      const removable = Array.from(vusers.querySelectorAll<HTMLElement>(".vuser:not(.me)"));
      if (removable.length <= 1) { clearInterval(drain); return; } // Kuku + 1 stay chilling
      const row = removable[removable.length - 1];
      row.classList.add("v-leaving");
      const t = window.setTimeout(() => {
        row.remove();
        if (countEl) countEl.textContent = String(vusers.querySelectorAll(".vuser").length);
      }, 320);
      this.timers.push(t);
    }, 1500);
    this.timers.push(drain);
  }

  /** Rich presences drift over time (themed to the chat). */
  private animPresence(root: ShadowRoot) {
    const iv = window.setInterval(() => {
      const rows = Array.from(root.querySelectorAll<HTMLElement>(".mem:not(.offline)"));
      if (!rows.length) return;
      const text = rows[Math.floor(Math.random() * rows.length)].querySelector<HTMLElement>(".mem-text");
      if (!text) return;
      const p = demoPresences[Math.floor(Math.random() * demoPresences.length)];
      text.querySelector(".mem-act")?.remove();
      text.querySelector(".mem-cs")?.remove();
      const span = document.createElement("span");
      span.className = "mem-act pres-enter";
      span.innerHTML = `<span class="act-ico kind-${p.kind}">${icon(PRESENCE_ICON[p.kind])}</span><span class="act-title">${esc(p.title)}</span>`;
      text.appendChild(span);
      requestAnimationFrame(() => span.classList.remove("pres-enter"));
    }, 2600);
    this.timers.push(iv);
  }

  /** Several members talk at once (random each tick); people drop in/out of voice. */
  private animVoice(root: ShadowRoot, view: View) {
    const spk = window.setInterval(() => {
      const all = Array.from(root.querySelectorAll<HTMLElement>(".vuser, .vc-tile"));
      all.forEach((el) => {
        const blocked =
          el.classList.contains("screen") ||
          el.querySelector(".vstate.muted") ||
          el.querySelector(".vstate.screen") ||
          el.querySelector(".tstate");
        if (blocked) { el.classList.remove("speaking"); return; }
        el.classList.toggle("speaking", Math.random() < 0.45);
      });
    }, 1500);
    this.timers.push(spk);

    if (view !== "shell") return;
    const vusers = root.querySelector<HTMLElement>(".vusers");
    const countEl = root.querySelector<HTMLElement>(".chan.voice.live .count");
    if (!vusers) return;
    const bench: VoiceMember[] = [...demoVoicePool];
    const updateCount = () => { if (countEl) countEl.textContent = String(vusers.querySelectorAll(".vuser").length); };
    this.voiceJoinIv = window.setInterval(() => {
      const all = Array.from(vusers.querySelectorAll<HTMLElement>(".vuser"));
      const removable = all.filter((r) => !r.classList.contains("me")); // never drop the local account
      const n = all.length;
      const leave = n >= 5 || (n > 2 && Math.random() < 0.5);
      if (leave && removable.length) {
        const row = removable[Math.floor(Math.random() * removable.length)];
        bench.push({ name: row.querySelector(".vn")?.textContent ?? "", avatar: row.querySelector("img")?.getAttribute("src") ?? "" });
        row.classList.add("v-leaving");
        const t = window.setTimeout(() => { row.remove(); updateCount(); }, 320);
        this.timers.push(t);
      } else if (bench.length) {
        const m = bench.shift()!;
        const wrap = document.createElement("div");
        wrap.innerHTML = buildVuser(m, false);
        const row = wrap.firstElementChild as HTMLElement | null;
        if (!row) return;
        row.classList.add("v-joining");
        vusers.appendChild(row);
        requestAnimationFrame(() => row.classList.remove("v-joining"));
        updateCount();
      }
    }, 6500);
    this.timers.push(this.voiceJoinIv);
  }

  private scale(view: View) {
    if (!this.fit || !this.outer) return;
    const avail = this.clientWidth || this.getBoundingClientRect().width;
    if (!avail) return;
    const design = DESIGN[view];
    // Scale to fit; on narrow screens clamp to a minimum and center-crop the
    // overflow — so on mobile you see a legible middle slice (the chat), not a thumbnail.
    const s = Math.max(0.6, Math.min(1, avail / design));
    const offsetX = Math.round((avail - design * s) / 2); // negative => crop, centered
    this.fit.style.transform = `translateX(${offsetX}px) scale(${s})`;
    this.outer.style.height = this.fit.offsetHeight * s + "px";
  }
}

if (!customElements.get("argon-client-mock")) {
  customElements.define("argon-client-mock", ArgonClientMock);
}

export {};
