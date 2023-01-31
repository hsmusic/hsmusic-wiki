// Artist alias redirect pages.
// (Makes old permalinks bring visitors to the up-to-date page.)

export const description = `redirects for aliased artist names`;

export function targets({wikiData}) {
  return wikiData.artistAliasData;
}

export function write(aliasArtist) {
  const {aliasedArtist} = aliasArtist;

  const redirect = {
    type: 'redirect',
    fromPath: ['artist', aliasArtist.directory],
    toPath: ['artist', aliasedArtist.directory],
    title: () => aliasedArtist.name,
  };

  return [redirect];
}
