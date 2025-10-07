export default {
  relations(relation, coverArtists) {
    return {
      coverArtistLinks:
        coverArtists
          .map(artist => relation('linkArtistGallery', artist)),
    };
  },

  generate(relations, {html, language}) {
    return (
      html.tag('p', {class: 'quick-info'},
        language.$('albumGalleryPage.coverArtistsLine', {
          artists: language.formatConjunctionList(relations.coverArtistLinks),
        })));
  },
};
