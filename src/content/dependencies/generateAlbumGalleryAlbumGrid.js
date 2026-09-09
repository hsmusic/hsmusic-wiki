export default {
  query: (album) => ({
    artworks:
      (album.hasCoverArt
        ? album.coverArtworks
        : []),
  }),

  relations: (relation, query, _album) => ({
    coverGrid:
      relation('generateCoverGrid', query.artworks),

    coverGridItems:
      query.artworks
        .map(artwork => relation('generateCoverGridItem', artwork))
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
  },

  generate: (relations, slots, {html}) =>
    html.tag('div', {[html.onlyIfContent]: true},
      slots.attributes,

      relations.coverGrid.slots({
        items: relations.coverGridItems,
      })),
};
