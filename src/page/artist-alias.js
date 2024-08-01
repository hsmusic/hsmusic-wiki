export const description = `redirects for aliased artist names`;

export function targets({wikiData}) {
  const normalArtistDirectories =
    wikiData.artistData
      .filter(artist => !artist.isAlias)
      .map(artist => artist.directory);

  return (
    wikiData.artistData
      .filter(artist => artist.isAlias)

      // Don't generate a redirect page if this aliased name resolves to the
      // same directory as the original artist! See issue #280.
      .filter(aliasArtist =>
        aliasArtist.directory !==
        aliasArtist.aliasedArtist.directory)

      // And don't generate a redirect page if this aliased name resolves to the
      // same directory as any *other, non-alias* artist. In that case we really
      // just need the page (at this directory) to lead to the actual artist with
      // this directory - not be a redirect. See issue #543.
      .filter(aliasArtist =>
        !normalArtistDirectories.includes(aliasArtist.directory)));
}

export function pathsForTarget(aliasArtist) {
  const {aliasedArtist} = aliasArtist;

  return [
    {
      type: 'redirect',
      fromPath: ['artist', aliasArtist.directory],
      toPath: ['artist', aliasedArtist.directory],
      title: aliasedArtist.name,
    },
  ];
}
