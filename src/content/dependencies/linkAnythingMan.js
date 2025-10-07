export default {
  relations: (relation, thing) => ({
    link:
      (thing.isAlbum
        ? relation('linkAlbum', thing)
     : thing.isArtwork
        ? relation('linkArtwork', thing)
     : thing.isFlash
        ? relation('linkFlash', thing)
     : thing.isTrack
        ? relation('linkTrack', thing)
        : null),
  }),

  generate: (relations) =>
    relations.link,
};
