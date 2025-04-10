export default {
  contentDependencies: ['generateCoverArtwork'],
  extraDependencies: ['html'],

  relations: (relation, track) => ({
    albumCover:
      (!track.hasUniqueCoverArt && track.album.hasCoverArt
        ? relation('generateCoverArtwork', track.album.coverArtworks[0])
        : null),

    trackCovers:
      (track.hasUniqueCoverArt
        ? track.trackArtworks.map(artwork =>
            relation('generateCoverArtwork', artwork))
        : []),
  }),

  generate: (relations, {html}) =>
    html.tags([
      relations.albumCover?.slots({
        showOriginDetails: true,
        showArtTagDetails: true,
        showReferenceDetails: true,
      }),

      relations.trackCovers.map(cover =>
        cover.slots({
          showOriginDetails: true,
          showArtTagDetails: true,
          showReferenceDetails: true,
        })),
    ]),
};
