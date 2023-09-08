export const description = `flash & game pages`;

export function condition({wikiData}) {
  return wikiData.wikiInfo.enableFlashesAndGames;
}

export function targets({wikiData}) {
  return wikiData.flashData;
}

export function pathsForTarget(flash) {
  return [
    {
      type: 'page',
      path: ['flash', flash.directory],

      contentFunction: {
        name: 'generateFlashInfoPage',
        args: [flash],
      },
    },
  ];
}

export function pathsTargetless() {
  return [
    {
      type: 'page',
      path: ['flashIndex'],
      contentFunction: {name: 'generateFlashIndexPage'},
    },
  ];
}
