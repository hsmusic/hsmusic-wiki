export default {
  contentDependencies: ['linkArtTagGallery', 'linkArtTagInfo'],
  extraDependencies: ['pagePath'],

  relations: (relation, artTag) => ({
    galleryLink: relation('linkArtTagGallery', artTag),
    infoLink: relation('linkArtTagInfo', artTag),
  }),

  generate: (relations, {pagePath}) =>
    (pagePath[0] === 'artTagInfo'
      ? relations.infoLink
      : relations.galleryLink),
};
