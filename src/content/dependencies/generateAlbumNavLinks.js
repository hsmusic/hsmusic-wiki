export default {
  relations: (relation, album) => ({
    albumLink:
      relation('linkAlbum', album),

    switcher:
      relation('generateAlbumNavSwitcher', album, null),

    accent:
      relation('generateAlbumLinkNavAccent', album),
  }),

  slots: {
    showTrackNavigation: {type: 'boolean', default: false},
    showExtraLinks: {type: 'boolean', default: false},

    currentExtra: {
      validate: v => v.is('gallery', 'commentary'),
    },
  },

  generate: (relations, slots, {html, language}) =>
    language.encapsulate('albumPage.nav', navCapsule => [
      {auto: 'home'},

      {
        html:
          relations.albumLink
            .slot('attributes', {class: 'current'}),

        accent:
          (() => {
            const {switcher, accent} = relations;

            switcher.setSlots({
              showTrackNavigation: slots.showTrackNavigation,
              showExtraLinks: slots.showExtraLinks,
              currentExtra: slots.currentExtra,
            });

            if (!html.isBlank(switcher) && !html.isBlank(accent)) {
              return language.$(navCapsule, 'albumAccent.withLinks', {
                accent: accent,
                links: switcher,
              });
            } else if (!html.isBlank(accent)) {
              return accent;
            } else if (!html.isBlank(switcher)) {
              return switcher;
            } else {
              return html.blank();
            }
          })(),
      },
    ]),
};
