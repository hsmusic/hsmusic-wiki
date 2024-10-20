export default {
  contentDependencies: ['generateGroupNavAccent', 'linkGroup'],
  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({groupCategoryData, wikiInfo}) => ({
    groupCategoryData,
    enableGroupUI: wikiInfo.enableGroupUI,
    enableListings: wikiInfo.enableListings,
  }),

  relations: (relation, _sprawl, group) => ({
    mainLink:
      relation('linkGroup', group),

    accent:
      relation('generateGroupNavAccent', group),
  }),

  data: (sprawl, _group) => ({
    enableGroupUI: sprawl.enableGroupUI,
    enableListings: sprawl.enableListings,
  }),

  slots: {
    showExtraLinks: {type: 'boolean', default: false},

    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate: (data, relations, slots, {language}) =>
    (data.enableGroupUI
      ? [
          {auto: 'home'},

          data.enableListings &&
            {
              path: ['localized.listingIndex'],
              title: language.$('listingIndex.title'),
            },

          {
            html:
              language.$('groupPage.nav.group', {
                group: relations.mainLink,
              }),

            accent:
              relations.accent
                .slot('currentExtra', slots.currentExtra),
          },
        ].filter(Boolean)

      : [
          {auto: 'home'},
          {auto: 'current'},
        ]),
};
