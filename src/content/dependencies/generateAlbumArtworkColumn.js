export default {
  contentDependencies: ['generateAlbumArtInfoBox', 'generateCoverArtwork'],
  extraDependencies: ['html'],

  relations: (relation, album) => ({
    firstCover:
      (album.hasCoverArt
        ? relation('generateCoverArtwork', album.coverArtworks[0])
        : null),

    restCovers:
      (album.hasCoverArt
        ? album.coverArtworks.slice(1).map(artwork =>
            relation('generateCoverArtwork', artwork))
        : []),

    albumArtInfoBox:
      relation('generateAlbumArtInfoBox', album),
  }),

  generate: (relations, {html}) =>
    html.tags([
      relations.firstCover?.slots({
        showOriginDetails: true,
        showArtTagDetails: true,
        showReferenceDetails: true,
      }),

      relations.albumArtInfoBox,

      relations.restCovers.map(cover =>
        cover.slots({
          showOriginDetails: true,
          showArtTagDetails: true,
          showReferenceDetails: true,
        })),
    ]),
};
