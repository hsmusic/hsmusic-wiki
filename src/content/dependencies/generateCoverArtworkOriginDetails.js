import Thing from '#thing';

export default {
  contentDependencies: [
    'generateArtistCredit',
    'linkAlbum',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'pagePath'],

  query: (artwork) => ({
    artworkThingType:
      artwork.thing.constructor[Thing.referenceType],
  }),

  relations: (relation, query, artwork) => ({
    credit:
      relation('generateArtistCredit', artwork.artistContribs, []),

    source:
      relation('transformContent', artwork.source),

    albumLink:
      (query.artworkThingType === 'album'
        ? relation('linkAlbum', artwork.thing)
        : null),
  }),

  data: (query, artwork) => ({
    label:
      artwork.label,

    date:
      (artwork.date !== artwork.thing.date
        ? artwork.date
        : null),

    artworkThingType:
      query.artworkThingType,
  }),

  generate: (data, relations, {html, language, pagePath}) =>
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

          pagePath[0] === 'track' &&
          data.artworkThingType === 'album' &&
            language.$(capsule, 'trackArtFromAlbum', {
              album:
                relations.albumLink.slot('color', false),
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
