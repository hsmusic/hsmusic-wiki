export default {
  relations: (relation, row) => ({
    coverCarousel:
      relation('generateCoverCarousel'),

    links:
      row.albums
        .map(album => relation('linkAlbum', album)),

    images:
      row.albums
        .map(album => relation('image', album.coverArtworks[0])),
  }),

  generate: (relations) =>
    relations.coverCarousel.slots({
      links: relations.links,
      images: relations.images,
    }),
};
