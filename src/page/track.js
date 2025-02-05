// Track page specification.

import {empty} from '#sugar';

export const description = `per-track info pages`;

export function targets({wikiData}) {
  return wikiData.trackData;
}

export function pathsForTarget(track) {
  return [
    {
      type: 'page',
      path: ['track', track.directory],

      contentFunction: {
        name: 'generateTrackInfoPage',
        args: [track],
      },
    },

    {
      type: 'page',
      path: ['trackReferencedArtworks', track.directory],

      condition: () =>
        !empty(track.referencedArtworks),

      contentFunction: {
        name: 'generateTrackReferencedArtworksPage',
        args: [track],
      },
    },

    {
      type: 'page',
      path: ['trackReferencingArtworks', track.directory],

      condition: () =>
        !empty(track.referencedByArtworks),

      contentFunction: {
        name: 'generateTrackReferencingArtworksPage',
        args: [track],
      },
    },
  ];
}
