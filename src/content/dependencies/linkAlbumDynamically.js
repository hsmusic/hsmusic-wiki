export default {
  contentDependencies: ['linkAlbumGallery', 'linkAlbum'],
  extraDependencies: ['pagePath'],

  relations: (relation, album) => ({
    galleryLink: relation('linkAlbumGallery', album),
    infoLink: relation('linkAlbum', album),
  }),

  data: (album) => ({
    albumDirectory:
      album.directory,

    albumHasCommentary:
      !!album.commentary,
  }),

  generate: (data, relations, {pagePath}) =>
    (pagePath[0] === 'albumCommentary' &&
     pagePath[1] === data.albumDirectory &&
     data.albumHasCommentary
      ? relations.infoLink.slots({
          anchor: true,
          hash: 'album-commentary',
        })

   : pagePath[0] === 'albumGallery'
      ? relations.galleryLink
      : relations.infoLink),
};
