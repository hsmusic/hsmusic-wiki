import * as os from 'os';
import * as path from 'path';
import * as repl from 'repl';

import {quickLoadAllFromYAML} from './data/yaml.js';
import {logError, logWarn, parseOptions} from './util/cli.js';
import {showAggregate} from './util/sugar.js';
import {generateURLs} from './util/urls.js';

import * as serialize from './util/serialize.js';
import * as sugar from './util/sugar.js';
import * as wikiDataUtils from './util/wiki-data.js';
import _find, {bindFind} from './util/find.js';

import urlSpec from './url-spec.js';

async function main() {
  const miscOptions = await parseOptions(process.argv.slice(2), {
    'data-path': {
      type: 'value',
    },

    'no-history': {
      type: 'flag',
    },
  });

  const dataPath = miscOptions['data-path'] || process.env.HSMUSIC_DATA;
  const disableHistory = miscOptions['no-history'] ?? false;

  if (!dataPath) {
    logError`Expected --data-path option or HSMUSIC_DATA to be set`;
    return;
  }

  console.log('HSMusic data REPL');

  const wikiData = await quickLoadAllFromYAML(dataPath);
  const replServer = repl.start();

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

  Object.assign(replServer.context, wikiData, {
    wikiData,
    WD: wikiData,

    serialize,
    S: serialize,

    _find,
    find,
    bindFind,
    urls,

    ...sugar,
    ...wikiDataUtils,
  });

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

main().catch((error) => {
  if (error instanceof AggregateError) {
    showAggregate(error);
  } else {
    console.error(error);
  }
});
