export default {
  contentDependencies: ['linkArtistGallery'],
  extraDependencies: ['html', 'language'],

  relations: (relation, artwork) => ({
    artistLinks:
      artwork.artistContribs
        .map(contrib => contrib.artist)
        .map(artist =>
          relation('linkArtistGallery', artist)),
  }),

  generate: (relations, {html, language}) =>
    html.tag('p', {class: 'image-details'},
      {[html.onlyIfContent]: true},

      {class: 'illustrator-details'},

      language.$('misc.coverGrid.details.coverArtists', {
        [language.onlyIfOptions]: ['artists'],

        artists:
          language.formatConjunctionList(relations.artistLinks),
      })),
};
