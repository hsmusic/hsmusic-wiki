import Thing from '#thing';

export default {
  contentDependencies: [
    'generateArtistCredit',
    'generateAbsoluteDatetimestamp',
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

    datetimestamp:
      (artwork.date !== artwork.thing.date
        ? relation('generateAbsoluteDatetimestamp', artwork.date)
        : null),
  }),


  data: (query, artwork) => ({
    label:
      artwork.label,

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
          language.encapsulate(capsule, 'artworkBy', workingCapsule => {
            const workingOptions = {};

            if (data.label) {
              workingCapsule += '.customLabel';
              workingOptions.label = data.label;
            }

            if (relations.datetimestamp) {
              workingCapsule += '.withYear';
              workingOptions.year =
                relations.datetimestamp.slots({
                  style: 'year',
                  tooltip: true,
                });
            }

            return relations.credit.slots({
              showAnnotation: true,
              showExternalLinks: true,
              showChronology: true,
              showWikiEdits: true,

              trimAnnotation: false,

              chronologyKind: 'coverArt',

              normalStringKey: workingCapsule,
              additionalStringOptions: workingOptions,
            });
          }),

          pagePath[0] === 'track' &&
          data.artworkThingType === 'album' &&
            language.$(capsule, 'trackArtFromAlbum', {
              album:
                relations.albumLink.slot('color', false),
            }),

          language.$(capsule, 'source', {
            [language.onlyIfOptions]: ['source'],
            source: relations.source.slot('mode', 'inline'),
          }),
        ])),
};
