import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALLOWED_TOPIC_IDS,
  buildDefaultTopics,
  getDefaultDashboardState,
  mergeTopicsWithDefaults,
} from "../src/lib/dashboardDefaults.js";

describe("dashboardDefaults", () => {
  it("buildDefaultTopics has 6 topics with aligned item keys", () => {
    const topics = buildDefaultTopics();
    assert.equal(topics.length, 6);
    assert.equal(topics[0].id, "softskills");
    assert.equal(topics[2].id, "geo");
    assert.deepEqual(
      topics[2].items.map((i) => i.key),
      ["modules", "trial", "repeat"],
    );
  });

  it("mergeTopicsWithDefaults returns defaults for empty input", () => {
    const a = mergeTopicsWithDefaults([]);
    const b = mergeTopicsWithDefaults(null);
    assert.equal(a.length, 6);
    assert.equal(b.length, 6);
    assert.equal(a.find((t) => t.id === "geo").percent, 0);
  });

  it("mergeTopicsWithDefaults clamps percent and merges item done flags", () => {
    const merged = mergeTopicsWithDefaults([
      {
        id: "geo",
        percent: 150,
        items: [
          { key: "modules", done: true },
          { key: "trial", done: false },
        ],
      },
    ]);
    const geo = merged.find((t) => t.id === "geo");
    assert.equal(geo.percent, 100);
    const byKey = new Map(geo.items.map((i) => [i.key, i]));
    assert.equal(byKey.get("modules").done, true);
    assert.equal(byKey.get("trial").done, false);
    assert.equal(byKey.get("repeat").done, false);
  });

  it("getDefaultDashboardState has weekPlan and topics", () => {
    const s = getDefaultDashboardState();
    assert.ok(Array.isArray(s.weekPlan));
    assert.equal(s.topics.length, 6);
  });

  it("ALLOWED_TOPIC_IDS contains geo", () => {
    assert.equal(ALLOWED_TOPIC_IDS.has("geo"), true);
    assert.equal(ALLOWED_TOPIC_IDS.has("unknown"), false);
  });
});
