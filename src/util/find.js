import {
    logError,
    logWarn
} from './cli.js';

function findHelper(keys, dataProp, findFns = {}) {
    const byDirectory = findFns.byDirectory || matchDirectory;
    const byName = findFns.byName || matchName;

    const keyRefRegex = new RegExp(`^((${keys.join('|')}):)?(.*)$`);

    return (fullRef, {wikiData}) => {
        if (!fullRef) return null;
        if (typeof fullRef !== 'string') {
            throw new Error(`Got a reference that is ${typeof fullRef}, not string: ${fullRef}`);
        }

        const match = fullRef.match(keyRefRegex);
        if (!match) {
            throw new Error(`Malformed link reference: "${fullRef}"`);
        }

        const key = match[1];
        const ref = match[3];

        const data = wikiData[dataProp];

        const found = (key
            ? byDirectory(ref, data)
            : byName(ref, data));

        if (!found) {
            logWarn`Didn't match anything for ${fullRef}!`;
        }

        return found;
    };
}

function matchDirectory(ref, data) {
    return data.find(({ directory }) => directory === ref);
}

function matchName(ref, data) {
    const matches = data.filter(({ name }) => name.toLowerCase() === ref.toLowerCase());

    if (matches.length > 1) {
        logError`Multiple matches for reference "${ref}". Please resolve:`;
        for (const match of matches) {
            logError`- ${match.name} (${match.directory})`;
        }
        logError`Returning null for this reference.`;
        return null;
    }

    if (matches.length === 0) {
        return null;
    }

    const thing = matches[0];

    if (ref !== thing.name) {
        logWarn`Bad capitalization: ${'\x1b[31m' + ref} -> ${'\x1b[32m' + thing.name}`;
    }

    return thing;
}

function matchTagName(ref, data) {
    return matchName(ref.startsWith('cw: ') ? ref.slice(4) : ref, data);
}

const find = {
    album: findHelper(['album', 'album-commentary'], 'albumData'),
    artist: findHelper(['artist', 'artist-gallery'], 'artistData'),
    flash: findHelper(['flash'], 'flashData'),
    group: findHelper(['group', 'group-gallery'], 'groupData'),
    listing: findHelper(['listing'], 'listingSpec'),
    newsEntry: findHelper(['news-entry'], 'newsData'),
    staticPage: findHelper(['static'], 'staticPageData'),
    tag: findHelper(['tag'], 'tagData', {byName: matchTagName}),
    track: findHelper(['track'], 'trackData')
};

export default find;
