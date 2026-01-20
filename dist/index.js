#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";

// src/commands/create.ts
import * as p from "@clack/prompts";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join as join2, dirname, basename, relative } from "path";
import chalk from "chalk";

// src/config.ts
import Conf from "conf";
import { homedir } from "os";
import { join } from "path";
var configSchema = {
  editor: {
    type: "string",
    enum: ["code", "cursor", "default", "none"],
    default: "code"
  },
  installDeps: {
    type: "boolean",
    default: true
  },
  lastPm: {
    type: ["string", "null"],
    enum: ["pnpm", "npm", "yarn", "bun", null],
    default: null
  }
};
var storeSchema = {
  worktrees: {
    type: "array",
    default: []
  }
};
var config = new Conf({
  projectName: "gwtree",
  schema: configSchema
});
var globalStore = new Conf({
  projectName: "gwtree",
  configName: "worktrees",
  cwd: join(homedir(), ".gwtree"),
  schema: storeSchema
});
function getConfig() {
  return {
    editor: config.get("editor"),
    installDeps: config.get("installDeps"),
    lastPm: config.get("lastPm")
  };
}
function setConfig(key, value) {
  config.set(key, value);
}
function resetConfig() {
  config.clear();
}
function getAllWorktrees() {
  return globalStore.get("worktrees") || [];
}
function addWorktreeRecord(record) {
  const worktrees = globalStore.get("worktrees") || [];
  worktrees.push(record);
  globalStore.set("worktrees", worktrees);
}
function removeWorktreeRecord(worktreePath) {
  const worktrees = globalStore.get("worktrees") || [];
  const index = worktrees.findIndex((w) => w.path === worktreePath);
  if (index !== -1) {
    const removed = worktrees.splice(index, 1)[0];
    globalStore.set("worktrees", worktrees);
    return removed;
  }
  return void 0;
}
function getConfigPath() {
  return config.path;
}

// src/commands/create.ts
function logStep(name, cmd, desc, error = false) {
  const color = error ? chalk.red : chalk.green;
  console.log(`\u2502`);
  console.log(`\u2502  ${color("\u25C6")}  ${color(name)}  ${chalk.dim(cmd)}`);
  console.log(`\u2502  ${chalk.dim("\u2514")}  ${chalk.dim(desc)}`);
}
function detectPackageManager(dir) {
  if (existsSync(join2(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join2(dir, "bun.lockb"))) return "bun";
  if (existsSync(join2(dir, "yarn.lock"))) return "yarn";
  if (existsSync(join2(dir, "package-lock.json"))) return "npm";
  if (existsSync(join2(dir, "package.json"))) return "pnpm";
  return null;
}
function getInstallCommand(pm) {
  switch (pm) {
    case "pnpm":
      return "pnpm install";
    case "yarn":
      return "yarn install";
    case "bun":
      return "bun install";
    default:
      return "npm install";
  }
}
async function createWorktree(branchArg, options) {
  const useDefaults = options?.yes ?? false;
  const noEditor = options?.noEditor ?? false;
  const savedConfig = getConfig();
  p.intro("Create Git Worktree");
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const repoName = basename(gitRoot);
    const parentDir = dirname(gitRoot);
    const cwd = process.cwd();
    const currentBranch = execSync("git branch --show-current", {
      encoding: "utf-8",
      cwd: gitRoot
    }).trim();
    const branches = execSync('git branch --format="%(refname:short)"', {
      encoding: "utf-8",
      cwd: gitRoot
    }).trim().split("\n").filter(Boolean);
    const mainBranch = branches.find((b) => b === "main" || b === "master") || "main";
    const statusOutput = execSync("git status --porcelain", {
      encoding: "utf-8",
      cwd: gitRoot
    }).trim();
    const hasChanges = statusOutput.length > 0;
    const isOnMain = currentBranch === mainBranch;
    if (hasChanges) {
      let action = "stash";
      if (!useDefaults) {
        action = await p.select({
          message: `Uncommitted changes detected:`,
          initialValue: "stash",
          options: [
            { value: "stash", label: "Stash changes" },
            { value: "ignore", label: "Ignore and continue" },
            { value: "cancel", label: "Cancel" }
          ]
        });
        if (p.isCancel(action) || action === "cancel") {
          p.cancel("Operation cancelled");
          process.exit(0);
        }
      }
      if (action === "stash") {
        execSync("git stash", { cwd: gitRoot, stdio: "pipe" });
        logStep("Stash", "git stash", "saves uncommitted changes");
      }
    }
    if (!isOnMain) {
      let action = "switch";
      if (!useDefaults) {
        action = await p.select({
          message: `Not on ${mainBranch} (currently on ${currentBranch}):`,
          initialValue: "switch",
          options: [
            { value: "switch", label: `Switch to ${mainBranch}` },
            { value: "ignore", label: "Ignore and continue" },
            { value: "cancel", label: "Cancel" }
          ]
        });
        if (p.isCancel(action) || action === "cancel") {
          p.cancel("Operation cancelled");
          process.exit(0);
        }
      }
      if (action === "switch") {
        execSync(`git checkout ${mainBranch}`, { cwd: gitRoot, stdio: "pipe" });
        logStep("Switch", `git checkout ${mainBranch}`, "switches to base branch");
      }
    }
    let hasRemote = false;
    try {
      const remotes = execSync("git remote", { cwd: gitRoot, encoding: "utf-8" }).trim();
      hasRemote = remotes.length > 0;
    } catch {
      hasRemote = false;
    }
    if (hasRemote) {
      let pullAction = "pull";
      if (!useDefaults) {
        pullAction = await p.select({
          message: `Pull latest from origin/${mainBranch}?`,
          initialValue: "pull",
          options: [
            { value: "pull", label: "Yes, git pull --rebase" },
            { value: "ignore", label: "Skip" }
          ]
        });
        if (p.isCancel(pullAction)) {
          p.cancel("Operation cancelled");
          process.exit(0);
        }
      }
      if (pullAction === "pull") {
        const pullCmd = `git pull --rebase origin ${mainBranch}`;
        try {
          execSync(pullCmd, { cwd: gitRoot, stdio: "pipe" });
          logStep("Pull", pullCmd, "fetches latest changes");
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logStep("Pull", pullCmd, errMsg.split("\n").pop() || "failed", true);
        }
      }
    }
    let branchName;
    let worktreeSuffix;
    if (branchArg) {
      branchName = branchArg;
      worktreeSuffix = branchArg;
    } else {
      p.log.info(`${chalk.dim(parentDir + "/")}${repoName}-${chalk.green("<name>")}`);
      p.log.message(chalk.dim("Press ESC to set worktree and branch names separately"));
      const nameInput = await p.text({
        message: "Worktree & branch name:",
        placeholder: "feature-name",
        validate: (value) => {
          if (!value) return "Name is required";
          if (!/^[a-zA-Z0-9._/-]+$/.test(value)) return "Invalid name";
        }
      });
      if (p.isCancel(nameInput)) {
        console.log();
        p.log.info(`${chalk.dim(parentDir + "/")}${repoName}-${chalk.green("<worktree>")}`);
        const worktreeInput = await p.text({
          message: "Worktree name:",
          placeholder: "feature-name",
          validate: (value) => {
            if (!value) return "Worktree name is required";
            if (!/^[a-zA-Z0-9._/-]+$/.test(value)) return "Invalid worktree name";
          }
        });
        if (p.isCancel(worktreeInput)) {
          p.cancel("Operation cancelled");
          process.exit(0);
        }
        worktreeSuffix = worktreeInput;
        const branchInput = await p.text({
          message: "Branch name:",
          placeholder: worktreeSuffix,
          defaultValue: worktreeSuffix,
          validate: (value) => {
            if (!value) return "Branch name is required";
            if (!/^[a-zA-Z0-9._/-]+$/.test(value)) return "Invalid branch name";
          }
        });
        if (p.isCancel(branchInput)) {
          p.cancel("Operation cancelled");
          process.exit(0);
        }
        branchName = branchInput;
      } else {
        branchName = nameInput;
        worktreeSuffix = nameInput;
      }
    }
    const worktreeName = `${repoName}-${worktreeSuffix}`;
    const worktreePath = join2(parentDir, worktreeName);
    if (existsSync(worktreePath)) {
      p.cancel(`Directory already exists: ${worktreePath}`);
      process.exit(1);
    }
    let newBranchForWorktree = branchName;
    let counter = 1;
    while (branches.includes(newBranchForWorktree)) {
      newBranchForWorktree = `${branchName}-${counter}`;
      counter++;
    }
    p.log.info(`Creating ${chalk.green(worktreeName)} branch ${chalk.green(newBranchForWorktree)} from ${chalk.yellow(mainBranch)}`);
    try {
      execSync("git worktree prune", { cwd: gitRoot, stdio: "pipe" });
    } catch {
    }
    logStep("Prune", "git worktree prune", "removes stale refs");
    const addCmd = `git worktree add -b "${newBranchForWorktree}" "${worktreePath}" "${mainBranch}"`;
    const addCmdShort = `git worktree add -b "${newBranchForWorktree}" .../${worktreeName} "${mainBranch}"`;
    try {
      execSync(addCmd, { cwd: gitRoot, stdio: "pipe" });
      logStep("Create", addCmdShort, worktreePath);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("already registered")) {
        logStep("Create", addCmdShort, "worktree registered but missing", true);
      }
      p.cancel(errMsg.split("\n").pop() || "Unknown error");
      process.exit(1);
    }
    addWorktreeRecord({
      path: worktreePath,
      branch: branchName,
      repoRoot: gitRoot,
      repoName,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const detectedPm = detectPackageManager(worktreePath);
    const pm = detectedPm || savedConfig.lastPm;
    if (pm && savedConfig.installDeps) {
      const installCmd = getInstallCommand(pm);
      try {
        execSync(installCmd, { cwd: worktreePath, stdio: "pipe" });
        logStep("Install", installCmd, "installs dependencies");
        setConfig("lastPm", pm);
      } catch (error) {
        logStep("Install", installCmd, "failed to install", true);
      }
    }
    const editorChoice = savedConfig.editor;
    if (editorChoice !== "none" && !noEditor) {
      const editorCmd = editorChoice === "default" ? process.env.EDITOR || "vim" : editorChoice;
      const openCmdShort = `${editorCmd} .../${worktreeName}`;
      try {
        if (editorChoice === "code") {
          execSync(`code "${worktreePath}"`, { stdio: "ignore" });
        } else if (editorChoice === "cursor") {
          execSync(`cursor "${worktreePath}"`, { stdio: "ignore" });
        } else if (editorChoice === "default") {
          execSync(`${editorCmd} "${worktreePath}"`, { stdio: "inherit" });
        }
        logStep("Open", openCmdShort, "opens in editor");
      } catch {
        logStep("Open", openCmdShort, "failed to open", true);
      }
    }
    const relativePath = relative(cwd, worktreePath);
    console.log(`\u2502`);
    console.log(`\u2514  ${chalk.green("Done")}  cd ${relativePath}`);
    console.log();
  } catch (error) {
    if (error instanceof Error && error.message.includes("not a git repository")) {
      p.cancel("Not in a git repository");
      process.exit(1);
    }
    throw error;
  }
}
async function createWorktreeBatch(names, options) {
  const savedConfig = getConfig();
  const noEditor = options?.noEditor ?? false;
  p.intro(`Create ${names.length} Git Worktrees`);
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const repoName = basename(gitRoot);
    const parentDir = dirname(gitRoot);
    const cwd = process.cwd();
    const branches = execSync('git branch --format="%(refname:short)"', {
      encoding: "utf-8",
      cwd: gitRoot
    }).trim().split("\n").filter(Boolean);
    const mainBranch = branches.find((b) => b === "main" || b === "master") || "main";
    try {
      execSync("git worktree prune", { cwd: gitRoot, stdio: "pipe" });
    } catch {
    }
    logStep("Prune", "git worktree prune", "removes stale refs");
    const created = [];
    const failed = [];
    for (const name of names) {
      const worktreeName = `${repoName}-${name}`;
      const worktreePath = join2(parentDir, worktreeName);
      if (existsSync(worktreePath)) {
        console.log(`\u2502`);
        console.log(`\u2502  ${chalk.yellow("\u25C6")}  ${chalk.yellow("Skip")}  ${worktreeName}`);
        console.log(`\u2502  ${chalk.dim("\u2514")}  ${chalk.dim("already exists")}`);
        failed.push(name);
        continue;
      }
      let branchName = name;
      let counter = 1;
      while (branches.includes(branchName)) {
        branchName = `${name}-${counter}`;
        counter++;
      }
      branches.push(branchName);
      const addCmd = `git worktree add -b "${branchName}" "${worktreePath}" "${mainBranch}"`;
      const addCmdShort = `git worktree add -b "${branchName}" .../${worktreeName}`;
      try {
        execSync(addCmd, { cwd: gitRoot, stdio: "pipe" });
        logStep("Create", addCmdShort, worktreePath);
        addWorktreeRecord({
          path: worktreePath,
          branch: branchName,
          repoRoot: gitRoot,
          repoName,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        const detectedPm = detectPackageManager(worktreePath);
        const pm = detectedPm || savedConfig.lastPm;
        if (pm && savedConfig.installDeps) {
          const installCmd = getInstallCommand(pm);
          try {
            execSync(installCmd, { cwd: worktreePath, stdio: "pipe" });
            logStep("Install", `${installCmd} (${worktreeName})`, "dependencies installed");
            setConfig("lastPm", pm);
          } catch {
          }
        }
        if (savedConfig.editor && savedConfig.editor !== "none" && !noEditor) {
          const editorCmd = savedConfig.editor === "default" ? process.env.EDITOR || "vim" : savedConfig.editor;
          try {
            if (savedConfig.editor === "code") {
              execSync(`code "${worktreePath}"`, { stdio: "ignore" });
            } else if (savedConfig.editor === "cursor") {
              execSync(`cursor "${worktreePath}"`, { stdio: "ignore" });
            }
          } catch {
          }
        }
        created.push(name);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.log(`\u2502`);
        console.log(`\u2502  ${chalk.red("\u25C6")}  ${chalk.red("Failed")}  ${worktreeName}`);
        console.log(`\u2502  ${chalk.dim("\u2514")}  ${chalk.red(errMsg.split("\n").pop())}`);
        failed.push(name);
      }
    }
    console.log(`\u2502`);
    if (created.length > 0) {
      console.log(`\u2514  ${chalk.green("Done")}  Created ${created.length} worktree${created.length > 1 ? "s" : ""}`);
      console.log();
      console.log(chalk.dim("   cd commands:"));
      for (const name of created) {
        const worktreePath = join2(parentDir, `${repoName}-${name}`);
        const relativePath = relative(cwd, worktreePath);
        console.log(chalk.dim(`   cd ${relativePath}`));
      }
    } else {
      console.log(`\u2514  ${chalk.yellow("Done")}  No worktrees created`);
    }
    console.log();
  } catch (error) {
    if (error instanceof Error && error.message.includes("not a git repository")) {
      p.cancel("Not in a git repository");
      process.exit(1);
    }
    throw error;
  }
}

// src/commands/list.ts
import * as p2 from "@clack/prompts";
import { execSync as execSync2 } from "child_process";
import { rmSync, existsSync as existsSync2 } from "fs";
import chalk2 from "chalk";
import { basename as basename2 } from "path";
import { search } from "@inquirer/prompts";
function logStep2(name, desc, error = false) {
  const color = error ? chalk2.red : chalk2.green;
  console.log(`\u2502`);
  console.log(`\u2502  ${color("\u25C6")}  ${color(name)}`);
  console.log(`\u2502  ${chalk2.dim("\u2514")}  ${chalk2.dim(desc)}`);
}
function getWorktreeStatus(wtPath, repoRoot, mainBranch) {
  try {
    const status = execSync2("git status --porcelain", {
      cwd: wtPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const changes = status ? status.split("\n").length : 0;
    let additions = 0;
    let deletions = 0;
    try {
      const diffStat = execSync2(`git diff --stat HEAD`, {
        cwd: wtPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      const match = diffStat.match(/(\d+) insertion.*?(\d+) deletion/);
      if (match) {
        additions = parseInt(match[1]) || 0;
        deletions = parseInt(match[2]) || 0;
      }
    } catch {
    }
    let ahead = 0;
    let behind = 0;
    try {
      const branch = execSync2("git branch --show-current", {
        cwd: wtPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      const revList = execSync2(`git rev-list --left-right --count ${mainBranch}...${branch}`, {
        cwd: wtPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      const [behindStr, aheadStr] = revList.split("	");
      behind = parseInt(behindStr) || 0;
      ahead = parseInt(aheadStr) || 0;
    } catch {
    }
    let isMerged = false;
    try {
      const branch = execSync2("git branch --show-current", {
        cwd: wtPath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      const mergedBranches = execSync2(`git branch --merged ${mainBranch}`, {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      isMerged = mergedBranches.split("\n").some((b) => b.trim() === branch);
    } catch {
    }
    return { changes, additions, deletions, ahead, behind, isMerged };
  } catch {
    return { changes: 0, additions: 0, deletions: 0, ahead: 0, behind: 0, isMerged: false };
  }
}
async function listWorktrees() {
  try {
    let gitRoot;
    try {
      gitRoot = execSync2("git rev-parse --show-toplevel", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
    } catch {
      p2.cancel("Not in a git repository");
      process.exit(1);
    }
    const repoName = basename2(gitRoot);
    const allWorktrees = getAllWorktrees();
    const worktrees = allWorktrees.filter(
      (wt) => existsSync2(wt.path) && wt.repoName === repoName
    );
    if (worktrees.length === 0) {
      console.log(chalk2.dim("No worktrees found for this repo"));
      process.exit(0);
    }
    p2.intro(`Worktrees for ${chalk2.cyan(repoName)}`);
    for (const wt of worktrees) {
      logStep2(wt.branch, wt.path);
    }
    console.log(`\u2502`);
    console.log(`\u2514  ${chalk2.dim(`${worktrees.length} worktree${worktrees.length > 1 ? "s" : ""}`)}`);
    console.log();
  } catch (error) {
    throw error;
  }
}
async function rmWorktree() {
  p2.intro("Remove Worktree");
  try {
    let gitRoot;
    try {
      gitRoot = execSync2("git rev-parse --show-toplevel", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
    } catch {
      p2.cancel("Not in a git repository");
      process.exit(1);
    }
    const repoName = basename2(gitRoot);
    while (true) {
      const allWorktrees = getAllWorktrees();
      const worktrees = allWorktrees.filter(
        (wt) => existsSync2(wt.path) && wt.repoName === repoName
      );
      if (worktrees.length === 0) {
        console.log(`\u2502`);
        console.log(`\u2514  ${chalk2.dim(`No worktrees found for ${repoName}`)}`);
        console.log();
        process.exit(0);
      }
      const choices = worktrees.map((wt) => ({
        value: wt.path,
        name: `${wt.branch} ${chalk2.dim(basename2(wt.path))}`,
        description: wt.path
      }));
      let selectedPath;
      try {
        selectedPath = await search({
          message: "Search worktree:",
          source: async (input) => {
            if (!input) return choices;
            const lower = input.toLowerCase();
            return choices.filter(
              (c) => c.name.toLowerCase().includes(lower) || c.value.toLowerCase().includes(lower)
            );
          }
        });
      } catch {
        console.log(`\u2502`);
        console.log(`\u2514  ${chalk2.dim("Done")}`);
        console.log();
        process.exit(0);
      }
      const selectedName = basename2(selectedPath);
      const record = worktrees.find((w) => w.path === selectedPath);
      const confirm2 = await p2.confirm({
        message: `Remove ${chalk2.green(selectedName)}?`,
        initialValue: true
      });
      if (p2.isCancel(confirm2)) {
        console.log(`\u2502`);
        console.log(`\u2514  ${chalk2.dim("Done")}`);
        console.log();
        process.exit(0);
      }
      if (confirm2) {
        const rmCmd = `git worktree remove "${selectedPath}" --force`;
        try {
          if (record?.repoRoot && existsSync2(record.repoRoot)) {
            try {
              execSync2(rmCmd, {
                cwd: record.repoRoot,
                stdio: "pipe"
              });
            } catch {
              if (existsSync2(selectedPath)) {
                rmSync(selectedPath, { recursive: true, force: true });
              }
            }
          } else {
            if (existsSync2(selectedPath)) {
              rmSync(selectedPath, { recursive: true, force: true });
            }
          }
          removeWorktreeRecord(selectedPath);
          logStep2(`Removed ${selectedName}`, selectedPath);
        } catch (error) {
          logStep2(`Failed to remove ${selectedName}`, selectedPath, true);
          throw error;
        }
      }
    }
  } catch (error) {
    throw error;
  }
}
async function statusWorktrees() {
  try {
    let gitRoot;
    try {
      gitRoot = execSync2("git rev-parse --show-toplevel", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
    } catch {
      p2.cancel("Not in a git repository");
      process.exit(1);
    }
    const repoName = basename2(gitRoot);
    const allWorktrees = getAllWorktrees();
    const worktrees = allWorktrees.filter(
      (wt) => existsSync2(wt.path) && wt.repoName === repoName
    );
    const mainBranch = (() => {
      try {
        const branches = execSync2('git branch --format="%(refname:short)"', {
          encoding: "utf-8",
          cwd: gitRoot
        }).trim().split("\n");
        return branches.find((b) => b === "main" || b === "master") || "main";
      } catch {
        return "main";
      }
    })();
    if (worktrees.length === 0) {
      console.log(chalk2.dim("No worktrees found for this repo"));
      process.exit(0);
    }
    p2.intro(`Status for ${chalk2.cyan(repoName)}`);
    let readyToMerge = 0;
    let inProgress = 0;
    let merged = 0;
    for (const wt of worktrees) {
      const status = getWorktreeStatus(wt.path, gitRoot, mainBranch);
      let statusText = "";
      let statusColor = chalk2.green;
      if (status.isMerged) {
        statusText = "\u2713 merged";
        statusColor = chalk2.gray;
        merged++;
      } else if (status.changes === 0 && status.ahead > 0) {
        statusText = `ready to merge (${status.ahead} commit${status.ahead > 1 ? "s" : ""} ahead)`;
        statusColor = chalk2.green;
        readyToMerge++;
      } else {
        const parts = [];
        if (status.changes > 0) parts.push(`${status.changes} changed`);
        if (status.ahead > 0) parts.push(`${status.ahead} ahead`);
        if (status.behind > 0) parts.push(`${status.behind} behind`);
        statusText = parts.length > 0 ? parts.join(", ") : "no changes";
        statusColor = status.changes > 0 ? chalk2.yellow : chalk2.dim;
        inProgress++;
      }
      const diffText = status.additions > 0 || status.deletions > 0 ? `  ${chalk2.green(`+${status.additions}`)} ${chalk2.red(`-${status.deletions}`)}` : "";
      console.log(`\u2502`);
      console.log(`\u2502  ${statusColor("\u25C6")}  ${statusColor(wt.branch)}${diffText}`);
      console.log(`\u2502  ${chalk2.dim("\u2514")}  ${statusColor(statusText)}`);
    }
    console.log(`\u2502`);
    const summary = [];
    if (readyToMerge > 0) summary.push(chalk2.green(`${readyToMerge} ready to merge`));
    if (inProgress > 0) summary.push(chalk2.yellow(`${inProgress} in progress`));
    if (merged > 0) summary.push(chalk2.dim(`${merged} merged`));
    console.log(`\u2514  ${summary.join(", ") || chalk2.dim("no worktrees")}`);
    console.log();
  } catch (error) {
    throw error;
  }
}
async function cleanWorktrees(options) {
  const removeAll = options?.all ?? false;
  try {
    let gitRoot;
    try {
      gitRoot = execSync2("git rev-parse --show-toplevel", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
    } catch {
      p2.cancel("Not in a git repository");
      process.exit(1);
    }
    const repoName = basename2(gitRoot);
    const allWorktrees = getAllWorktrees();
    const worktrees = allWorktrees.filter(
      (wt) => existsSync2(wt.path) && wt.repoName === repoName
    );
    const mainBranch = (() => {
      try {
        const branches = execSync2('git branch --format="%(refname:short)"', {
          encoding: "utf-8",
          cwd: gitRoot
        }).trim().split("\n");
        return branches.find((b) => b === "main" || b === "master") || "main";
      } catch {
        return "main";
      }
    })();
    if (worktrees.length === 0) {
      console.log(chalk2.dim("No worktrees found for this repo"));
      process.exit(0);
    }
    p2.intro(removeAll ? "Clean All Worktrees" : "Clean Merged Worktrees");
    const toRemove = removeAll ? worktrees : worktrees.filter((wt) => {
      const status = getWorktreeStatus(wt.path, gitRoot, mainBranch);
      return status.isMerged;
    });
    if (toRemove.length === 0) {
      console.log(`\u2502`);
      console.log(`\u2514  ${chalk2.dim("No worktrees to clean")}`);
      console.log();
      process.exit(0);
    }
    console.log(`\u2502`);
    console.log(`\u2502  ${chalk2.yellow("Will remove:")}`);
    for (const wt of toRemove) {
      console.log(`\u2502  ${chalk2.dim("\u2022")}  ${wt.branch} ${chalk2.dim(basename2(wt.path))}`);
    }
    const confirm2 = await p2.confirm({
      message: `Remove ${toRemove.length} worktree${toRemove.length > 1 ? "s" : ""}?`,
      initialValue: true
    });
    if (p2.isCancel(confirm2) || !confirm2) {
      console.log(`\u2502`);
      console.log(`\u2514  ${chalk2.dim("Cancelled")}`);
      console.log();
      process.exit(0);
    }
    let removed = 0;
    for (const wt of toRemove) {
      const selectedName = basename2(wt.path);
      try {
        if (wt.repoRoot && existsSync2(wt.repoRoot)) {
          try {
            execSync2(`git worktree remove "${wt.path}" --force`, {
              cwd: wt.repoRoot,
              stdio: "pipe"
            });
          } catch {
            if (existsSync2(wt.path)) {
              rmSync(wt.path, { recursive: true, force: true });
            }
          }
        } else {
          if (existsSync2(wt.path)) {
            rmSync(wt.path, { recursive: true, force: true });
          }
        }
        removeWorktreeRecord(wt.path);
        removed++;
        console.log(`\u2502`);
        console.log(`\u2502  ${chalk2.green("\u25C6")}  ${chalk2.green(`Removed ${selectedName}`)}`);
        console.log(`\u2502  ${chalk2.dim("\u2514")}  ${chalk2.dim(wt.path)}`);
      } catch (error) {
        console.log(`\u2502`);
        console.log(`\u2502  ${chalk2.red("\u25C6")}  ${chalk2.red(`Failed ${selectedName}`)}`);
      }
    }
    console.log(`\u2502`);
    console.log(`\u2514  ${chalk2.green("Done")}  Removed ${removed} worktree${removed > 1 ? "s" : ""}`);
    console.log();
  } catch (error) {
    throw error;
  }
}
async function mergeWorktree(name) {
  try {
    let gitRoot;
    try {
      gitRoot = execSync2("git rev-parse --show-toplevel", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
    } catch {
      p2.cancel("Not in a git repository");
      process.exit(1);
    }
    const repoName = basename2(gitRoot);
    const allWorktrees = getAllWorktrees();
    const worktrees = allWorktrees.filter(
      (wt2) => existsSync2(wt2.path) && wt2.repoName === repoName
    );
    const wt = worktrees.find(
      (w) => w.branch === name || basename2(w.path) === name || basename2(w.path) === `${repoName}-${name}`
    );
    if (!wt) {
      p2.cancel(`Worktree not found: ${name}`);
      process.exit(1);
    }
    const mainBranch = (() => {
      try {
        const branches = execSync2('git branch --format="%(refname:short)"', {
          encoding: "utf-8",
          cwd: gitRoot
        }).trim().split("\n");
        return branches.find((b) => b === "main" || b === "master") || "main";
      } catch {
        return "main";
      }
    })();
    p2.intro(`Merge ${chalk2.green(wt.branch)} to ${chalk2.yellow(mainBranch)}`);
    const status = getWorktreeStatus(wt.path, gitRoot, mainBranch);
    if (status.changes > 0) {
      p2.cancel(`Worktree has uncommitted changes. Commit or stash them first.`);
      process.exit(1);
    }
    try {
      execSync2(`git checkout ${mainBranch}`, { cwd: gitRoot, stdio: "pipe" });
      logStep2("Switch", `git checkout ${mainBranch}`, "switched to main");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logStep2("Switch", `git checkout ${mainBranch}`, errMsg.split("\n").pop() || "failed", true);
      process.exit(1);
    }
    try {
      execSync2(`git merge ${wt.branch}`, { cwd: gitRoot, stdio: "pipe" });
      logStep2("Merge", `git merge ${wt.branch}`, "merged to main");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logStep2("Merge", `git merge ${wt.branch}`, errMsg.split("\n").pop() || "failed", true);
      p2.cancel("Merge failed. Resolve conflicts manually.");
      process.exit(1);
    }
    const selectedName = basename2(wt.path);
    try {
      execSync2(`git worktree remove "${wt.path}" --force`, {
        cwd: gitRoot,
        stdio: "pipe"
      });
    } catch {
      if (existsSync2(wt.path)) {
        rmSync(wt.path, { recursive: true, force: true });
      }
    }
    removeWorktreeRecord(wt.path);
    logStep2("Remove", `git worktree remove .../${selectedName}`, "worktree removed");
    try {
      execSync2(`git branch -d ${wt.branch}`, { cwd: gitRoot, stdio: "pipe" });
      logStep2("Branch", `git branch -d ${wt.branch}`, "branch deleted");
    } catch {
    }
    console.log(`\u2502`);
    console.log(`\u2514  ${chalk2.green("Done")}  Merged and cleaned up ${wt.branch}`);
    console.log();
  } catch (error) {
    throw error;
  }
}

// src/commands/config.ts
import { execSync as execSync3 } from "child_process";
async function configCommand(action) {
  if (action === "reset") {
    resetConfig();
    console.log("Config reset to defaults");
    return;
  }
  const cfg = getConfig();
  const configPath = getConfigPath();
  const editor = cfg.editor === "default" ? process.env.EDITOR || "vim" : cfg.editor;
  if (editor === "none") {
    console.log(configPath);
    return;
  }
  try {
    execSync3(`${editor === "code" ? "code" : editor === "cursor" ? "cursor" : editor} "${configPath}"`, { stdio: "inherit" });
  } catch {
    console.log(configPath);
  }
}

// src/index.ts
var program = new Command();
var banner = `
\u2554\u2550\u2557\u2566 \u2566\u2554\u2566\u2557
\u2551 \u2566\u2551\u2551\u2551 \u2551
\u255A\u2550\u255D\u255A\u2569\u255D \u2569
`;
program.name("gwt").description("Git worktree manager for parallel development").version("2.0.0", "-v, --version", "Output the version number").helpOption("-h, --help", "Display help for command");
program.argument("[names...]", "Name(s) for worktree and branch (gwt foo bar creates multiple worktrees)").option("-y, --yes", "Use saved defaults, skip prompts").option("-x, --no-editor", "Skip opening editor").description("Create new git worktree(s)").action((names, options) => {
  const opts = { ...options, noEditor: options.editor === false };
  if (names.length === 0) {
    createWorktree(void 0, opts);
  } else if (names.length === 1) {
    createWorktree(names[0], opts);
  } else {
    createWorktreeBatch(names, opts);
  }
});
program.command("rm").alias("remove").description("Remove worktrees for current repo").action(rmWorktree);
program.command("ls").alias("list").description("List worktrees for current repo").action(listWorktrees);
program.command("status").alias("st").description("Show status of all worktrees (changes, commits ahead/behind)").action(statusWorktrees);
program.command("clean").alias("c").option("-a, --all", "Remove all worktrees (not just merged)").description("Remove worktrees that have been merged to main").action(cleanWorktrees);
program.command("merge <name>").alias("m").description("Merge worktree branch to main and remove worktree").action(mergeWorktree);
program.command("config [action]").description("Open config file (gwt config) or reset defaults (gwt config reset)").action(configCommand);
program.command("version").description("Show version number").action(() => {
  console.log("2.0.0");
});
program.command("help").description("Show help").action(() => {
  program.help();
});
var reservedCommands = program.commands.flatMap((cmd) => [cmd.name(), ...cmd.aliases()]);
var arg = process.argv[2];
var isVersionFlag = process.argv.includes("-v") || process.argv.includes("--version");
var isHelpFlag = process.argv.includes("-h") || process.argv.includes("--help");
var isYesFlag = process.argv.includes("-y") || process.argv.includes("--yes");
var hasArg = arg && !arg.startsWith("-") && !reservedCommands.includes(arg);
if (!isVersionFlag && !isHelpFlag && !(hasArg && isYesFlag) && arg !== "version" && arg !== "help") {
  console.log(banner);
}
program.parse();
//# sourceMappingURL=index.js.map