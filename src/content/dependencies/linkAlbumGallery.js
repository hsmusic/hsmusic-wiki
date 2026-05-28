export default {
  relations: (relation, album) => ({
    link:
      (album.style === 'in-game vgm'
        ? relation('linkThing', 'localized.vgmAlbumGallery', album)
        : relation('linkThing', 'localized.albumGallery', album)),
  }),

  generate: (relations) => relations.link,
};
