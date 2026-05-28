export default {
  relations: (relation, album) => ({
    link:
      (album.style === 'in-game vgm'
        ? relation('linkThing', 'localized.vgmAlbumCommentary', album)
        : relation('linkThing', 'localized.albumCommentary', album)),
  }),

  generate: (relations) => relations.link,
};
