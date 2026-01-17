export default {
  relations: (relation, track) => ({
    albumArtworkColumn:
      relation('generateAlbumArtworkColumn', track.album),

    trackMusicVideos:
      track.musicVideos.map(musicVideo =>
        relation('generateMusicVideo', musicVideo, track)),
  }),

  generate: (relations, {html}) =>
    html.tags([
      relations.albumArtworkColumn,
      relations.trackMusicVideos,
    ]),
};
