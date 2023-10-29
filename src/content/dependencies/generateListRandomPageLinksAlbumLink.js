export default {
  contentDependencies: ['linkAlbum'],

  data: (album) =>
    ({directory: album.directory}),

  relations: (relation, album) =>
    ({albumLink: relation('linkAlbum', album)}),

  generate: (data, relations) =>
    relations.albumLink.slots({
      anchor: true,
      attributes: {
        'data-random': 'track-in-album',
        'style': `--album-directory: ${data.directory}`,
      },
    }),
};
