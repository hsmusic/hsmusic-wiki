export default {
  relations: (relation, track) => ({
    albumLink:
      relation('linkAlbum', track.album),

    albumLinkNavAccent:
      relation('generateAlbumLinkNavAccent', track.album),

    trackLink:
      relation('linkTrack', track),
  }),

  data: (track) => ({
    showTrackSection:
      track.album.showTrackSectionInNavBar &&
      (track.album.trackSections.length >= 2 ||
       !track.trackSection.isDefaultTrackSection),

    hasTrackNumbers:
      track.album.hasTrackNumbers,

    trackSectionName:
      track.trackSection.name,

    trackNumber:
      track.trackNumber,

    nameDetail:
      (track.album.style === 'meta'
        ? track.nameDetailWithinAlbum
        : null),
  }),

  slots: {
    currentExtra: {
      validate: v => v.is('referenced-art', 'referencing-art'),
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('trackPage.nav', navCapsule => [
      {auto: 'home'},

      {
        html: relations.albumLink.slot('color', false),
        accent: relations.albumLinkNavAccent.slot('navString', navCapsule),
      },

      data.showTrackSection &&
        {
          html:
            relations.albumLink.clone()
              .slot('content', language.sanitize(data.trackSectionName)),
        },

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
          language.formatUnitList([
            language.sanitize(data.nameDetail),

            html.tag('a',
              {[html.onlyIfContent]: true},

              {href: ''},
              {class: 'current'},

              (slots.currentExtra === 'referenced-art'
                ? language.$('referencedArtworksPage.subtitle')
             : slots.currentExtra === 'referencing-art'
                ? language.$('referencingArtworksPage.subtitle')
                : null)),
          ]),
      },
    ]),
};
