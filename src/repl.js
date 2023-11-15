import * as os from 'node:os';
import * as path from 'node:path';
import * as repl from 'node:repl';
import {fileURLToPath} from 'node:url';

import {logError, logWarn, parseOptions} from '#cli';
import {isMain} from '#node-utils';
import {processLanguageFile} from '#language';
import {bindOpts, showAggregate} from '#sugar';
import {generateURLs, urlSpec} from '#urls';
import {quickLoadAllFromYAML} from '#yaml';

import _find, {bindFind} from '#find';
import CacheableObject from '#cacheable-object';
import thingConstructors from '#things';
import * as serialize from '#serialize';
import * as sugar from '#sugar';
import * as wikiDataUtils from '#wiki-data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function getContextAssignments({
  dataPath,
  mediaPath,
  wikiData,
}) {
  let urls;
  try {
    urls = generateURLs(urlSpec);
  } catch (error) {
    console.error(error);
    logWarn`Failed to generate URL mappings for built-in urlSpec`;
    logWarn`\`urls\` variable will be missing`;
  }

  let find;
  try {
    find = bindFind(wikiData);
  } catch (error) {
    console.error(error);
    logWarn`Failed to prepare wikiData-bound find() functions`;
    logWarn`\`find\` variable will be missing`;
  }

  let language;
  try {
    language = await processLanguageFile(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        'strings-default.json'));
  } catch (error) {
    console.error(error);
    logWarn`Failed to create Language object`;
    logWarn`\`language\` variable will be missing`;
    language = undefined;
  }

  return {
    dataPath,
    mediaPath,

    wikiData,
    ...wikiData,
    WD: wikiData,

    ...thingConstructors,
    CacheableObject,
    language,

    ...sugar,
    ...wikiDataUtils,

    serialize,
    S: serialize,

    urls,

    _find,
    find,
    bindFind,
  };
}

export default async function bootRepl({
  dataPath = process.env.HSMUSIC_DATA,
  mediaPath = process.env.HSMUSIC_MEDIA,
  disableHistory = false,
  showTraces = false,
}) {
  if (!dataPath) {
    logError`Expected --data-path option or HSMUSIC_DATA to be set`;
    return;
  }

  if (!mediaPath) {
    logError`Expected --media-path option or HSMUSIC_MEDIA to be set`;
    return;
  }

  console.log('HSMusic data REPL');

  const wikiData = await quickLoadAllFromYAML(dataPath, {
    showAggregate: bindOpts(showAggregate, {
      showTraces,
      pathToFileURL: (f) => path.relative(__dirname, fileURLToPath(f)),
    }),
  });

  const replServer = repl.start();

  Object.assign(replServer.context, await getContextAssignments({
    dataPath,
    mediaPath,
    wikiData,
  }));

  if (disableHistory) {
    console.log(`\rInput history disabled (--no-repl-history provided)`);
    replServer.displayPrompt(true);
  } else {
    const historyFile = path.join(os.homedir(), '.hsmusic_repl_history');
    replServer.setupHistory(historyFile, (err) => {
      if (err) {
        console.error(
          `\rFailed to begin locally logging input history to ${historyFile} (provide --no-repl-history to disable)`
        );
      } else {
        console.log(
          `\rLogging input history to ${historyFile} (provide --no-repl-history to disable)`
        );
      }
      replServer.displayPrompt(true);
    });
  }

  // Is this called breaking a promise?
  await new Promise(() => {});

  return true;
}

async function main() {
  const miscOptions = await parseOptions(process.argv.slice(2), {
    'data-path': {
      type: 'value',
    },

    'media-path': {
      type: 'value',
    },

    'no-repl-history': {
      type: 'flag',
    },

    'show-traces': {
      type: 'flag',
    },
  });

  return bootRepl({
    dataPath: miscOptions['data-path'],
    mediaPath: miscOptions['media-path'],
    disableHistory: miscOptions['no-repl-history'],
    showTraces: miscOptions['show-traces'],
  });
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
