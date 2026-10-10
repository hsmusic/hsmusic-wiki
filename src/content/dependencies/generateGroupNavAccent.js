import {empty} from '#sugar';

export default {
  relations: (relation, group) => ({
    switcher:
      relation('generateInterpageDotSwitcher'),

    infoLink:
      relation('linkGroup', group),

    galleryLink:
      relation('linkGroupGallery', group),
  }),

  data: (group) => ({
    hasAnyAlbums:
      !empty(group.albums),
  }),

  slots: {
    currentExtra: {
      validate: v => v.is('gallery'),
    },
  },

  generate: (data, relations, slots, {language}) =>
    relations.switcher.slots({
      links: [
        relations.infoLink.slots({
          attributes: [
            slots.currentExtra === null &&
              {class: 'current'},
          ],

          content: language.$('misc.nav.info'),
        }),

        (data.hasAnyAlbums || slots.currentExtra === 'gallery') &&
          relations.galleryLink.slots({
            attributes: [
              slots.currentExtra === 'gallery' &&
                {class: 'current'},
            ],

            content: language.$('misc.nav.gallery'),
          }),
      ],
    }),
};
