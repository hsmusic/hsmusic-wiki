export default {
  contentDependencies: [
    'generateAlbumSecondaryNavGroupPart',
    'generateSecondaryNav',
  ],

  extraDependencies: ['html'],

  relations: (relation, album) => ({
    secondaryNav:
      relation('generateSecondaryNav'),

    groupParts:
      album.groups
        .map(group =>
          relation('generateAlbumSecondaryNavGroupPart',
            group,
            album)),
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'album',
    },
  },

  generate: (relations, slots) =>
    relations.secondaryNav.slots({
      class: 'nav-links-groups',
      content:
        relations.groupParts
          .map(part => part.slot('mode', slots.mode)),
    }),
};
