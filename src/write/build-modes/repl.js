export const description = `Provide command-line interactive access to wiki data objects`;

export const config = {
  fileSizes: {
    default: 'skip',
  },

  languageReloading: {
    default: 'perform',
  },

  mediaValidation: {
    default: 'skip',
  },

  search: {
    default: 'skip',
  },

  thumbs: {
    applicable: false,
  },
};

export function getCLIOptions() {
  return {
    'no-repl-history': {
      help: `Disable locally logging commands entered into the REPL in your home directory`,
      type: 'flag',
    },
  };
}

import * as os from 'node:os';
import * as path from 'node:path';
import * as repl from 'node:repl';

import _find, {bindFind} from '#find';
import CacheableObject from '#cacheable-object';
import {logWarn} from '#cli';
import {debugComposite} from '#composite';
import * as serialize from '#serialize';
import * as sort from '#sort';
import * as sugar from '#sugar';
import thingConstructors from '#things';
import * as wikiDataUtils from '#wiki-data';

export async function getContextAssignments({
  dataPath,
  mediaPath,
  mediaCachePath,

  defaultLanguage,
  languages,
  missingImagePaths,
  thumbsCache,
  urls,
  webRoutes,
  wikiData,

  getSizeOfAdditionalFile,
  getSizeOfImagePath,
  niceShowAggregate,
}) {
  let find;
  try {
    find = bindFind(wikiData);
  } catch (error) {
    console.error(error);
    logWarn`Failed to prepare wikiData-bound find() functions`;
    logWarn`\`find\` variable will be missing`;
  }

  const replContext = {
    dataPath,
    mediaPath,
    mediaCachePath,

    languages,
    defaultLanguage,
    language: defaultLanguage,

    missingImagePaths,
    thumbsCache,
    urls,
    webRoutes,

    wikiData,
    ...wikiData,
    WD: wikiData,

    ...thingConstructors,
    CacheableObject,
    debugComposite,

    ...sort,
    ...sugar,
    ...wikiDataUtils,

    serialize,
    S: serialize,

    _find,
    find,
    bindFind,

    getSizeOfAdditionalFile,
    getSizeOfImagePath,
    showAggregate: niceShowAggregate,
  };

  replContext.replContext = replContext;

  return replContext;
}

export async function go(buildOptions) {
  const {
    cliOptions,
    closeLanguageWatchers,
  } = buildOptions;

  const disableHistory = cliOptions['no-repl-history'] ?? false;

  console.log('HSMusic data REPL');

  const replServer = repl.start();

  Object.assign(replServer.context,
    await getContextAssignments(buildOptions));

  if (disableHistory) {
    console.log(`\rInput history disabled (--no-repl-history provided)`);
  } else {
    const historyFile = path.join(os.homedir(), '.hsmusic_repl_history');
    await new Promise(resolve => {
      replServer.setupHistory(historyFile, (err) => {
        if (err) {
          console.error(`\rFailed to begin locally logging input history to ${historyFile} (provide --no-repl-history to disable)`);
        } else {
          console.log(`\rLogging input history to ${historyFile} (provide --no-repl-history to disable)`);
        }
        resolve();
      });
    });
  }

  replServer.displayPrompt(true);

  let resolveDone;

  replServer.on('exit', () => {
    closeLanguageWatchers();
    resolveDone();
  });

  await new Promise(resolve => {
    resolveDone = resolve;
  });

  return true;
}
