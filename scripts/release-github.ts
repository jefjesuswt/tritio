import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const corePackagePath = join(process.cwd(), "packages/core/package.json");
const corePackage = JSON.parse(readFileSync(corePackagePath, "utf-8"));
const version = corePackage.version;
const tagName = `v${version}`;

console.log(`🚀 Preparing release for ${tagName}...`);

const checkTag = spawnSync("git", ["tag", "-l", tagName]);
if (checkTag.stdout.toString().trim() === tagName) {
  console.log(`⚠️ Tag ${tagName} already exists. Skipping tag creation.`);
} else {
  console.log(`🏷️ Creating git tag ${tagName}...`);
  spawnSync("git", ["config", "user.name", "github-actions[bot]"], {
    stdio: "inherit",
  });
  spawnSync(
    "git",
    ["config", "user.email", "github-actions[bot]@users.noreply.github.com"],
    { stdio: "inherit" },
  );

  spawnSync("git", ["tag", tagName], { stdio: "inherit" });
  spawnSync("git", ["push", "origin", tagName], { stdio: "inherit" });
}

console.log(`📦 Creating GitHub Release ${tagName}...`);

const releaseCmd = spawnSync(
  "gh",
  ["release", "create", tagName, "--title", tagName, "--generate-notes"],
  { stdio: "inherit" },
);

if (releaseCmd.status !== 0) {
  console.error("❌ Failed to create GitHub Release");
} else {
  console.log("✅ GitHub Release created successfully!");
}
