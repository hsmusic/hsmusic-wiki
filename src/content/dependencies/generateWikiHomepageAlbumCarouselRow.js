import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['generateCoverCarousel', 'image', 'linkAlbum'],

  relations: (relation, row) => ({
    coverCarousel:
      relation('generateCoverCarousel'),

    links:
      row.albums
        .map(album => relation('linkAlbum', album)),

    images:
      row.albums
        .map(album => relation('image', album.artTags)),
  }),

  data: (row) => ({
    paths:
      row.albums.map(album =>
        (album.hasCoverArt
          ? ['media.albumCover', album.directory, album.coverArtFileExtension]
          : null)),
  }),

  generate: (data, relations) =>
    relations.coverCarousel.slots({
      links:
        relations.links,

      images:
        stitchArrays({
          image: relations.images,
          path: data.paths,
        }).map(({image, path}) =>
            image.slot('path', path)),
    }),
};
