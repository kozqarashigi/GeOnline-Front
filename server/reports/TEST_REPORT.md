# GeoOnline API — тест есебі

**Уақыт (UTC):** 2026-05-03T08:58:19.448Z  
**Нәтиже:**  PASS (exit code 0)

## Шығыс (stdout)

```text
▶ dashboardDefaults
  ✔ buildDefaultTopics has 6 topics with aligned item keys (1.0717ms)
  ✔ mergeTopicsWithDefaults returns defaults for empty input (1.1435ms)
  ✔ mergeTopicsWithDefaults clamps percent and merges item done flags (0.2907ms)
  ✔ getDefaultDashboardState has weekPlan and topics (0.177ms)
  ✔ ALLOWED_TOPIC_IDS contains geo (0.0812ms)
✔ dashboardDefaults (3.7477ms)
▶ phone
  ✔ normalizeKzPhone accepts 10 digits (0.8135ms)
  ✔ normalizeKzPhone accepts 11 with leading 7 or 8 (0.1431ms)
  ✔ normalizeKzPhone returns null for invalid (1.075ms)
  ✔ maskPhoneForLog hides middle digits (0.2269ms)
✔ phone (3.3512ms)
ℹ tests 9
ℹ suites 2
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 96.6125
```

## STDERR

```text
(бос)
```

---

Орындау: `npm test` немесе `npm run test:report`  
Тесттер қалтасы: `server/tests/`
