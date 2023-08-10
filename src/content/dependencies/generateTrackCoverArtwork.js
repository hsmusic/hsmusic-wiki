export default {
  contentDependencies: ['generateCoverArtwork'],

  relations: (relation, track) =>
    ({coverArtwork:
        relation('generateCoverArtwork',
          (track.hasUniqueCoverArt
            ? track.artTags
            : track.album.artTags))}),

  data: (track) =>
    ({path:
        (track.hasUniqueCoverArt
          ? ['media.trackCover', track.album.directory, track.directory, track.coverArtFileExtension]
          : ['media.albumCover', track.album.directory, track.album.coverArtFileExtension])}),

  generate: (data, relations) =>
    relations.coverArtwork.slot('path', data.path),
};

