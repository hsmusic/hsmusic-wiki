export default {
  relations: (relation, album) => ({
    link:
      (album.style === 'in-game vgm'
        ? relation('linkThing', 'localized.vgmAlbumReferencingArtworks', album)
        : relation('linkThing', 'localized.albumReferencingArtworks', album)),
  }),

  generate: (relations) => relations.link,
};
