export default {
  contentDependencies: ['linkAlbumGallery', 'linkAlbum'],
  extraDependencies: ['pagePath'],

  relations: (relation, album) => ({
    galleryLink: relation('linkAlbumGallery', album),
    infoLink: relation('linkAlbum', album),
  }),

  generate: (relations, {pagePath}) =>
    (pagePath[0] === 'albumGallery'
      ? relations.galleryLink
      : relations.infoLink),
};
