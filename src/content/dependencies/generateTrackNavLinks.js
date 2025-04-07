export default {
  contentDependencies: ['linkAlbum', 'linkTrack'],
  extraDependencies: ['html', 'language'],

  relations: (relation, track) => ({
    albumLink:
      relation('linkAlbum', track.album),

    trackLink:
      relation('linkTrack', track),
  }),

  data: (track) => ({
    hasTrackNumbers:
      track.album.hasTrackNumbers,

    trackNumber:
      track.trackNumber,
  }),

  slots: {
    currentExtra: {
      validate: v => v.is('referenced-art', 'referencing-art'),
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('trackPage.nav', navCapsule => [
      {auto: 'home'},

      {html: relations.albumLink.slot('color', false)},

      {
        html:
          language.encapsulate(navCapsule, 'track', workingCapsule => {
            const workingOptions = {};

            workingOptions.track =
              relations.trackLink
                .slot('attributes', {class: 'current'});

            if (data.hasTrackNumbers) {
              workingCapsule += '.withNumber';
              workingOptions.number = data.trackNumber;
            }

            return language.$(workingCapsule, workingOptions);
          }),

        accent:
          html.tag('a',
            {[html.onlyIfContent]: true},

            {href: ''},
            {class: 'current'},

            (slots.currentExtra === 'referenced-art'
              ? language.$('referencedArtworksPage.subtitle')
           : slots.currentExtra === 'referencing-art'
              ? language.$('referencingArtworksPage.subtitle')
              : null)),
      },
    ]),
};
