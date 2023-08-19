// Utility functions which are only relevant to particular Node.js constructs.

import {readdir, stat} from 'fs/promises';
import {fileURLToPath} from 'url';
import * as path from 'path';

import _commandExists from 'command-exists';

// This package throws an error instead of returning false when the command
// doesn't exist, for some reason. Yay for making logic more difficult!
// Here's a straightforward workaround.
export function commandExists(command) {
  return _commandExists(command).then(
    () => true,
    () => false
  );
}

// Very cool function origin8ting in... http-music pro8a8ly!
// Sorry if we happen to 8e violating past-us's copyright, lmao.
export function promisifyProcess(proc, showLogging = true) {
  // Takes a process (from the child_process module) and returns a promise
  // that resolves when the process exits (or rejects, if the exit code is
  // non-zero).
  //
  // Ayy look, no alpha8etical second letter! Couldn't tell this was written
  // like three years ago 8efore I was me. 8888)

  return new Promise((resolve, reject) => {
    if (showLogging) {
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);
    }

    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
}

// Handy-dandy utility function for detecting whether the passed URL is the
// running JavaScript file. This takes `import.meta.url` from ES6 modules, which
// is great 'cuz (module === require.main) doesn't work without CommonJS
// modules.
export function isMain(importMetaURL) {
  const metaPath = fileURLToPath(importMetaURL);
  const relative = path.relative(process.argv[1], metaPath);
  const isIndexJS = path.basename(metaPath) === 'index.js';
  return [
    '',
    isIndexJS && 'index.js'
  ].includes(relative);
}

// Like readdir... but it's recursive! This returns a flat list of file paths.
// By default, the paths include the provided top/root path, but this can be
// changed with prefixPath to prefix some other path, or to just return paths
// relative to the root. Change pathStyle to specify posix or win32, or leave
// it as the default device-correct style. Provide a filterDir function to
// control which directory names are traversed at all, and filterFile to
// select which filenames are included in the final list.
export async function traverse(rootPath, {
  pathStyle = 'device',
  filterFile = () => true,
  filterDir = () => true,
  prefixPath = rootPath,
} = {}) {
  const pathJoinDevice = path.join;
  const pathJoinStyle = {
    'device': path.join,
    'posix': path.posix.join,
    'win32': path.win32.join,
  }[pathStyle];

  if (!pathJoinStyle) {
    throw new Error(`Expected pathStyle to be device, posix, or win32`);
  }

  const recursive = (names, ...subdirectories) =>
    Promise.all(names.map(async name => {
      const devicePath = pathJoinDevice(rootPath, ...subdirectories, name);
      const stats = await stat(devicePath);

      if (stats.isDirectory() && !filterDir(name)) return [];
      else if (stats.isFile() && !filterFile(name)) return [];
      else if (!stats.isDirectory() && !stats.isFile()) return [];

      if (stats.isDirectory()) {
        return recursive(await readdir(devicePath), ...subdirectories, name);
      } else {
        return pathJoinStyle(prefixPath, ...subdirectories, name);
      }
    }));

  const names = await readdir(rootPath);
  const results = await recursive(names);
  return results.flat(Infinity);
}
