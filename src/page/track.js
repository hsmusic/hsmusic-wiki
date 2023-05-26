// Track page specification.

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
  ];
}
