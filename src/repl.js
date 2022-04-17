import * as os from 'os';
import * as path from 'path';
import * as repl from 'repl';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

import {
    filterDuplicateDirectories,
    filterReferenceErrors,
    linkWikiDataArrays,
    loadAndProcessDataDocuments,
    sortWikiDataArrays,
} from './data/yaml.js';

import { logError, parseOptions } from './util/cli.js';
import { showAggregate } from './util/sugar.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    const miscOptions = await parseOptions(process.argv.slice(2), {
        'data-path': {
            type: 'value'
        },

        'show-traces': {
            type: 'flag'
        },

        'no-history': {
            type: 'flag'
        },
    });

    const dataPath = miscOptions['data-path'] || process.env.HSMUSIC_DATA;
    const showAggregateTraces = miscOptions['show-traces'] ?? false;
    const disableHistory = miscOptions['no-history'] ?? false;

    if (!dataPath) {
        logError`Expected --data-path option or HSMUSIC_DATA to be set`;
        return;
    }

    const niceShowAggregate = (error, ...opts) => {
        showAggregate(error, {
            showTraces: showAggregateTraces,
            pathToFile: f => path.relative(__dirname, f),
            ...opts
        });
    };

    console.log('HSMusic data REPL');

    let wikiData;

    {
        const { aggregate, result } = await loadAndProcessDataDocuments({
            dataPath,
        });

        wikiData = result;

        try {
            aggregate.close();
            console.log('Loaded data without errors. (complete data)');
        } catch (error) {
            niceShowAggregate(error);
            console.log('Loaded data with errors. (partial data)');
        }
    }

    linkWikiDataArrays(wikiData);

    try {
        filterDuplicateDirectories(wikiData).close();
        console.log('No duplicate directories found. (complete data)');
    } catch (error) {
        niceShowAggregate(error);
        console.log('Duplicate directories found. (partial data)');
    }

    try {
        filterReferenceErrors(wikiData).close();
        console.log('No reference errors found. (complete data)');
    } catch (error) {
        niceShowAggegate(error);
        console.log('Duplicate directories found. (partial data)');
    }

    sortWikiDataArrays(wikiData);

    const replServer = repl.start();

    Object.assign(
        replServer.context,
        wikiData,
        {wikiData, WD: wikiData}
    );

    if (disableHistory) {
        console.log(`\rInput history disabled (--no-history provided)`);
        replServer.displayPrompt(true);
    } else {
        const historyFile = path.join(os.homedir(), '.hsmusic_repl_history');
        replServer.setupHistory(historyFile, err => {
            if (err) {
                console.error(`\rFailed to begin locally logging input history to ${historyFile} (provide --no-history to disable)`);
            } else {
                console.log(`\rLogging input history to ${historyFile} (provide --no-history to disable)`);
            }
            replServer.displayPrompt(true);
        });
    }
}

main().catch(error => {
    if (error instanceof AggregateError) {
        showAggregate(error)
    } else {
        console.error(error);
    }
});
