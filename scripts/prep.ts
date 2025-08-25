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

  // Try different dependency installation methods in order
  const dependencyCommands = [
    { command: "npm ci", description: "Installing dependencies with npm ci" },
    { command: "npm install", description: "Installing dependencies with npm install" },
    { command: "npm run deps:update", description: "Updating dependencies" },
  ];

  let depsInstalled = false;
  for (const { command, description } of dependencyCommands) {
    const result = runCommand(command, description);
    if (result.success) {
      depsInstalled = true;
      break;
    }
  }

  if (!depsInstalled) {
    console.error("❌ Failed to install dependencies");
    process.exit(1);
  }

  // Build and package commands
  const buildCommands = [
    { command: "npm run build", description: "Building project" },
    { command: "npm run package", description: "Packaging with ncc" },
  ];

  for (const { command, description } of buildCommands) {
    const result = runCommand(command, description);
    if (!result.success) {
      process.exit(1);
    }
  }

  // Linting and formatting
  const lintFormatCommands = [
    { command: "npm run lint:fix", description: "Fixing lint errors" },
    { command: "npm run format", description: "Formatting code" },
  ];

  for (const { command, description } of lintFormatCommands) {
    const result = runCommand(command, description);
    if (!result.success) {
      process.exit(1);
    }
  }

  // Testing
  const testCommands = [
    { command: "npm test", description: "Running tests" },
    { command: "npm run test:coverage", description: "Running test coverage" },
  ];

  for (const { command, description } of testCommands) {
    const result = runCommand(command, description);
    if (!result.success) {
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
