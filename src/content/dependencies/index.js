import EventEmitter from 'node:events';
import {readdir} from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import chokidar from 'chokidar';
import {ESLint} from 'eslint';

import {colors, logWarn} from '#cli';
import contentFunction, {ContentFunctionSpecError} from '#content-function';
import {annotateFunction} from '#sugar';

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
  let closed = false;

  let _close = () => {};

  Object.assign(events, {
    contentDependencies,
    close,
  });

  const eslint = new ESLint();

  const metaPath = fileURLToPath(import.meta.url);
  const metaDirname = path.dirname(metaPath);
  const watchPath = metaDirname;

  const mockKeys = new Set();
  if (mock) {
    const errors = [];

    for (const [functionName, spec] of Object.entries(mock)) {
      mockKeys.add(functionName);
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
  }

  // Chokidar's 'ready' event is supposed to only fire once an 'add' event
  // has been fired for everything in the watched directory, but it's not
  // totally reliable. https://github.com/paulmillr/chokidar/issues/1011
  //
  // Workaround here is to readdir for the names of all dependencies ourselves,
  // and enter null for each into the contentDependencies object. We'll emit
  // 'ready' ourselves only once no nulls remain. And we won't actually start
  // watching until the readdir is done and nulls are entered (so we don't
  // prematurely find out there aren't any nulls - before the nulls have
  // been entered at all!).

  readdir(watchPath).then(files => {
    if (closed) {
      return;
    }

    const filePaths = files.map(file => path.join(watchPath, file));
    for (const filePath of filePaths) {
      if (filePath === metaPath) continue;
      const functionName = getFunctionName(filePath);
      if (!isMocked(functionName)) {
        contentDependencies[functionName] = null;
      }
    }

    const watcher = chokidar.watch(watchPath);

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

    _close = () => watcher.close();
  });

  return events;

  async function close() {
    closed = true;
    return _close();
  }

  function checkReadyConditions() {
    if (emittedReady) return;
    if (Object.values(contentDependencies).includes(null)) return;

    events.emit('ready');
    emittedReady = true;
  }

  function getFunctionName(filePath) {
    const shortPath = path.basename(filePath);
    const functionName = shortPath.slice(0, -path.extname(shortPath).length);
    return functionName;
  }

  function isMocked(functionName) {
    return mockKeys.has(functionName);
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
        const module =
          await import(
            cachebust(
              './' +
              path
                .relative(metaDirname, filePath)
                .split(path.sep)
                .join('/')));
        spec = module.default;
      } catch (caughtError) {
        error = caughtError;
        error.message = `Error importing: ${error.message}`;
        break main;
      }

      // Just skip newly created files. They'll be processed again when
      // written.
      if (spec === undefined) {
        contentDependencies[functionName] = null;
        return;
      }

      let fn;
      try {
        fn = processFunctionSpec(functionName, spec);
      } catch (caughtError) {
        error = caughtError;
        break main;
      }

      if (logging && emittedReady) {
        const timestamp = new Date().toLocaleString('en-US', {timeStyle: 'medium'});
        console.log(colors.green(`[${timestamp}] Updated ${functionName}`));
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
        console.error(colors.yellow(error));
      } else if (error instanceof ContentFunctionSpecError) {
        console.error(colors.yellow(error.message));
      } else {
        console.error(error);
      }
    }

    return false;
  }

  function processFunctionSpec(functionName, spec) {
    if (typeof spec?.data === 'function') {
      annotateFunction(spec.data, {name: functionName, description: 'data'});
    }

    if (typeof spec?.generate === 'function') {
      annotateFunction(spec.generate, {name: functionName});
    }

    return contentFunction(spec);
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
