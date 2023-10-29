import {empty} from '#sugar';

export default {
  contentDependencies: [
    'linkGroup',
    'linkGroupGallery',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({groupCategoryData, wikiInfo}) {
    return {
      groupCategoryData,
      enableGroupUI: wikiInfo.enableGroupUI,
      enableListings: wikiInfo.enableListings,
    };
  },

  relations(relation, sprawl, group) {
    if (!sprawl.enableGroupUI) {
      return {};
    }

    const relations = {};

    relations.mainLink =
      relation('linkGroup', group);

    relations.infoLink =
      relation('linkGroup', group);

    if (!empty(group.albums)) {
      relations.galleryLink =
        relation('linkGroupGallery', group);
    }

    return relations;
  },

  data(sprawl) {
    return {
      enableGroupUI: sprawl.enableGroupUI,
      enableListings: sprawl.enableListings,
    };
  },

  slots: {
    showExtraLinks: {type: 'boolean', default: false},

    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate(data, relations, slots, {language}) {
    if (!data.enableGroupUI) {
      return [
        {auto: 'home'},
        {auto: 'current'},
      ];
    }

    const infoLink =
      relations.infoLink.slots({
        attributes: {class: slots.currentExtra === null && 'current'},
        content: language.$('misc.nav.info'),
      });

    const extraLinks = [
      relations.galleryLink?.slots({
        attributes: {class: slots.currentExtra === 'gallery' && 'current'},
        content: language.$('misc.nav.gallery'),
      }),
    ];

    const extrasPart =
      (empty(extraLinks)
        ? ''
        : language.formatUnitList([infoLink, ...extraLinks]));

    const accent =
      (extrasPart
        ? `(${extrasPart})`
        : null);

    return [
      {auto: 'home'},

      data.enableListings &&
        {
          path: ['localized.listingIndex'],
          title: language.$('listingIndex.title'),
        },

      {
        accent,
        html:
          language.$('groupPage.nav.group', {
            group: relations.mainLink,
          }),
      },
    ].filter(Boolean);
  },
};
