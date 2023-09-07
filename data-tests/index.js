import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import chokidar from 'chokidar';

import {colors, logError, logInfo, logWarn, parseOptions} from '#cli';
import {isMain} from '#node-utils';
import {getContextAssignments} from '#repl';
import {bindOpts, showAggregate} from '#sugar';
import {quickLoadAllFromYAML} from '#yaml';

async function main() {
  const miscOptions = await parseOptions(process.argv.slice(2), {
    'data-path': {
      type: 'value',
    },
  });

  const dataPath = miscOptions['data-path'] || process.env.HSMUSIC_DATA;

  if (!dataPath) {
    logError`Expected --data-path option or HSMUSIC_DATA to be set`;
    return;
  }

  console.log(`HSMusic automated data tests`);
  console.log(`${colors.bright(colors.yellow(`:star:`))} Now featuring quick-reloading! ${colors.bright(colors.cyan(`:earth:`))}`);

  // Watch adjacent files in data-tests directory
  const metaPath = fileURLToPath(import.meta.url);
  const metaDirname = path.dirname(metaPath);
  const watcher = chokidar.watch(metaDirname);

  const wikiData = await quickLoadAllFromYAML(dataPath, {
    showAggregate: bindOpts(showAggregate, {
      showTraces: false,
    }),
  });

  const context = await getContextAssignments({
    wikiData,
  });

  let resolveNext;

  const queue = [];

  watcher.on('all', (event, path) => {
    if (!['add', 'change'].includes(event)) return;
    if (path === metaPath) return;
    if (resolveNext) {
      resolveNext(path);
    } else if (!queue.includes(path)) {
      queue.push(path);
    }
  });

  logInfo`Awaiting file changes.`;

  /* eslint-disable-next-line no-constant-condition */
  while (true) {
    const testPath = (queue.length
      ? queue.shift()
      : await new Promise(resolve => {
          resolveNext = resolve;
        }));

    resolveNext = null;

    const shortPath = path.basename(testPath);

    logInfo`Path updated: ${shortPath} - running this test!`;

    let imp;
    try {
      imp = await import(`${testPath}?${Date.now()}`)
    } catch (error) {
      logWarn`Failed to import ${shortPath} - ${error.constructor.name} details below:`;
      console.error(error);
      continue;
    }

    const {default: testFn} = imp;

    if (!testFn) {
      logWarn`No default export for ${shortPath}`;
      logWarn`Skipping this test for now!`;
      continue;
    }

    if (typeof testFn !== 'function') {
      logWarn`Default export for ${shortPath} is ${typeof testFn}, not function`;
      logWarn`Skipping this test for now!`;
      continue;
    }

    try {
      await testFn(context);
    } catch (error) {
      showAggregate(error, {
        pathToFileURL: f => path.relative(metaDirname, fileURLToPath(f)),
      });
    }
  }
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    if (error instanceof AggregateError) {
      showAggregate(error);
    } else {
      console.error(error);
    }
  });
}
