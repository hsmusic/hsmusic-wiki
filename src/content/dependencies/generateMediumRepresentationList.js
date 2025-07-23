export default {
  contentDependencies: ['generateTrackList'],

  relations: (relation, medium) => ({
    trackList:
      relation('generateTrackList', medium.representedByTracks, null),
  }),

  generate: (relations) =>
    relations.trackList,
};
