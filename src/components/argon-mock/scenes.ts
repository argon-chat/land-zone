// Static demo data for <argon-client-mock>. No business logic — pure presentation
// fixtures that mirror the real Argon client so docs/landing can show honest UI.

export type VoiceState = "speaking" | "idle" | "muted" | "screen";

export interface VoiceMember {
  name: string;
  avatar: string;
  state?: VoiceState;
  me?: boolean; // the local account — pinned, never auto-removed
}

export interface Channel {
  type: "text" | "voice" | "announce";
  name: string;
  active?: boolean;
  members?: VoiceMember[];
}

export interface Category {
  label: string;
  channels: Channel[];
}

export interface Message {
  author: string;
  color: string;
  avatar: string;
  time: string;
  text: string;
  date?: string; // date divider shown ABOVE this message
  reply?: { author: string; color: string; text: string };
  own?: boolean;
  grouped?: boolean; // continuation of previous author (no avatar/meta)
}

export type PresenceKind = "game" | "listen" | "software" | "stream";
export type MemberStatus = "online" | "away" | "dnd" | "touchgrass" | "offline";

export interface Member {
  name: string;
  avatar?: string; // image; if omitted, an initial-on-color fallback is drawn
  color?: string; // fallback avatar background
  status: MemberStatus;
  presence?: { kind: PresenceKind; title: string };
  customStatus?: string;
}

export interface MemberGroup {
  label: string;
  color: string;
  members: Member[];
}

export interface Scene {
  server: { name: string; verified?: boolean; boostLevel: number; boostPct: number; banner?: string };
  rail: { src?: string; initial?: string; color?: string; active?: boolean }[];
  categories: Category[];
  user: { name: string; status: string; avatar: string };
  channel: string;
  online: string;
  messages: Message[];
  members: MemberGroup[];
}

const AV = {
  yuuki: "/avatars/yuuki.svg",
  ren: "/avatars/ren.svg",
  boba: "/avatars/boba.svg",
  kai: "/avatars/kai.svg",
  ava: "/avatars/ava.png",
  dox: "/avatars/dox.png",
  gox: "/avatars/gox.png",
  himar: "/avatars/himar.png",
  lura: "/avatars/lura.png",
  chiff: "/avatars/chiff.png",
  koda: "/avatars/koda.png",
  luci: "/avatars/luci.png",
};

const C = {
  yuuki: "#a78bfa",
  boba: "#c084fc",
  ren: "#22d3ee",
  kai: "#34d399",
  nova: "#38bdf8",
  mochi: "#f0abfc",
  chiff: "#fbbf24",
  koda: "#5eead4",
  luna: "#fda4af",
};

export const demoScene: Scene = {
  server: { name: "Argon HQ", verified: true, boostLevel: 13, boostPct: 72, banner: "/avatars/space_banner.png" },
  rail: [
    { initial: "A", color: "#8b5cf6", active: true },
    { initial: "P", color: "#06b6d4" },
    { initial: "G", color: "#f59e0b" },
    { initial: "R", color: "#ef4444" },
    { initial: "N", color: "#10b981" },
  ],
  categories: [
    {
      label: "💬 ⏐ TEXT",
      channels: [
        { type: "text", name: "general", active: true },
        { type: "text", name: "off-topic" },
        { type: "announce", name: "announcements" },
        { type: "text", name: "showcase" },
      ],
    },
    {
      label: "🔊 ⏐ VOICE",
      channels: [
        {
          type: "voice",
          name: "Lounge",
          active: true,
          members: [
            { name: "Kuku", avatar: AV.luci, state: "idle", me: true },
            { name: "Nova", avatar: AV.dox, state: "speaking" },
            { name: "Chiff", avatar: AV.chiff, state: "screen" },
            { name: "Koda", avatar: AV.koda, state: "muted" },
          ],
        },
        {
          type: "voice",
          name: "Gaming",
          members: [
            { name: "Volt", avatar: AV.himar, state: "speaking" },
            { name: "Luci", avatar: AV.gox, state: "idle" },
          ],
        },
      ],
    },
  ],
  user: { name: "Kuku", status: "Online", avatar: AV.luci },
  channel: "general",
  online: "4,218",
  messages: [
    { date: "Today", author: "Ren", color: C.ren, avatar: AV.ren, time: "11:38 PM", text: "lost 4 ranked in a row, i'm actually done 🙃" },
    {
      author: "Nova", color: C.nova, avatar: AV.dox, time: "11:39 PM",
      reply: { author: "Ren", color: C.ren, text: "lost 4 ranked in a row, i'm actually done 🙃" },
      text: "what rank are you even at rn",
    },
    { author: "Ren", color: C.ren, avatar: AV.ren, time: "11:39 PM", text: "was almost immortal, my duo whiffed every clutch fml" },
    { author: "Mochi", color: C.mochi, avatar: AV.gox, time: "11:40 PM", text: "unrelated but what's everyone eating, i'm starving 🍜" },
    { author: "Boba", color: C.boba, avatar: AV.boba, time: "11:40 PM", text: "third night of instant ramen, send help" },
  ],
  members: [
    {
      label: "OWNER", color: "#f0b232",
      members: [
        { name: "Yuuki", avatar: AV.yuuki, status: "online", presence: { kind: "stream", title: "Argon dev stream" } },
      ],
    },
    {
      label: "ADMIN", color: "#f23f43",
      members: [
        { name: "Boba", avatar: AV.boba, status: "online", presence: { kind: "game", title: "Counter-Strike 2" } },
        { name: "Aria", avatar: AV.ava, status: "dnd", presence: { kind: "software", title: "VS Code" } },
      ],
    },
    {
      label: "MODERATOR", color: "#3ba55d",
      members: [
        { name: "Ren", avatar: AV.ren, status: "online", presence: { kind: "game", title: "VALORANT" } },
        { name: "Kai", avatar: AV.kai, status: "away", presence: { kind: "listen", title: "Lofi Girl" } },
        { name: "Nova", avatar: AV.dox, status: "online", presence: { kind: "game", title: "Baldur's Gate 3" } },
      ],
    },
    {
      label: "BOOSTER", color: "#f47fff",
      members: [
        { name: "Mochi", avatar: AV.gox, status: "online", customStatus: "uwu 🌸" },
        { name: "Echo", avatar: AV.himar, status: "away", presence: { kind: "listen", title: "Spotify" } },
        { name: "Sage", avatar: AV.lura, status: "touchgrass", presence: { kind: "stream", title: "art commissions" } },
      ],
    },
    {
      label: "MEMBER", color: "#9aa0aa",
      members: [
        { name: "Glitch", color: "#ef4444", status: "online", presence: { kind: "game", title: "Elden Ring" } },
        { name: "Volt", color: "#f59e0b", status: "dnd", presence: { kind: "game", title: "Rocket League" } },
        { name: "Pixel", avatar: AV.gox, status: "online", presence: { kind: "game", title: "Minecraft" } },
        { name: "Luna", avatar: AV.ava, status: "online", presence: { kind: "software", title: "Figma" } },
        { name: "Riku", color: "#3b82f6", status: "away", customStatus: "brb, food 🍜" },
        { name: "Tako", avatar: AV.himar, status: "online" },
        { name: "Frost", color: "#0ea5e9", status: "dnd", presence: { kind: "game", title: "Apex Legends" } },
        { name: "Juno", avatar: AV.dox, status: "online", presence: { kind: "listen", title: "Daft Punk" } },
        { name: "Wren", color: "#6366f1", status: "touchgrass" },
      ],
    },
    {
      label: "OFFLINE", color: "#6b7280",
      members: [
        { name: "Aram", avatar: AV.lura, status: "offline" },
        { name: "Bento", color: "#6b7280", status: "offline" },
        { name: "Vex", avatar: AV.ren, status: "offline" },
        { name: "Zephyr", color: "#6b7280", status: "offline" },
        { name: "Mika", avatar: AV.kai, status: "offline" },
        { name: "Dao", color: "#6b7280", status: "offline" },
      ],
    },
  ],
};

export interface Coin {
  src: string;
  label: string;
  rarity: string;
  tier: "relic" | "legendary" | "rare" | "secret";
}

export const demoCoins: Coin[] = [
  { src: "/coins/staff.webp", label: "Staff Coin", rarity: "RELIC", tier: "relic" },
  { src: "/coins/year2026.webp", label: "Year 2026", rarity: "LEGENDARY", tier: "legendary" },
  { src: "/coins/contributor.webp", label: "Contributor", rarity: "RARE", tier: "rare" },
  { src: "/coins/secret.webp", label: "???", rarity: "CLASSIFIED", tier: "secret" },
];

export interface Game {
  name: string;
  meta: string;
  glyph: string;
  color: string;
  soon?: boolean;
}

export const demoGames: Game[] = [
  { name: "Pong", meta: "2 players · Classic", glyph: "🏓", color: "#a855f7" },
  { name: "Snake", meta: "Solo · Highscore", glyph: "🐍", color: "#06b6d4" },
  { name: "Sea Battle", meta: "2 players · Strategy", glyph: "🚢", color: "#34d399" },
  { name: "More soon", meta: "SDK available", glyph: "🎮", color: "#6b7280", soon: true },
];

// Continuation of the chat — streamed in by the animator (loops). Several
// overlapping threads at once (ranked tilt, food, a game patch, a quick pong)
// so it reads like a real busy server, not one repeated topic.
export const demoChatQueue: Message[] = [
  { author: "Chiff", color: C.chiff, avatar: AV.chiff, time: "now", text: "yo the new patch dropped, they FINALLY nerfed the shotgun" },
  { author: "Koda", color: C.koda, avatar: AV.koda, time: "now", text: "wait for real? where's the patch notes" },
  { author: "Nova", color: C.nova, avatar: AV.dox, time: "now", text: "it's never your fault is it ren 😂" },
  { author: "Luna", color: C.luna, avatar: AV.ava, time: "now", text: "ordered sushi, feeling fancy tonight 🍣" },
  { author: "Ren", color: C.ren, avatar: AV.ren, time: "now", text: "the matchmaking is RIGGED i stg, hardstuck through no fault of mine" },
  { author: "Chiff", color: C.chiff, avatar: AV.chiff, time: "now", text: "they also fixed the launch stutter, runs buttery now" },
  { author: "Mochi", color: C.mochi, avatar: AV.gox, time: "now", text: "making pasta, got enough for like 3 ppl if anyone's down" },
  { author: "Yuuki", color: C.yuuki, avatar: AV.yuuki, time: "now", text: "12gb update of course 🙄 downloading now" },
  { author: "Kai", color: C.kai, avatar: AV.kai, time: "now", text: "anyone wanna queue a quick pong in playframe to cool off?" },
  { author: "Boba", color: C.boba, avatar: AV.boba, time: "now", text: "yeah one sec, finishing the ramen first 😅" },
  { author: "Luna", color: C.luna, avatar: AV.ava, time: "now", text: "the shotgun nerf is huge tho, that thing was broken" },
  { author: "Koda", color: C.koda, avatar: AV.koda, time: "now", text: "rip my entire main strat lmao" },
  { author: "Nova", color: C.nova, avatar: AV.dox, time: "now", text: "i'll host the pong lobby, hop in whenever" },
  { author: "Ren", color: C.ren, avatar: AV.ren, time: "now", text: "fine ONE round then i'm back to climbing" },
  { author: "Mochi", color: C.mochi, avatar: AV.gox, time: "now", text: "pasta's ready, brb 🍝" },
  { author: "Chiff", color: C.chiff, avatar: AV.chiff, time: "now", text: "patch notes are massive, they reworked the whole map pool too" },
];

// People the animator can drop into / out of the voice channel.
export const demoVoicePool: VoiceMember[] = [
  { name: "Yuuki", avatar: AV.yuuki },
  { name: "Ren", avatar: AV.ren },
  { name: "Boba", avatar: AV.boba },
  { name: "Kai", avatar: AV.kai },
  { name: "Luna", avatar: AV.ava },
  { name: "Sage", avatar: AV.lura },
];

// Rich-presence pool the animator rotates through — themed to match the chat
// (pong/PlayFrame, the games people mention, streaming the match, music while waiting).
export const demoPresences: { kind: PresenceKind; title: string }[] = [
  { kind: "game", title: "VALORANT — ranked" },
  { kind: "game", title: "Apex Legends" },
  { kind: "game", title: "Counter-Strike 2" },
  { kind: "game", title: "Pong — PlayFrame" },
  { kind: "game", title: "Baldur's Gate 3" },
  { kind: "stream", title: "ranked grind (on tilt)" },
  { kind: "stream", title: "reading patch notes" },
  { kind: "software", title: "downloading update…" },
  { kind: "listen", title: "Lofi Girl" },
  { kind: "listen", title: "dinner playlist" },
];
