/** Тақырыптар: тұрақты id — клиенттегі i18n кілттерімен сәйкеседі. */

const TOPIC_BLUEPRINT = [
  { id: "softskills", items: ["intro", "video", "quiz"] },
  { id: "personal", items: ["intro", "video", "quiz"] },
  { id: "geo", items: ["modules", "trial", "repeat"] },
  { id: "math_gani", items: ["theory", "practice", "mock"] },
  { id: "math_oryn", items: ["theory", "practice", "mock"] },
  { id: "reading", items: ["speed", "analysis", "exam"] },
];

export function buildDefaultTopics() {
  return TOPIC_BLUEPRINT.map((t) => ({
    id: t.id,
    percent: 0,
    items: t.items.map((key) => ({ key, done: false })),
  }));
}

export function getDefaultDashboardState() {
  return {
    streak: 0,
    lastActiveDay: "",
    topics: buildDefaultTopics(),
    weekPlan: [],
  };
}

export const ALLOWED_TOPIC_IDS = new Set(TOPIC_BLUEPRINT.map((t) => t.id));

export function mergeTopicsWithDefaults(storedTopics) {
  const defaults = buildDefaultTopics();
  if (!Array.isArray(storedTopics) || storedTopics.length === 0) return defaults;
  const byId = new Map(storedTopics.map((t) => [t.id, t]));
  return defaults.map((d) => {
    const ex = byId.get(d.id);
    if (!ex) return { ...d, items: d.items.map((i) => ({ ...i })) };
    const itemByKey = new Map((ex.items || []).map((i) => [i.key, i]));
    const items = d.items.map((defI) => {
      const cur = itemByKey.get(defI.key);
      return { key: defI.key, done: Boolean(cur?.done) };
    });
    const p = Number(ex.percent);
    const percent = Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;
    return { id: d.id, percent, items };
  });
}
