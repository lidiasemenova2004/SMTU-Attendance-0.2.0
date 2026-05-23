import { runFullPipeline } from "./pipeline.ts";
import * as fs from "fs";
import * as path from "path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const EMAIL = process.env.ISU_EMAIL || "your_email@smtu.ru";
  const PASS = process.env.ISU_PASSWORD || "your_password";

  try {
    const { stats } = await runFullPipeline(EMAIL, PASS);

    const outPath = path.resolve(__dirname, "../attendance_report.json");
    fs.writeFileSync(outPath, JSON.stringify(stats, null, 2));
    console.log(`Report saved: ${outPath}`);
  } catch (error) {
    console.error("Pipeline error:", error);
    process.exit(1);
  }
}

main();
