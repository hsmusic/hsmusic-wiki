export const description = `flash act gallery pages`;

export function condition({wikiData}) {
  return wikiData.wikiInfo.enableFlashesAndGames;
}

export function targets({wikiData}) {
  return wikiData.flashActData;
}

export function pathsForTarget(flashAct) {
  return [
    {
      type: 'page',
      path: ['flashActGallery', flashAct.directory],

      contentFunction: {
        name: 'generateFlashActGalleryPage',
        args: [flashAct],
      },
    },
  ];
}
