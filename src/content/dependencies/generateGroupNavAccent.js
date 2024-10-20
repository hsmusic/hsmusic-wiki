import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateInterpageDotSwitcher',
    'linkGroup',
    'linkGroupGallery',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, group) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    infoLink:
      relation('linkGroup', group),

    galleryLink:
      (empty(group.albums)
        ? null
        : relation('linkGroupGallery', group)),
  }),

  slots: {
    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate: (relations, slots, {language}) =>
    relations.switcher.slots({
      links: [
        relations.infoLink.slots({
          attributes: [
            slots.currentExtra === null &&
              {class: 'current'},
          ],

          content: language.$('misc.nav.info'),
        }),

        relations.galleryLink?.slots({
          attributes: [
            slots.currentExtra === 'gallery' &&
              {class: 'current'},
          ],

          content: language.$('misc.nav.gallery'),
        }),
      ],
    }),
};
