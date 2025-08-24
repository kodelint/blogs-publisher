#!/usr/bin/env node

import { execSync } from "child_process";

interface RunCommandResult {
  success: boolean;
  error?: string;
}

function runCommand(command: string, description: string): RunCommandResult {
  console.log(`\n📋 ${description}...`);
  try {
    execSync(command, { stdio: "inherit" });
    console.log(`✅ ${description} completed successfully`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${description} failed:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

async function main(): Promise<void> {
  console.log("🚀 Starting preparation script...");

  // Try different dependency installation methods
  const depsResults = [
    runCommand("npm ci", "Installing dependencies with npm ci"),
    runCommand("npm install", "Installing dependencies with npm install"),
    runCommand("npm run deps:update", "Updating dependencies"),
  ];

  const depsInstalled = depsResults.some((result) => result.success);

  if (!depsInstalled) {
    console.error("❌ Failed to install dependencies");
    process.exit(1);
  }

  // Run tests
  const testResult = runCommand("npm test", "Running tests");
  if (!testResult.success) {
    process.exit(1);
  }

  const coverageResult = runCommand(
    "npm run test:coverage",
    "Running test coverage",
  );
  if (!coverageResult.success) {
    process.exit(1);
  }

  // Linting
  const lintResult = runCommand("npm run lint", "Running lint check");
  if (!lintResult.success) {
    console.log("⚠️  Lint errors found, attempting to fix...");
    const lintFixResult = runCommand("npm run lint:fix", "Fixing lint errors");
    if (!lintFixResult.success) {
      process.exit(1);
    }
  }

  // Formatting
  const formatCheckResult = runCommand(
    "npm run format:check",
    "Checking code format",
  );
  if (!formatCheckResult.success) {
    console.log("⚠️  Format issues found, formatting code...");
    const formatResult = runCommand("npm run format", "Formatting code");
    if (!formatResult.success) {
      process.exit(1);
    }
  }

  console.log("\n🎉 All preparation steps completed successfully!");
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled rejection:", reason);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
