#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";

// src/commands/create.ts
import * as p from "@clack/prompts";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join, dirname, basename } from "path";

// src/config.ts
import Conf from "conf";
var schema = {
  defaultBranchChoice: {
    type: "string",
    enum: ["current", "new"],
    default: "current"
  },
  defaultSuffix: {
    type: "string",
    default: "1"
  },
  defaultOpenEditor: {
    type: "boolean",
    default: true
  },
  defaultEditor: {
    type: "string",
    enum: ["code", "default", "none"],
    default: "code"
  },
  namePattern: {
    type: "string",
    default: "{repo}-{branch}-wt-{suffix}"
  }
};
var config = new Conf({
  projectName: "gwtree",
  schema
});
function getConfig() {
  return {
    defaultBranchChoice: config.get("defaultBranchChoice"),
    defaultSuffix: config.get("defaultSuffix"),
    defaultOpenEditor: config.get("defaultOpenEditor"),
    defaultEditor: config.get("defaultEditor"),
    namePattern: config.get("namePattern")
  };
}

// src/commands/create.ts
import chalk from "chalk";
async function createWorktree() {
  const userConfig = getConfig();
  p.intro("Create Git Worktree");
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    const repoName = basename(gitRoot);
    const parentDir = dirname(gitRoot);
    const currentBranch = execSync("git branch --show-current", {
      encoding: "utf-8",
      cwd: gitRoot
    }).trim();
    const branches = execSync('git branch --format="%(refname:short)"', {
      encoding: "utf-8",
      cwd: gitRoot
    }).trim().split("\n").filter(Boolean);
    const mainBranch = branches.find((b) => b === "main" || b === "master") || currentBranch;
    const branchChoice = await p.select({
      message: "Branch:",
      options: [
        { value: mainBranch, label: mainBranch },
        { value: "new", label: "Create new branch" }
      ],
      initialValue: userConfig.defaultBranchChoice === "new" ? "new" : mainBranch
    });
    if (p.isCancel(branchChoice)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
    let branchName;
    let baseBranch;
    if (branchChoice === "new") {
      const newBranchName = await p.text({
        message: "New branch name:",
        placeholder: `${currentBranch}-worktree`,
        validate: (value) => {
          if (!value) return "Branch name is required";
          if (branches.includes(value)) return "Branch already exists";
        }
      });
      if (p.isCancel(newBranchName)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }
      branchName = newBranchName;
      baseBranch = currentBranch;
    } else {
      branchName = branchChoice;
      baseBranch = branchChoice;
    }
    const prefix = userConfig.namePattern.replace("{repo}", repoName).replace("{branch}", branchName).replace("-{suffix}", "");
    const suffix = await p.text({
      message: `Worktree name: ${chalk.dim(prefix + "-")}`,
      defaultValue: userConfig.defaultSuffix,
      placeholder: `${userConfig.defaultSuffix} (ESC for full edit)`
    });
    let worktreeName;
    if (p.isCancel(suffix)) {
      const defaultName = `${repoName}-${branchName}`;
      const customName = await p.text({
        message: "Custom name:",
        defaultValue: defaultName,
        placeholder: defaultName
      });
      if (p.isCancel(customName)) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }
      worktreeName = customName;
    } else {
      worktreeName = `${prefix}-${suffix}`;
    }
    const worktreePath = join(parentDir, worktreeName);
    if (existsSync(worktreePath)) {
      p.cancel(`Directory ${worktreeName} already exists`);
      process.exit(1);
    }
    if (p.isCancel(worktreeName)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
    const s = p.spinner();
    s.start("Creating worktree...");
    try {
      if (branchChoice === "new") {
        execSync(`git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`, {
          cwd: gitRoot,
          stdio: "pipe"
        });
      } else {
        let newBranchForWorktree = `${branchName}-${String(suffix) || "wt"}`;
        let counter = 1;
        while (branches.includes(newBranchForWorktree)) {
          newBranchForWorktree = `${branchName}-${String(suffix) || "wt"}-${counter}`;
          counter++;
        }
        execSync(`git worktree add -b "${newBranchForWorktree}" "${worktreePath}" "${baseBranch}"`, {
          cwd: gitRoot,
          stdio: "pipe"
        });
      }
      s.stop("Worktree created successfully!");
    } catch (error) {
      s.stop("Failed to create worktree");
      throw error;
    }
    const editorChoice = await p.select({
      message: "Open in:",
      options: [
        { value: "code", label: "VS Code" },
        { value: "default", label: "Default ($EDITOR)" },
        { value: "none", label: "Don't open" }
      ],
      initialValue: userConfig.defaultEditor
    });
    if (p.isCancel(editorChoice)) {
      p.outro(`Worktree created at: ${worktreePath}`);
      process.exit(0);
    }
    if (editorChoice !== "none") {
      const s2 = p.spinner();
      s2.start("Opening editor...");
      try {
        if (editorChoice === "code") {
          execSync(`code "${worktreePath}"`, { stdio: "ignore" });
        } else {
          const editor = process.env.EDITOR || "vim";
          execSync(`${editor} "${worktreePath}"`, { stdio: "inherit" });
        }
        s2.stop("Editor opened!");
      } catch (error) {
        s2.stop("Failed to open editor");
        console.error("Error:", error instanceof Error ? error.message : "Unknown error");
      }
    }
    p.outro(`\u2713 Worktree ready at: ${worktreePath}
  Branch: ${branchName}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not a git repository")) {
      p.cancel("Error: Not in a git repository");
      process.exit(1);
    }
    throw error;
  }
}

// src/commands/list.ts
import * as p2 from "@clack/prompts";
import { execSync as execSync2 } from "child_process";
import chalk2 from "chalk";
import { basename as basename2 } from "path";
async function listWorktrees() {
  p2.intro("Manage Worktrees");
  try {
    while (true) {
      const output = execSync2("git worktree list --porcelain", {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      const worktrees = [];
      const lines = output.trim().split("\n");
      let current = {};
      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          if (current.path) worktrees.push(current);
          current = { path: line.replace("worktree ", "") };
        } else if (line.startsWith("branch ")) {
          current.branch = line.replace("branch ", "").split("/").pop();
        } else if (line.startsWith("HEAD ")) {
          current.head = line.replace("HEAD ", "").substring(0, 7);
        }
      }
      if (current.path) worktrees.push(current);
      const nonMainWorktrees = worktrees.slice(1);
      if (nonMainWorktrees.length === 0) {
        p2.cancel("No worktrees found");
        process.exit(0);
      }
      const worktreeChoice = await p2.select({
        message: "Select worktree to delete (ESC to exit):",
        options: nonMainWorktrees.map((wt) => ({
          value: wt.path,
          label: `${wt.branch || wt.head} ${chalk2.dim(basename2(wt.path))}`
        }))
      });
      if (p2.isCancel(worktreeChoice)) {
        p2.outro("Done");
        process.exit(0);
      }
      const selectedName = basename2(worktreeChoice);
      const confirm3 = await p2.confirm({
        message: `Delete ${selectedName}?`,
        initialValue: false
      });
      if (p2.isCancel(confirm3)) {
        p2.outro("Done");
        process.exit(0);
      }
      if (confirm3) {
        const s = p2.spinner();
        s.start("Removing worktree...");
        try {
          execSync2(`git worktree remove "${worktreeChoice}"`, {
            stdio: "pipe"
          });
          s.stop(`${selectedName} removed!`);
        } catch (error) {
          s.stop("Failed to remove worktree");
          throw error;
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("not a git repository")) {
      p2.cancel("Error: Not in a git repository");
      process.exit(1);
    }
    throw error;
  }
}

// src/commands/remove.ts
import * as p3 from "@clack/prompts";
import { execSync as execSync3 } from "child_process";
async function removeWorktree() {
  p3.intro("Remove Git Worktree");
  try {
    const output = execSync3("git worktree list --porcelain", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    const worktrees = [];
    const lines = output.trim().split("\n");
    let current = {};
    for (const line of lines) {
      if (line.startsWith("worktree ")) {
        if (current.path) worktrees.push(current);
        current = { path: line.replace("worktree ", "") };
      } else if (line.startsWith("branch ")) {
        current.branch = line.replace("branch ", "").split("/").pop();
      } else if (line.startsWith("HEAD ")) {
        current.head = line.replace("HEAD ", "").substring(0, 7);
      }
    }
    if (current.path) worktrees.push(current);
    const nonMainWorktrees = worktrees.slice(1);
    if (nonMainWorktrees.length === 0) {
      p3.cancel("No worktrees to remove");
      process.exit(0);
    }
    const worktreeChoice = await p3.select({
      message: "Select worktree to remove:",
      options: nonMainWorktrees.map((wt) => ({
        value: wt.path,
        label: `${wt.branch || wt.head} - ${wt.path}`
      }))
    });
    if (p3.isCancel(worktreeChoice)) {
      p3.cancel("Operation cancelled");
      process.exit(0);
    }
    const confirm3 = await p3.confirm({
      message: `Remove worktree at ${worktreeChoice}?`,
      initialValue: false
    });
    if (p3.isCancel(confirm3) || !confirm3) {
      p3.cancel("Operation cancelled");
      process.exit(0);
    }
    const s = p3.spinner();
    s.start("Removing worktree...");
    try {
      execSync3(`git worktree remove "${worktreeChoice}"`, {
        stdio: "pipe"
      });
      s.stop("Worktree removed successfully!");
    } catch (error) {
      s.stop("Failed to remove worktree");
      throw error;
    }
    p3.outro("\u2713 Done");
  } catch (error) {
    if (error instanceof Error && error.message.includes("not a git repository")) {
      p3.cancel("Error: Not in a git repository");
      process.exit(1);
    }
    throw error;
  }
}

// src/index.ts
var program = new Command();
var banner = `
 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557    \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D \u2588\u2588\u2551    \u2588\u2588\u2551\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D
\u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u2588\u2588\u2551 \u2588\u2557 \u2588\u2588\u2551   \u2588\u2588\u2551   
\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551\u2588\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551   
\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u255A\u2588\u2588\u2588\u2554\u2588\u2588\u2588\u2554\u255D   \u2588\u2588\u2551   
 \u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u255D\u255A\u2550\u2550\u255D    \u255A\u2550\u255D   
`;
console.log(banner);
program.name("gwtree").description("Git worktree manager for parallel development").version("1.1.2", "-v, --version", "Output the version number").helpOption("-h, --help", "Display help for command");
program.command("create", { isDefault: true }).description("Create a new git worktree").action(createWorktree);
program.command("list").alias("ls").description("List all git worktrees").action(listWorktrees);
program.command("remove").alias("rm").description("Remove a git worktree").action(removeWorktree);
program.parse();
//# sourceMappingURL=index.js.map