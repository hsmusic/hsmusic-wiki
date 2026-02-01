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
     : thing.isMusicVideo
        ? relation('linkAnythingMan', thing.thing)
        : null),
  }),

  generate: (relations) =>
    relations.link,
};
