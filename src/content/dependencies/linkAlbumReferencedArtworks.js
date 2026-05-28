export default {
  relations: (relation, album) => ({
    link:
      (album.style === 'in-game vgm'
        ? relation('linkThing', 'localized.vgmAlbumReferencedArtworks', album)
        : relation('linkThing', 'localized.albumReferencedArtworks', album)),
  }),

  generate: (relations) => relations.link,
};
