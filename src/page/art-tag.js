// Art tag page specification.

export const description = `per-art-tag info & gallery pages`;

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
      path: ['artTagInfo', tag.directory],

      contentFunction: {
        name: 'generateArtTagInfoPage',
        args: [tag],
      },
    },

    {
      type: 'page',
      path: ['artTagGallery', tag.directory],

      contentFunction: {
        name: 'generateArtTagGalleryPage',
        args: [tag],
      },
    },
  ];
}
