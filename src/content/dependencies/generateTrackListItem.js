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

    // If true and the track doesn't have a duration, a missing-duration cue
    // will be displayed instead.
    showDuration: {
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
        slots.colorMode === 'line' &&
          relations.colorStyle.slot('context', 'primary-only'),

        language.encapsulate(itemCapsule, workingCapsule => {
          const workingOptions = {};

          workingOptions.track =
            relations.trackLink
              .slot('color', slots.colorMode === 'track');

          if (slots.showDuration) {
            workingCapsule += '.withDuration';
            workingOptions.duration =
              (data.trackHasDuration
                ? language.$(itemCapsule, 'withDuration.duration', {
                    duration:
                      language.formatDuration(data.duration),
                  })
                : relations.missingDuration);
          }

          const chosenCredit =
            (slots.showArtists === true
              ? relations.acontextualCredit
           : slots.showArtists === 'auto'
              ? relations.contextualCredit
              : null);

          if (chosenCredit) {
            const artistCapsule = language.encapsulate(itemCapsule, 'withArtists');

            chosenCredit.setSlots({
              normalStringKey:
                artistCapsule + '.by',

              featuringStringKey:
                artistCapsule + '.featuring',

              normalFeaturingStringKey:
                artistCapsule + '.by.featuring',
            });

            if (!html.isBlank(chosenCredit)) {
              workingCapsule += '.withArtists';
              workingOptions.by =
                html.tag('span', {class: 'by'},
                  chosenCredit);
            }
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
