import { quickLoadAllFromYAML } from './data/yaml.js';
import { logError, parseOptions } from './util/cli.js';
import { isMain } from './util/node-utils.js';
import { showAggregate } from './util/sugar.js';

export default async function performAllChecks({
    dataPath,
    mediaPath,
}) {
    const wikiData = await quickLoadAllFromYAML(dataPath);

    console.log(wikiData);
}

if (isMain(import.meta.url)) {
    (async function() {
        const miscOptions = await parseOptions(process.argv.slice(2), {
            'data-path': {
                type: 'value'
            },

            'media-path': {
                type: 'value'
            },

            'show-traces': {
                type: 'flag'
            },
        });

        const dataPath = miscOptions['data-path'] || process.env.HSMUSIC_DATA;
        const mediaPath = miscOptions['media-path'] || process.env.HSMUSIC_MEDIA;

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

        await performAllChecks({
            dataPath,
            mediaPath,

            showAggregate: niceShowAggregate,
        });
    })().catch(err => {
        console.error(err);
    });
}
