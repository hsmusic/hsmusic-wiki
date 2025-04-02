export default {
  contentDependencies: ['generateArtistCredit', 'transformContent'],
  extraDependencies: ['html', 'language'],

  relations: (relation, artwork) => ({
    credit:
      relation('generateArtistCredit', artwork.artistContribs, []),

    source:
      relation('transformContent', artwork.source),
  }),

  data: (artwork) => ({
    label:
      artwork.label,

    date:
      (artwork.date !== artwork.thing.date
        ? artwork.date
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('misc.coverArtwork', capsule =>
      html.tag('p', {class: 'image-details'},
        {[html.onlyIfContent]: true},
        {[html.joinChildren]: html.tag('br')},

        {class: 'origin-details'},

        [
          relations.credit.slots({
            showAnnotation: true,
            showExternalLinks: true,
            showChronology: true,
            showWikiEdits: true,

            trimAnnotation: false,

            chronologyKind: 'coverArt',

            normalStringKey:
              (data.label
                ? capsule + '.artworkBy.customLabel'
                : capsule + '.artworkBy'),

            additionalStringOptions:
              (data.label
                ? {label: data.label}
                : {}),
          }),

          language.$(capsule, 'released', {
            [language.onlyIfOptions]: ['date'],
            date: language.formatDate(data.date),
          }),

          language.$(capsule, 'source', {
            [language.onlyIfOptions]: ['source'],
            source: relations.source.slot('mode', 'inline'),
          }),
        ])),
};
