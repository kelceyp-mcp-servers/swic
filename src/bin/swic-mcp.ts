#!/usr/bin/env node
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// package root when this file is installed at <pkg>/bin/swic-mcp.js
const pkgRoot = resolve(__dirname, "..");
const serverJs = resolve(pkgRoot, "dist/server/Server.js");

if (!existsSync(serverJs)) {
    console.error(`[swic-mcp] server bundle not found at ${serverJs}`);
    console.error(`[swic-mcp] Did you run the build? Expecting dist/server/Server.js in the published package.`);
    process.exit(1);
}

// allow overriding bun path if needed (e.g. CLAUDE env)
const bunBin =
    process.env.BUN_BIN ||
    process.env.BUN ||
    process.env.BUN_PATH ||
    "bun";

const child = spawn(bunBin, [serverJs, ...process.argv.slice(2)], {
    stdio: "inherit",
});

child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
});

child.on("error", (err) => {
    console.error("[swic-mcp] failed to spawn bun:", err);
    process.exit(1);
});
