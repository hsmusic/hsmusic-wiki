export default {
  query: (track) => ({
    regularReleases:
      track.otherReleases.filter(track => track.album.style !== 'meta'),

    metaReleases:
      track.otherReleases.filter(track => track.album.style === 'meta'),
  }),

  relations: (relation, query, track) => ({
    regularReleasesLine:
      relation('generateTrackInfoPageOtherReleasesLine',
        track,
        query.regularReleases),

    metaReleasesLine:
      relation('generateTrackInfoPageOtherReleasesLine',
        track,
        query.metaReleases),
  }),

  generate: (relations) => [
    relations.regularReleasesLine,
    relations.metaReleasesLine.slot('meta', true),
  ],
};
