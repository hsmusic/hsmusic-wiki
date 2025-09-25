// Art tag page specification.

export const description = `per-motif info pages`;

export function targets({wikiData}) {
  return wikiData.motifData;
}

export function pathsForTarget(tag) {
  return [
    {
      type: 'page',
      path: ['motifInfo', tag.directory],

      contentFunction: {
        name: 'generateMotifInfoPage',
        args: [tag],
      },
    },
  ];
}
