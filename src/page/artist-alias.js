// Artist alias redirect pages.
// (Makes old permalinks bring visitors to the up-to-date page.)

export function targets({wikiData}) {
    return wikiData.artistAliasData;
}

export function write(aliasArtist, {wikiData}) {
    // This function doesn't actually use wikiData, 8ut, um, consistency?

    const { alias: targetArtist } = aliasArtist;

    const redirect = {
        type: 'redirect',
        fromPath: ['artist', aliasArtist.directory],
        toPath: ['artist', targetArtist.directory],
        title: () => aliasArtist.name
    };

    return [redirect];
}

