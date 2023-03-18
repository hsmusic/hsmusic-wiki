import chokidar from 'chokidar';
import EventEmitter from 'events';
import * as path from 'path';
import {fileURLToPath} from 'url';

import contentFunction from '../../content-function.js';
import {color, logWarn} from '../../util/cli.js';
import {annotateFunction} from '../../util/sugar.js';

export function watchContentDependencies() {
  const events = new EventEmitter();
  const contentDependencies = {};

  Object.assign(events, {
    contentDependencies,
  });

  // Watch adjacent files
  const metaPath = fileURLToPath(import.meta.url);
  const metaDirname = path.dirname(metaPath);
  const watcher = chokidar.watch(metaDirname);

  watcher.on('all', (event, filePath) => {
    if (!['add', 'change'].includes(event)) return;
    if (filePath === metaPath) return;
    handlePathUpdated(filePath);
  });

  watcher.on('unlink', (filePath) => {
    if (filePath === metaPath) {
      console.error(`Yeowzers content dependencies just got nuked.`);
      return;
    }
    handlePathRemoved(filePath);
  })

  return events;

  function getFunctionName(filePath) {
    const shortPath = path.basename(filePath);
    const functionName = shortPath.slice(0, -path.extname(shortPath).length);
    return functionName;
  }

  async function handlePathRemoved(filePath) {
    const functionName = getFunctionName(filePath);
    delete contentDependencies[functionName];
  }

  async function handlePathUpdated(filePath) {
    const functionName = getFunctionName(filePath);
    let error = null;

    main: {
      let spec;
      try {
        spec = (await import(`${filePath}?${Date.now()}`)).default;
      } catch (caughtError) {
        error = caughtError;
        error.message = `Error importing: ${error.message}`;
        break main;
      }

      try {
        if (typeof spec.data === 'function') {
          annotateFunction(spec.data, {name: functionName, description: 'data'});
        }

        if (typeof spec.generate === 'function') {
          annotateFunction(spec.generate, {name: functionName});
        }
      } catch (caughtError) {
        error = caughtError;
        error.message = `Error annotating functions: ${error.message}`;
        break main;
      }

      let fn;
      try {
        fn = contentFunction(spec);
      } catch (caughtError) {
        error = caughtError;
        error.message = `Error loading spec: ${error.message}`;
        break main;
      }

      contentDependencies[functionName] = fn;
    }

    if (!error) {
      return true;
    }

    if (contentDependencies[functionName]) {
      logWarn`Failed to import ${functionName} - using existing version`;
    } else {
      logWarn`Failed to import ${functionName} - no prior version loaded`;
    }

    if (typeof error === 'string') {
      console.error(color.yellow(error));
    } else {
      console.error(error);
    }

    return false;
  }
}
