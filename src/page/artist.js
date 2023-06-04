// Artist page specification.
//
// NB: See artist-alias.js for artist alias redirect pages.

import {empty} from '../util/sugar.js';

export const description = `per-artist info & artwork gallery pages`;

export function targets({wikiData}) {
  return wikiData.artistData;
}

export function pathsForTarget(artist) {
  const hasGalleryPage =
    !empty(artist.tracksAsCoverArtist) ||
    !empty(artist.albumsAsCoverArtist);

  return [
    {
      type: 'page',
      path: ['artist', artist.directory],

      contentFunction: {
        name: 'generateArtistInfoPage',
        args: [artist],
      },
    },

    hasGalleryPage && {
      type: 'page',
      path: ['artistGallery', artist.directory],

      contentFunction: {
        name: 'generateArtistGalleryPage',
        args: [artist],
      },
    },
  ];
}
