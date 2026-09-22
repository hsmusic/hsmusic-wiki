export default {
  relations: (relation, album) => ({
    link:
      relation('linkAlbum', album),

    image:
      relation('image', album.coverArtworks[0]),
  }),

  generate: (relations) =>
    relations.link.slots({
      attributes: {class: 'carousel-tile'},
      color: false,

      content:
        relations.image.slots({
          thumb: 'small',
          lazy: 'native',
          needsDimensionAttributes: false,
          needsImageOverlayAttributes: false,
          needsInnerOuterWrappers: false,
          needsImageClass: false,
          needsContainer: false,
        }),
    }),
};
