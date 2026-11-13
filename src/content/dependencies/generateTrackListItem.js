export default {
  relations: (relation, track, contextContributions, contextFormatText) => ({
    trackLink:
      relation('linkTrack', track),

    artistCredit:
      relation('generateArtistCredit',
        track.artistContribs,
        contextContributions,
        track.artistTextInLists,
        contextFormatText),

    colorStyle:
      relation('generateColorStyleAttribute', track.color),

    missingDuration:
      (track.duration
        ? null
        : relation('generateTrackListMissingDuration')),
  }),

  data: (track, _contextContributions) => ({
    date:
      track.date,

    nameDetailWithinSection:
      track.nameDetailWithinSection,

    nameDetailWithinAlbum:
      track.nameDetailWithinAlbum,

    nameDetailAcrossWiki:
      track.nameDetailAcrossWiki,

    nameDetailOnTrackPage:
      track.nameDetailOnTrackPage,

    duration:
      track.duration ?? 0,

    trackHasDuration:
      !!track.duration,

    trackNumber:
      track.trackNumber,
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},

    anchor: {type: 'boolean'},
    linkless: {type: 'boolean'},
    hash: {type: 'string'},

    showArtists: {type: 'boolean', default: true},

    showNameDetail: {
      validate: v => v.is(...[
        'from within section',
        'from within album',
        'from across wiki',
        false,
      ]),

      default: false,
    },

    // If true and the track doesn't have a duration, a missing-duration cue
    // will be displayed instead.
    showDuration: {
      type: 'boolean',
      default: false,
    },

    showDate: {
      validate: v => v.anyOf(v.isBoolean, v.isDate),
      default: false,
    },

    // If true the <li> tag will get a value attribute to force the right
    // track number.
    setTrackNumberAttribute: {
      type: 'boolean',
      default: false,
    },

    colorMode: {
      validate: v => v.is('none', 'track', 'line'),
      default: 'track',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('trackList.item', itemCapsule =>
      html.tag('li',
        slots.attributes,

        slots.setTrackNumberAttribute &&
          {value: data.trackNumber},

        slots.colorMode === 'line' &&
          relations.colorStyle.slot('context', 'primary-only'),

        language.encapsulate(itemCapsule, workingCapsule => {
          const workingOptions = {};

          const accent =
            language.encapsulate(itemCapsule, 'accent', accentCapsule => {
              let workingCapsule = accentCapsule;
              let workingOptions = {};
              let any = false;

              if (slots.showDate) {
                any = true;
                workingCapsule += '.withDate';
                workingOptions.date =
                  language.$(accentCapsule, 'date', {
                    date:
                      (slots.showDate === true
                        ? language.formatDate(data.date)
                        : language.formatDate(slots.showDate)),
                  });
              }

              if (slots.showDuration) {
                any = true;
                workingCapsule += '.withDuration';
                workingOptions.duration =
                  (data.trackHasDuration
                    ? language.$(accentCapsule, 'duration', {
                        duration:
                          language.formatDuration(data.duration),
                      })
                    : relations.missingDuration);
              }

              if (any) {
                return language.$(workingCapsule, workingOptions);
              } else {
                return html.blank();
              }
            });

          if (!html.isBlank(accent)) {
            workingCapsule += '.withAccent';
            workingOptions.accent = accent;
          }

          workingOptions.track =
            relations.trackLink.slots({
              color: slots.colorMode === 'track',
              anchor: slots.anchor,
              linkless: slots.linkless,
              hash: slots.hash,
            });

          const nameDetail =
            (slots.showNameDetail === 'from within section'
              ? data.nameDetailWithinSection
           : slots.showNameDetail === 'from within album'
              ? data.nameDetailWithinAlbum
           : slots.showNameDetail
              ? data.nameDetailAcrossWiki
              : null);

          if (nameDetail) {
            workingCapsule += '.withDetail';
            workingOptions.detailAccent =
              html.tag('span', {class: 'name-detail'},
                !data.nameDetailOnTrackPage &&
                  {class: 'clarification'},

                language.$(itemCapsule, 'withDetail', 'accent', {
                  detail: language.sanitize(nameDetail),
                }));
          }

          const artists =
            language.encapsulate(itemCapsule, 'artists', artistsCapsule => {
              if (!slots.showArtists) {
                return html.blank();
              }

              // This might still be blank, if the credit matches the given
              // context contributions.
              return relations.artistCredit.slots({
                normalStringKey:
                  artistsCapsule + '.by',

                featuringStringKey:
                  artistsCapsule + '.featuring',

                normalFeaturingStringKey:
                  artistsCapsule + '.by.featuring',
              });
            });

          if (!html.isBlank(artists)) {
            workingCapsule += '.withArtists';
            workingOptions.artists =
              html.tag('span', {class: 'by'}, artists);
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
