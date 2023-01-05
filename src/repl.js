import * as os from 'os';
import * as path from 'path';
import * as repl from 'repl';
import {fileURLToPath} from 'url';

import thingConstructors from './data/things/index.js';
import {quickLoadAllFromYAML} from './data/yaml.js';
import {logError, logWarn, parseOptions} from './util/cli.js';
import {isMain} from './util/node-utils.js';
import {bindOpts, showAggregate} from './util/sugar.js';
import {generateURLs} from './util/urls.js';

import {processLanguageFile} from './data/language.js';

import * as serialize from './util/serialize.js';
import * as sugar from './util/sugar.js';
import * as wikiDataUtils from './util/wiki-data.js';
import _find, {bindFind} from './util/find.js';

import urlSpec from './url-spec.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function getContextAssignments({
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
    wikiData,
    ...wikiData,
    WD: wikiData,

    ...thingConstructors,
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

async function main() {
  const miscOptions = await parseOptions(process.argv.slice(2), {
    'data-path': {
      type: 'value',
    },

    'no-history': {
      type: 'flag',
    },

    'show-traces': {
      type: 'flag',
    },
  });

  const dataPath = miscOptions['data-path'] || process.env.HSMUSIC_DATA;
  const disableHistory = miscOptions['no-history'] ?? false;
  const showTraces = miscOptions['show-traces'] ?? false;

  if (!dataPath) {
    logError`Expected --data-path option or HSMUSIC_DATA to be set`;
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
    wikiData,
  }));

  if (disableHistory) {
    console.log(`\rInput history disabled (--no-history provided)`);
    replServer.displayPrompt(true);
  } else {
    const historyFile = path.join(os.homedir(), '.hsmusic_repl_history');
    replServer.setupHistory(historyFile, (err) => {
      if (err) {
        console.error(
          `\rFailed to begin locally logging input history to ${historyFile} (provide --no-history to disable)`
        );
      } else {
        console.log(
          `\rLogging input history to ${historyFile} (provide --no-history to disable)`
        );
      }
      replServer.displayPrompt(true);
    });
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
