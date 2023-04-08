import chokidar from 'chokidar';
import EventEmitter from 'events';
import * as path from 'path';
import {ESLint} from 'eslint';
import {fileURLToPath} from 'url';

import contentFunction from '../../content-function.js';
import {color, logWarn} from '../../util/cli.js';
import {annotateFunction} from '../../util/sugar.js';

function cachebust(filePath) {
  if (filePath in cachebust.cache) {
    cachebust.cache[filePath] += 1;
    return `${filePath}?cachebust${cachebust.cache[filePath]}`;
  } else {
    cachebust.cache[filePath] = 0;
    return filePath;
  }
}

cachebust.cache = Object.create(null);

export function watchContentDependencies({
  mock = null,
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

  const eslint = new ESLint();

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

  if (mock) {
    const errors = [];
    for (const [functionName, spec] of Object.entries(mock)) {
      try {
        const fn = processFunctionSpec(functionName, spec);
        contentDependencies[functionName] = fn;
      } catch (error) {
        error.message = `(${functionName}) ${error.message}`;
        errors.push(error);
      }
    }
    if (errors.length) {
      throw new AggregateError(errors, `Errors processing mocked content functions`);
    }
    checkReadyConditions();
  }

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

  function isMocked(functionName) {
    return !!mock && Object.keys(mock).includes(functionName);
  }

  async function handlePathRemoved(filePath) {
    const functionName = getFunctionName(filePath);
    if (isMocked(functionName)) return;

    delete contentDependencies[functionName];
  }

  async function handlePathUpdated(filePath) {
    const functionName = getFunctionName(filePath);
    if (isMocked(functionName)) return;

    let error = null;

    main: {
      const eslintResults = await eslint.lintFiles([filePath]);
      const eslintFormatter = await eslint.loadFormatter('stylish');
      const eslintResultText = eslintFormatter.format(eslintResults);
      if (eslintResultText.trim().length) {
        console.log(eslintResultText);
      }

      let spec;
      try {
        spec = (await import(cachebust(filePath))).default;
      } catch (caughtError) {
        error = caughtError;
        error.message = `Error importing: ${error.message}`;
        break main;
      }

      let fn;
      try {
        fn = processFunctionSpec(functionName, spec);
      } catch (caughtError) {
        error = caughtError;
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

  function processFunctionSpec(functionName, spec) {
    if (typeof spec.data === 'function') {
      annotateFunction(spec.data, {name: functionName, description: 'data'});
    }

    if (typeof spec.generate === 'function') {
      annotateFunction(spec.generate, {name: functionName});
    }

    let fn;
    try {
      fn = contentFunction(spec);
    } catch (error) {
      error.message = `Error loading spec: ${error.message}`;
      throw error;
    }

    return fn;
  }
}

export function quickLoadContentDependencies(opts) {
  return new Promise((resolve, reject) => {
    const watcher = watchContentDependencies(opts);

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
