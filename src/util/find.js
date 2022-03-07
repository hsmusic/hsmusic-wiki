import {
    color,
    logError,
    logWarn
} from './cli.js';

import { inspect } from 'util';

function warnOrThrow(mode, message) {
    switch (mode) {
        case 'error':
            throw new Error(message);
        case 'warn':
            logWarn(message);
        default:
            return null;
    }
}

function findHelper(keys, findFns = {}) {
    // Note: This cache explicitly *doesn't* support mutable data arrays. If the
    // data array is modified, make sure it's actually a new array object, not
    // the original, or the cache here will break and act as though the data
    // hasn't changed!
    const cache = new WeakMap();

    const byDirectory = findFns.byDirectory || matchDirectory;
    const byName = findFns.byName || matchName;

    const keyRefRegex = new RegExp(String.raw`^(?:(${keys.join('|')}):(?=\S))?(.*)$`);

    // The mode argument here may be 'warn', 'error', or 'quiet'. 'error' throws
    // errors for null matches (with details about the error), while 'warn' and
    // 'quiet' both return null, with 'warn' logging details directly to the
    // console.
    return (fullRef, data, {mode = 'warn'} = {}) => {
        if (!fullRef) return null;
        if (typeof fullRef !== 'string') {
            throw new Error(`Got a reference that is ${typeof fullRef}, not string: ${fullRef}`);
        }

        if (!data) {
            throw new Error(`Expected data to be present`);
        }

        if (!Array.isArray(data) && data.wikiData) {
            throw new Error(`Old {wikiData: {...}} format provided`);
        }

        let cacheForThisData = cache.get(data);
        const cachedValue = cacheForThisData?.[fullRef];
        if (cachedValue) {
            globalThis.NUM_CACHE = (globalThis.NUM_CACHE || 0) + 1;
            return cachedValue;
        }
        if (!cacheForThisData) {
            cacheForThisData = Object.create(null);
            cache.set(data, cacheForThisData);
        }

        const match = fullRef.match(keyRefRegex);
        if (!match) {
            return warnOrThrow(mode, `Malformed link reference: "${fullRef}"`);
        }

        const key = match[1];
        const ref = match[2];

        const found = (key
            ? byDirectory(ref, data, mode)
            : byName(ref, data, mode));

        if (!found) {
            warnOrThrow(mode, `Didn't match anything for ${color.bright(fullRef)}`);
        }

        cacheForThisData[fullRef] = found;

        return found;
    };
}

function matchDirectory(ref, data, mode) {
    return data.find(({ directory }) => directory === ref);
}

function matchName(ref, data, mode) {
    const matches = data.filter(({ name }) => name.toLowerCase() === ref.toLowerCase());

    if (matches.length > 1) {
        return warnOrThrow(mode,
            `Multiple matches for reference "${ref}". Please resolve:\n` +
            matches.map(match => `- ${inspect(match)}\n`).join('') +
            `Returning null for this reference.`);
    }

    if (matches.length === 0) {
        return null;
    }

    const thing = matches[0];

    if (ref !== thing.name) {
        warnOrThrow(mode, `Bad capitalization: ${color.red(ref)} -> ${color.green(thing.name)}`);
    }

    return thing;
}

function matchTagName(ref, data, quiet) {
    return matchName(ref.startsWith('cw: ') ? ref.slice(4) : ref, data, quiet);
}

const find = {
    album: findHelper(['album', 'album-commentary']),
    artist: findHelper(['artist', 'artist-gallery']),
    artTag: findHelper(['tag'], {byName: matchTagName}),
    flash: findHelper(['flash']),
    group: findHelper(['group', 'group-gallery']),
    listing: findHelper(['listing']),
    newsEntry: findHelper(['news-entry']),
    staticPage: findHelper(['static']),
    track: findHelper(['track'])
};

export default find;
