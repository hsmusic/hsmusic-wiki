export default {
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

    trackMusicVideos:
      track.musicVideos.map(musicVideo =>
        relation('generateMusicVideo', musicVideo, track)),
  }),

  generate: (relations, {html}) =>
    html.tags([
      relations.albumCover?.slots({
        showOriginDetails: true,
        showArtTagDetails: true,
        showReferenceDetails: false,
      }),

      relations.trackCovers.map(cover =>
        cover.slots({
          showOriginDetails: true,
          showArtTagDetails: true,
          showReferenceDetails: true,
        })),

      relations.trackMusicVideos,
    ]),
};
