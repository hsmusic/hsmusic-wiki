export default {
  contentDependencies: [
    'generateArtistCredit',
    'generateAbsoluteDatetimestamp',
    'linkAlbum',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'pagePath'],

  query: (artwork) => ({
    attachedArtistContribs:
      (artwork.attachedArtwork
        ? artwork.attachedArtwork.artistContribs
        : null)
  }),

  relations: (relation, query, artwork) => ({
    credit:
      relation('generateArtistCredit',
        artwork.artistContribs,
        query.attachedArtistContribs ?? []),

    source:
      relation('transformContent', artwork.source),

    originDetails:
      relation('transformContent', artwork.originDetails),

    albumLink:
      (artwork.thing.isAlbum
        ? relation('linkAlbum', artwork.thing)
        : null),

    datetimestamp:
      (artwork.date && artwork.date !== artwork.thing.date
        ? relation('generateAbsoluteDatetimestamp', artwork.date)
        : null),
  }),


  data: (query, artwork) => ({
    label:
      artwork.label,

    forAlbum:
      artwork.thing.isAlbum,

    forSingleStyleAlbum:
      artwork.thing.isAlbum &&
      artwork.thing.style === 'single',

    showFilename:
      artwork.showFilename,
  }),

  generate: (data, relations, {html, language, pagePath}) =>
    language.encapsulate('misc.coverArtwork', capsule =>
      html.tag('p', {class: 'image-details'},
        {[html.onlyIfContent]: true},
        {[html.joinChildren]: html.tag('br')},

        {class: 'origin-details'},

        (() => {
          relations.datetimestamp?.setSlots({
            style: 'year',
            tooltip: true,
          });

          const artworkBy =
            language.encapsulate(capsule, 'artworkBy', workingCapsule => {
              const workingOptions = {};

              if (data.label) {
                workingCapsule += '.customLabel';
                workingOptions.label = data.label;
              }

              if (relations.datetimestamp) {
                workingCapsule += '.withYear';
                workingOptions.year = relations.datetimestamp;
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
            });

          const trackArtFromAlbum =
            pagePath[0] === 'track' &&
            data.forAlbum &&
            !data.forSingleStyleAlbum &&
              language.$(capsule, 'trackArtFromAlbum', {
                album:
                  relations.albumLink.slot('color', false),
              });

          const source =
            language.encapsulate(capsule, 'source', workingCapsule => {
              const workingOptions = {
                [language.onlyIfOptions]: ['source'],
                source: relations.source.slot('mode', 'inline'),
              };

              if (html.isBlank(artworkBy) && data.label) {
                workingCapsule += '.customLabel';
                workingOptions.label = data.label;
              }

              if (html.isBlank(artworkBy) && relations.datetimestamp) {
                workingCapsule += '.withYear';
                workingOptions.year = relations.datetimestamp;
              }

              return language.$(workingCapsule, workingOptions);
            });

          const label =
            html.isBlank(artworkBy) &&
            html.isBlank(source) &&
            language.encapsulate(capsule, 'customLabel', workingCapsule => {
              const workingOptions = {
                [language.onlyIfOptions]: ['label'],
                label: data.label,
              };

              if (relations.datetimestamp) {
                workingCapsule += '.withYear';
                workingOptions.year = relations.datetimestamp;
              }

              return language.$(workingCapsule, workingOptions);
            });

          const year =
            html.isBlank(artworkBy) &&
            html.isBlank(source) &&
            html.isBlank(label) &&
            language.$(capsule, 'year', {
              [language.onlyIfOptions]: ['year'],
              year: relations.datetimestamp,
            });

          const originDetailsLine =
            html.tag('span', {class: 'origin-details-line'},
              {[html.onlyIfContent]: true},

              relations.originDetails.slots({
                mode: 'inline',
                absorbPunctuationFollowingExternalLinks: false,
              }));

          const filenameLine =
            html.tag('span', {class: 'filename-line'},
              {[html.onlyIfContent]: true},

              html.tag('code', {class: 'filename'},
                {[html.onlyIfContent]: true},

                language.sanitize(data.showFilename)));

          return [
            artworkBy,
            trackArtFromAlbum,
            source,
            label,
            year,

            originDetailsLine,
            filenameLine,
          ];
        })())),
};
