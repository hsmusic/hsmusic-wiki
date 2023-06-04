// Artist page specification.
//
// NB: See artist-alias.js for artist alias redirect pages.

export const description = `per-artist info & artwork gallery pages`;

export function targets({wikiData}) {
  return wikiData.artistData;
}

export function pathsForTarget(artist) {
  return [
    {
      type: 'page',
      path: ['artist', artist.directory],

      contentFunction: {
        name: 'generateArtistInfoPage',
        args: [artist],
      },
    },
  ];
}
