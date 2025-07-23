export default {
  contentDependencies: ['generateTrackList'],
  extraDependencies: ['html'],

  relations: (relation, tracks) => ({
    trackList:
      relation('generateTrackList', tracks, null),
  }),

  generate: (relations, {html}) =>
    relations.trackList,
};
