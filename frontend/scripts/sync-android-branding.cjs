/* global __dirname */
// Synchronize branding without rerunning unrelated native configuration plugins.
// These plugin entry points are pinned by the Expo SDK 54 lockfile.
const fs = require("node:fs");
const path = require("node:path");
const { compileModsAsync } = require("@expo/config-plugins");
const { withAndroidIcons } = require("@expo/prebuild-config/build/plugins/icons/withAndroidIcons");
const { withAndroidSplashScreen } = require("@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/withAndroidSplashScreen");

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  let config = JSON.parse(fs.readFileSync(path.join(projectRoot, "app.json"), "utf8")).expo;
  const splash = config.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen",
  )?.[1];
  if (!config.icon || !splash?.image) {
    throw new Error("Configure the approved icon and expo-splash-screen image first.");
  }

  config._internal = { projectRoot };
  config = withAndroidIcons(config);
  config = withAndroidSplashScreen(config, { ...splash, ...splash.android });
  await compileModsAsync(config, { projectRoot, platforms: ["android"] });
  console.log("Android launcher icons and splash configuration synchronized.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
