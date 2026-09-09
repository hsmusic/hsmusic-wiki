export default {
  relations: (relation, artists) => ({
    artistLinks:
      artists
        .map(artist => relation('linkArtistGallery', artist)),
  }),

  data: (artists) => ({
    creditAsFrom:
      artists.every(artist => artist.creditArtworksAsFromArtist),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('albumGalleryPage', pageCapsule =>
      html.tag('p', {class: 'quick-info'},
        (data.creditAsFrom
          ? language.$(pageCapsule, 'allTrackArtworkFrom', {
              artists:
                language.formatConjunctionList(relations.artistLinks),
            })
          : language.$(pageCapsule, 'allTrackArtworkBy', {
              artists:
                language.formatConjunctionList(relations.artistLinks),
            })))),
};
