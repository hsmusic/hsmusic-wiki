import {empty} from '#sugar';

export default {
  contentDependencies: [
    'linkArtTag',
    'linkArtTagGallery',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) =>
    ({enableListings: wikiInfo.enableListings}),

  relations: (relation, sprawl, tag) => ({
    mainLink:
      relation('linkArtTag', tag),

    infoLink:
      relation('linkArtTag', tag),

    galleryLink:
      relation('linkArtTagGallery', tag),
  }),

  data: (sprawl) =>
    ({enableListings: sprawl.enableListings}),

  slots: {
    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate(data, relations, slots, {language}) {
    if (!data.enableListings) {
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

    const accent = `(${extrasPart})`;

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
          language.$('artTagPage.nav.tag', {
            tag: relations.mainLink,
          }),
      },
    ].filter(Boolean);
  },
};
