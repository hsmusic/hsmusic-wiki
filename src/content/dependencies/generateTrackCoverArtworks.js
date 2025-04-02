export default {
  contentDependencies: ['generateTrackCoverArtwork'],

  relations: (relation, track) => ({
    albumCover:
      (!track.hasUniqueCoverArt && track.album.hasCoverArt
        ? relation('generateTrackCoverArtwork', track.album.coverArtworks[0])
        : null),

    trackCovers:
      (track.hasUniqueCoverArt
        ? track.trackArtworks.map(artwork =>
            relation('generateTrackCoverArtwork', artwork))
        : null),
  }),

  generate: (relations) =>
    [relations.albumCover, ...relations.trackCovers ?? []]
      .filter(Boolean)
      .map(cover =>
        cover.slots({
          showOriginDetails: true,
          showReferenceLinks: true,
          showNonUniqueLine: true,
        })),
};
