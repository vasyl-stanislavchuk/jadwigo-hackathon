// Whether a `claude` process loaded the jadwigo-builder channel (dl-a38n.2, dl-a38n.10). Claude Code
// drops every channel message in a session started without the development flag, and says nothing,
// so the channel and the launcher both read the command line with `ps` (md's inbox_channel.py).
import { execFileSync } from "node:child_process";

export const SERVER_NAME = "jadwigo-builder";
export const CHANNELS_FLAG = "--dangerously-load-development-channels";

/**
 * Every channel a `claude` command line loads, from both `FLAG v` and `FLAG=v`, with values that
 * run up to the next `-` token and may be comma lists.
 */
export function channelNames(argv: string): Set<string> {
  const names = new Set<string>();
  let taking = false;
  for (let token of argv.split(/\s+/)) {
    if (token === CHANNELS_FLAG) {
      taking = true;
      continue;
    }
    if (token.startsWith(`${CHANNELS_FLAG}=`)) {
      taking = true;
      token = token.slice(CHANNELS_FLAG.length + 1);
    } else if (token.startsWith("-")) {
      taking = false;
      continue;
    }
    if (taking) for (const part of token.split(",")) if (part) names.add(part);
  }
  return names;
}

export function loadsThisChannel(argv: string): boolean {
  return channelNames(argv).has(`server:${SERVER_NAME}`);
}

export type Proc = { ppid: number; command: string };

/** One process's parent and command line, or null when `ps` cannot say. */
export function psProc(pid: number): Proc | null {
  try {
    const out = execFileSync("ps", ["-o", "ppid=,command=", "-p", String(pid)], {
      encoding: "utf8",
    }).trim();
    const match = /^(\d+)\s+(.*)$/.exec(out);
    return match ? { ppid: Number(match[1]), command: match[2] ?? "" } : null;
  } catch {
    return null;
  }
}

const CLAUDE_COMMAND = /(^|\/)claude(\s|$)/;

/**
 * Whether the `claude` that started this server loaded this channel, or null when nothing here can
 * tell. A session without the flag drops every channel message's content, so a server there
 * consumes nothing: an ask it sent would be an ask nobody read (md lost 7 that way on 2026-10-19).
 * Walks up from the parent a few steps, since a wrapper may sit between claude and bun.
 */
export function channelLoaded(start: number, proc: (pid: number) => Proc | null): boolean | null {
  let pid = start;
  for (let step = 0; step < 4 && pid > 1; step += 1) {
    const found = proc(pid);
    if (!found) return null;
    if (isClaude(found.command)) {
      return loadsThisChannel(found.command);
    }
    pid = found.ppid;
  }
  return null;
}

/** Every process on the machine by pid, or an empty map when `ps` cannot say. */
export function psTable(): Map<number, Proc> {
  const table = new Map<number, Proc>();
  try {
    const out = execFileSync("ps", ["-A", "-o", "pid=,ppid=,command="], { encoding: "utf8" });
    for (const line of out.split("\n")) {
      const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line);
      if (match) table.set(Number(match[1]), { ppid: Number(match[2]), command: match[3] ?? "" });
    }
  } catch {
    // No ps: the caller cannot tell, and says so.
  }
  return table;
}

/**
 * The command line of the first `claude` at or below `root`, breadth first, or null when there is
 * none. A wrapper the launcher started may run claude as its child rather than exec it.
 */
export function claudeBelow(table: Map<number, Proc>, root: number): string | null {
  const queue = [root];
  for (let pid = queue.shift(); pid !== undefined; pid = queue.shift()) {
    const found = table.get(pid);
    if (found && isClaude(found.command)) return found.command;
    for (const [child, proc] of table) if (proc.ppid === pid) queue.push(child);
  }
  return null;
}

function isClaude(command: string): boolean {
  return CLAUDE_COMMAND.test(command.split(/\s+/)[0] ?? "");
}
