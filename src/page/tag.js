// Art tag page specification.

export const description = `per-artwork-tag gallery pages`;

export function condition({wikiData}) {
  return wikiData.wikiInfo.enableArtTagUI;
}

export function targets({wikiData}) {
  return wikiData.artTagData.filter((tag) => !tag.isContentWarning);
}

export function pathsForTarget(tag) {
  return [
    {
      type: 'page',
      path: ['tag', tag.directory],

      contentFunction: {
        name: 'generateArtTagGalleryPage',
        args: [tag],
      },
    },
  ];
}
