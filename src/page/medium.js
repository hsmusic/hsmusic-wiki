export const description = `per-medium info pages`;

export function targets({wikiData}) {
  return wikiData.mediumData;
}

export function pathsForTarget(medium) {
  return [
    {
      type: 'page',
      path: ['medium', medium.directory],

      contentFunction: {
        name: 'generateMediumInfoPage',
        args: [medium],
      },
    },
  ];
}
