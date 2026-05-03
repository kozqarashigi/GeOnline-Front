/**
 * Тесттерді іске қосады және reports/TEST_REPORT.md Markdown есебін жазады.
 * Қолдану: npm run test:report
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const testsDir = join(root, "tests");
const reportsDir = join(root, "reports");
const testFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith(".test.js"))
  .map((name) => join(testsDir, name));

const r = spawnSync(process.execPath, ["--test", "--test-reporter=spec", ...testFiles], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NODE_DISABLE_COLORS: "1" },
});

const ts = new Date().toISOString();
const status = r.status === 0 ? "✅ PASS" : "❌ FAIL";
const md = `# GeoOnline API — тест есебі

**Уақыт (UTC):** ${ts}  
**Нәтиже:** ${status} (exit code ${r.status ?? "?"})

## Шығыс (stdout)

\`\`\`text
${(r.stdout || "").trim() || "(бос)"}
\`\`\`

## STDERR

\`\`\`text
${(r.stderr || "").trim() || "(бос)"}
\`\`\`

---

Орындау: \`npm test\` немесе \`npm run test:report\`  
Тесттер қалтасы: \`server/tests/\`
`;

mkdirSync(reportsDir, { recursive: true });
writeFileSync(join(reportsDir, "TEST_REPORT.md"), md, "utf8");

console.log(`Report written: ${join("reports", "TEST_REPORT.md")}`);
process.exit(r.status === null ? 1 : r.status);
