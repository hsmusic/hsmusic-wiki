export default {
  contentDependencies: [
    'generateInterpageDotSwitcher',
    'linkArtTagInfo',
    'linkArtTagGallery',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl: ({wikiInfo}) =>
    ({enableListings: wikiInfo.enableListings}),

  relations: (relation, sprawl, tag) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    mainLink:
      relation('linkArtTagInfo', tag),

    infoLink:
      relation('linkArtTagInfo', tag),

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

    const galleryLink =
      relations.galleryLink.slots({
        attributes: {class: slots.currentExtra === 'gallery' && 'current'},
        content: language.$('misc.nav.gallery'),
      });

    return [
      {auto: 'home'},

      data.enableListings &&
        {
          path: ['localized.listingIndex'],
          title: language.$('listingIndex.title'),
        },

      {
        html:
          language.$('artTagPage.nav.tag', {
            tag: relations.mainLink,
          }),

        accent:
          relations.switcher.slots({
            links: [
              infoLink,
              galleryLink,
            ],
          }),
      },
    ].filter(Boolean);
  },
};
