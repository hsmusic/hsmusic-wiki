export default {
  relations: (relation, track, contextContributions) => ({
    trackLink:
      relation('linkTrack', track),

    contextualCredit:
      relation('generateArtistCredit',
        track.artistContribs,
        contextContributions,
        track.artistTextInLists),

    acontextualCredit:
      relation('generateArtistCredit',
        track.artistContribs,
        [],
        track.artistTextInLists),

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

    detail:
      track.nameDetail,

    duration:
      track.duration ?? 0,

    trackHasDuration:
      !!track.duration,
  }),

  slots: {
    // true always shows artists, false never does; 'auto' shows only if
    // the track's artists differ from the given context contributions.
    showArtists: {
      validate: v => v.is(true, false, 'auto'),
      default: 'auto',
    },

    showDetail: {
      type: 'boolean',
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

    colorMode: {
      validate: v => v.is('none', 'track', 'line'),
      default: 'track',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('trackList.item', itemCapsule =>
      html.tag('li',
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
            relations.trackLink
              .slot('color', slots.colorMode === 'track');

          if (data.detail && slots.showDetail) {
            workingCapsule += '.withDetail';
            workingOptions.detailAccent =
              html.tag('span', {class: 'name-detail'},
                language.$(itemCapsule, 'withDetail', 'accent', {
                  detail: language.sanitize(data.detail),
                }));
          }

          const artists =
            language.encapsulate(itemCapsule, 'artists', artistsCapsule => {
              const chosenCredit =
                (slots.showArtists === true
                  ? relations.acontextualCredit
               : slots.showArtists === 'auto'
                  ? relations.contextualCredit
                  : null);

              if (!chosenCredit) {
                return html.blank();
              }

              // This might still be blank, if the contextual credit is chosen
              // and it matches its context credit.
              return chosenCredit.slots({
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
