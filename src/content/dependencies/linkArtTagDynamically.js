export default {
  relations: (relation, artTag) => ({
    galleryLink: relation('linkArtTagGallery', artTag),
    infoLink: relation('linkArtTagInfo', artTag),
  }),

  generate: (relations, {pagePath}) =>
    (pagePath[0] === 'artTagInfo'
      ? relations.infoLink
      : relations.galleryLink),
};
