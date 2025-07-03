export default {
  contentDependencies: [
    'generateArtistCredit',
    'generateColorStyleAttribute',
    'generateTrackListMissingDuration',
    'linkTrack',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, track, contextContributions) => ({
    trackLink:
      relation('linkTrack', track),

    credit:
      relation('generateArtistCredit',
        track.artistContribs,
        contextContributions),

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
    // showArtists enables showing artists *at all.* It doesn't take precedence
    // over behavior which automatically collapses (certain) artists because of
    // provided context contributions.
    showArtists: {
      type: 'boolean',
      default: true,
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

          const artistCapsule = language.encapsulate(itemCapsule, 'withArtists');

          relations.credit.setSlots({
            normalStringKey:
              artistCapsule + '.by',

            featuringStringKey:
              artistCapsule + '.featuring',

            normalFeaturingStringKey:
              artistCapsule + '.by.featuring',
          });

          if (!html.isBlank(relations.credit)) {
            workingCapsule += '.withArtists';
            workingOptions.by =
              html.tag('span', {class: 'by'},
                relations.credit);
          }

          return language.$(workingCapsule, workingOptions);
        }))),
};
