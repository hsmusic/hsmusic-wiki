import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const requested = {};
export const recorded = {};

export function track(pathArg, {
  readdir = false,
  stat = false,
}) {
  pathArg = path.resolve(pathArg);
  requested[pathArg] = {readdir, stat};
}

export function tracking(pathArg, resolved = false) {
  if (!resolved) pathArg = path.resolve(pathArg);
  for (const key of Object.keys(requested)) {
    if (pathArg.startsWith(key + '/')) {
      return requested[key];
    }
  }

  return null;
}

async function go(fn, key, pathArg) {
  pathArg = path.resolve(pathArg);

  const info = tracking(pathArg, true);
  if (!info?.[key]) return fn(pathArg);

  const record = recorded[pathArg]?.[key];
  if (record) return record;

  const result = await fn(pathArg);
  recorded[pathArg] ??= {};
  recorded[pathArg][key] = result;
  return result;
}

export function stat(pathArg) {
  return go(fs.stat, 'stat', pathArg);
}

export function readdir(pathArg) {
  return go(fs.readdir, 'readdir', pathArg);
}

export function reset() {
  for (const key in requested) delete requested[key];
  for (const key in recorded) delete recorded[key];
}