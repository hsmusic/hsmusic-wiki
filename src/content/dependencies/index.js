import chokidar from 'chokidar';
import EventEmitter from 'events';
import * as path from 'path';
import {fileURLToPath} from 'url';

import contentFunction from '../../content-function.js';
import {color, logWarn} from '../../util/cli.js';
import {annotateFunction} from '../../util/sugar.js';

export function watchContentDependencies({
  logging = true,
} = {}) {
  const events = new EventEmitter();
  const contentDependencies = {};

  let emittedReady = false;
  let initialScanComplete = false;
  let allDependenciesFulfilled = false;

  Object.assign(events, {
    contentDependencies,
    close,
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
  });

  watcher.on('ready', () => {
    initialScanComplete = true;
    checkReadyConditions();
  });

  return events;

  async function close() {
    return watcher.close();
  }

  function checkReadyConditions() {
    if (emittedReady) {
      return;
    }

    if (!initialScanComplete) {
      return;
    }

    checkAllDependenciesFulfilled();

    if (!allDependenciesFulfilled) {
      return;
    }

    events.emit('ready');
    emittedReady = true;
  }

  function checkAllDependenciesFulfilled() {
    allDependenciesFulfilled = !Object.values(contentDependencies).includes(null);
  }

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

      events.emit('update', functionName);
      checkReadyConditions();
    }

    if (!error) {
      return true;
    }

    if (!(functionName in contentDependencies)) {
      contentDependencies[functionName] = null;
    }

    events.emit('error', functionName, error);

    if (logging) {
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
    }

    return false;
  }
}

export function quickLoadContentDependencies() {
  return new Promise((resolve, reject) => {
    const watcher = watchContentDependencies();

    watcher.on('error', (name, error) => {
      watcher.close().then(() => {
        error.message = `Error loading dependency ${name}: ${error}`;
        reject(error);
      });
    });

    watcher.on('ready', () => {
      watcher.close().then(() => {
        resolve(watcher.contentDependencies);
      });
    });
  });
}
