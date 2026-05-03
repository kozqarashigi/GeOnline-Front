/**
 * Windows-та `node --test tests` қалтасын тану мәселесін айналып өтеді:
 * барлық tests/*.test.js файлдарын нақты тізіммен іске қосады.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = join(root, "tests");
const testFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith(".test.js"))
  .map((name) => join(testsDir, name));

const r = spawnSync(
  process.execPath,
  ["--test", "--test-reporter=spec", ...testFiles],
  { cwd: root, stdio: "inherit" }
);
process.exit(r.status === null ? 1 : r.status);
