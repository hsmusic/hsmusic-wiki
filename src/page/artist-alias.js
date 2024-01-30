export const description = `redirects for aliased artist names`;

export function targets({wikiData}) {
  return wikiData.artistData.filter(artist => artist.isAlias);
}

export function pathsForTarget(aliasArtist) {
  const {aliasedArtist} = aliasArtist;

  // Don't generate a redirect page if this aliased name resolves to the same
  // directory as the original artist! See issue #280.
  if (aliasArtist.directory === aliasedArtist.directory) {
    return [];
  }

  return [
    {
      type: 'redirect',
      fromPath: ['artist', aliasArtist.directory],
      toPath: ['artist', aliasedArtist.directory],
      title: aliasedArtist.name,
    },
  ];
}
