export default {
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

    fileNotes:
      relation('transformContent', artwork.fileNotes),

    mainArtworkLink:
      (artwork.mainArtwork
        ? relation('linkArtwork', artwork.mainArtwork)
        : null),

    albumLink:
      (artwork.thing.isAlbum
        ? relation('linkAlbum', artwork.thing)
        : null),

    datetimestamp:
      relation('generateAbsoluteDatetimestamp',
        artwork.date,
        artwork.thing.date),
  }),

  data: (query, artwork) => ({
    label:
      artwork.label,

    forAlbum:
      artwork.thing.isAlbum,

    forVGMStyleAlbum:
      artwork.thing.isAlbum &&
      artwork.thing.style === 'in-game vgm',

    forSingleStyleAlbum:
      artwork.thing.isAlbum &&
      artwork.thing.style === 'single',

    showAsReusedFromAlbum:
      (artwork.isReusedArtwork &&
       artwork.thing.otherReleases.includes(artwork.mainArtwork.thing)

        ? artwork.mainArtwork.thing.album.name
        : false),

    showFilename:
      artwork.showFilename,
  }),

  generate: (data, relations, {html, language, pagePath}) =>
    language.encapsulate('misc.coverArtwork', capsule =>
      html.tag('p', {class: 'image-details'},
        {[html.onlyIfContent]: true},

        {class: 'origin-details'},

        (() => {
          relations.datetimestamp.setSlot('style', 'year-difference');

          const artworkBy =
            language.encapsulate(capsule, 'artworkBy', workingCapsule => {
              const workingOptions = {};

              if (data.label) {
                workingCapsule += '.customLabel';
                workingOptions.label = data.label;
              }

              if (!html.isBlank(relations.datetimestamp)) {
                workingCapsule += '.withYear';
                workingOptions.year = relations.datetimestamp;
              }

              return relations.credit.slots({
                showAnnotation: true,
                showExternalLinks: true,
                showChronology: true,
                showWikiEdits: true,

                chronologyKind: 'coverArt',

                normalStringKey: workingCapsule,
                additionalStringOptions: workingOptions,
              });
            });

          const trackArtFromAlbum =
            pagePath[0] === 'track' &&
            data.forAlbum &&
            !data.forVGMStyleAlbum &&
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

              if (html.isBlank(artworkBy) && !html.isBlank(relations.datetimestamp)) {
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

              if (!html.isBlank(relations.datetimestamp)) {
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

          if (relations.mainArtworkLink) {
            if (data.showAsReusedFromAlbum) {
              relations.mainArtworkLink.setSlot('content',
                language.sanitize(data.showAsReusedFromAlbum));
            }
          }

          const reusedFromLine =
            html.tag('span', {class: 'reused-from-line'},
              {[html.onlyIfContent]: true},

              language.$(capsule, 'reusedFrom', {
                [language.onlyIfOptions]: ['where'],
                where: relations.mainArtworkLink,
              }));

          const fileNotesLine =
            html.tag('span', {class: 'file-notes-line'},
              {[html.onlyIfContent]: true},

              relations.fileNotes.slots({
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
            html.tags([
              artworkBy,
              trackArtFromAlbum,
              source,
              label,
              year,
            ], {[html.joinChildren]: html.tag('br')}),

            originDetailsLine,
            reusedFromLine,
            fileNotesLine,
            filenameLine,
          ];
        })())),
};
