export default {
  relations: (relation, artwork) => ({
    referencedArtworksLink:
      relation('linkReferencedArtworks', artwork),

    referencingArtworksLink:
      relation('linkReferencingArtworks', artwork),
  }),

  data: (artwork) => ({
    referenced:
      artwork.referencedArtworks.length,

    referencedBy:
      artwork.referencedByArtworks.length,
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('releaseInfo', capsule => {
      const referencedText =
        language.$(capsule, 'referencesArtworks', {
          [language.onlyIfOptions]: ['artworks'],

          artworks:
            language.countArtworks(data.referenced, {
              blankIfZero: true,
              unit: true,
            }),
        });

      const referencingText =
        language.$(capsule, 'referencedByArtworks', {
          [language.onlyIfOptions]: ['artworks'],

          artworks:
            language.countArtworks(data.referencedBy, {
              blankIfZero: true,
              unit: true,
            }),
        });

      return (
        html.tag('p', {class: 'image-details'},
          {[html.onlyIfContent]: true},
          {[html.joinChildren]: html.tag('br')},

          {class: 'reference-details'},

          [
            !html.isBlank(referencedText) &&
              relations.referencedArtworksLink.slot('content', referencedText),

            !html.isBlank(referencingText) &&
              relations.referencingArtworksLink.slot('content', referencingText),
          ]));
    }),
}
