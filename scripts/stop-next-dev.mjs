import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const projectDir = resolve(process.cwd()).toLowerCase();
const nextDevLogPath = join(process.cwd(), ".next", "dev", "logs", "next-development.log");

function runPowerShell(command) {
  return execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function getListeningProcessIds() {
  const command = [
    "$connections = Get-NetTCPConnection -LocalPort 3000,3001 -State Listen -ErrorAction SilentlyContinue;",
    "$connections | Select-Object -ExpandProperty OwningProcess -Unique",
  ].join(" ");

  try {
    return runPowerShell(command)
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter(Number.isInteger);
  } catch {
    return [];
  }
}

function getLoggedProcessId() {
  if (!existsSync(nextDevLogPath)) {
    return null;
  }

  const logContent = readFileSync(nextDevLogPath, "utf8");
  const match = logContent.match(/PID:\s+(\d+)/);

  return match ? Number(match[1]) : null;
}

function getProcessCommandLine(processId) {
  const command = `(Get-CimInstance Win32_Process -Filter "ProcessId = ${processId}").CommandLine`;

  try {
    return runPowerShell(command).toLowerCase();
  } catch {
    return "";
  }
}

function stopProcess(processId) {
  runPowerShell(`Stop-Process -Id ${processId} -Force`);
}

const candidateProcessIds = new Set(getListeningProcessIds());
const loggedProcessId = getLoggedProcessId();

if (loggedProcessId) {
  candidateProcessIds.add(loggedProcessId);
}

const stoppedProcessIds = [];

for (const processId of candidateProcessIds) {
  const commandLine = getProcessCommandLine(processId);

  if (!commandLine.includes("next") || !commandLine.includes(projectDir)) {
    continue;
  }

  stopProcess(processId);
  stoppedProcessIds.push(processId);
}

if (stoppedProcessIds.length === 0) {
  console.log("No Next dev server found for this project on ports 3000 or 3001.");
} else {
  console.log(`Stopped Next dev server PID(s): ${stoppedProcessIds.join(", ")}.`);
}
