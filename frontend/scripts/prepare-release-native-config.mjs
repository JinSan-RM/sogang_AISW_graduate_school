import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict") || process.env.EAS_BUILD_PROFILE === "production";

if (!strict) {
  console.log("Native release configuration injection skipped for a non-production build.");
  process.exit(0);
}

const destination = path.join(projectRoot, "android", "app", "google-services.json");
const source = process.env.GOOGLE_SERVICES_JSON;

if (!source && !fs.existsSync(destination)) {
  console.error(
    "Production Android builds require GOOGLE_SERVICES_JSON as an EAS file environment variable.",
  );
  process.exit(1);
}

if (source) {
  const sourcePath = path.resolve(source);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    console.error("GOOGLE_SERVICES_JSON must point to an existing file.");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  } catch {
    console.error("GOOGLE_SERVICES_JSON must contain valid JSON.");
    process.exit(1);
  }

  if (!parsed.project_info || !Array.isArray(parsed.client)) {
    console.error("GOOGLE_SERVICES_JSON is not a valid Firebase Android client configuration.");
    process.exit(1);
  }

  fs.copyFileSync(sourcePath, destination);
  console.log("Injected Firebase Android client configuration for this build.");
}
