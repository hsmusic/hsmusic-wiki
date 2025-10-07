export default {
  query: (album) => ({
    nonAttachingArtworkIndex:
      (album.hasCoverArt
        ? album.coverArtworks.findIndex((artwork, index) =>
            index > 1 &&
            !artwork.attachAbove)
        : null),
  }),

  relations: (relation, query, album) => ({
    firstCovers:
      (album.hasCoverArt && query.nonAttachingArtworkIndex >= 1
        ? album.coverArtworks
            .slice(0, query.nonAttachingArtworkIndex)
            .map(artwork => relation('generateCoverArtwork', artwork))

     : album.hasCoverArt
        ? album.coverArtworks
            .map(artwork => relation('generateCoverArtwork', artwork))

        : []),

    albumArtInfoBox:
      relation('generateAlbumArtInfoBox', album),

    restCovers:
      (album.hasCoverArt && query.nonAttachingArtworkIndex >= 1
        ? album.coverArtworks
            .slice(query.nonAttachingArtworkIndex)
            .map(artwork => relation('generateCoverArtwork', artwork))

        : []),
  }),

  generate(relations, {html}) {
    for (const cover of [...relations.firstCovers, ...relations.restCovers]) {
      cover.setSlots({
        showOriginDetails: true,
        showArtTagDetails: true,
        showReferenceDetails: true,
      });
    }

    return html.tags([
      relations.firstCovers,
      relations.albumArtInfoBox,
      relations.restCovers,
    ]);
  },
};
