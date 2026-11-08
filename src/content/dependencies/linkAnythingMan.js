export default {
  relations: (relation, thing) => ({
    link:
      (thing.isAdditionalFile
        ? relation('linkAnythingMan', thing.thing)
     : thing.isMusicVideo
        ? relation('linkAnythingMan', thing.thing)

     : thing.isArtTag
        ? relation('linkArtTagDynamically', thing)

     : thing.isAlbum
        ? relation('linkAlbum', thing)
     : thing.isArtwork
        ? relation('linkArtwork', thing)
     : thing.isGroup
        ? relation('linkGroup', thing)
     : thing.isGroupCategory
        ? relation('linkGroupCategory', thing)
     : thing.isFlash
        ? relation('linkFlash', thing)
     : thing.isTrack
        ? relation('linkTrack', thing)

        : null),
  }),

  generate: (relations) =>
    relations.link,
};
