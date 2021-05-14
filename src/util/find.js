function findHelper(keys, dataProp, findFn) {
    return (ref, {wikiData}) => {
        if (!ref) return null;
        ref = ref.replace(new RegExp(`^(${keys.join('|')}):`), '');

        const found = findFn(ref, wikiData[dataProp]);
        if (!found) {
            logWarn`Didn't match anything for ${ref}! (${keys.join(', ')})`;
        }

        return found;
    };
}

function matchDirectory(ref, data) {
    return data.find(({ directory }) => directory === ref);
}

function matchDirectoryOrName(ref, data) {
    let thing;

    thing = matchDirectory(ref, data);
    if (thing) return thing;

    thing = data.find(({ name }) => name === ref);
    if (thing) return thing;

    thing = data.find(({ name }) => name.toLowerCase() === ref.toLowerCase());
    if (thing) {
        logWarn`Bad capitalization: ${'\x1b[31m' + ref} -> ${'\x1b[32m' + thing.name}`;
        return thing;
    }

    return null;
}

const find = {
    album: findHelper(['album', 'album-commentary'], 'albumData', matchDirectoryOrName),
    artist: findHelper(['artist', 'artist-gallery'], 'artistData', matchDirectoryOrName),
    flash: findHelper(['flash'], 'flashData', matchDirectory),
    group: findHelper(['group', 'group-gallery'], 'groupData', matchDirectoryOrName),
    listing: findHelper(['listing'], 'listingSpec', matchDirectory),
    newsEntry: findHelper(['news-entry'], 'newsData', matchDirectory),
    staticPage: findHelper(['static'], 'staticPageData', matchDirectory),
    tag: findHelper(['tag'], 'tagData', (ref, data) =>
        matchDirectoryOrName(ref.startsWith('cw: ') ? ref.slice(4) : ref, data)),
    track: findHelper(['track'], 'trackData', matchDirectoryOrName)
};

export default find;
