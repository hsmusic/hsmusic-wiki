export default {
  contentDependencies: ['generateArtistCredit'],
  extraDependencies: ['html', 'language'],

  relations: (relation, artwork) => ({
    credit:
      relation('generateArtistCredit', artwork.artistContribs, []),
  }),

  data: (artwork) => ({
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

            normalStringKey: capsule + '.artworkBy',
          }),

          language.$(capsule, 'released', {
            [language.onlyIfOptions]: ['date'],
            date: language.formatDate(data.date),
          })
        ])),
};
