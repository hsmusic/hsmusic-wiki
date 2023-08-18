import {empty} from '#sugar';

export default {
  contentDependencies: [
    'linkGroup',
    'linkGroupGallery',
  ],

  extraDependencies: ['html'],

  relations(relation, group) {
    const relations = {};

    relations.info =
      relation('linkGroup', group);

    if (!empty(group.albums)) {
      relations.gallery =
        relation('linkGroupGallery', group);
    }

    return relations;
  },

  slots: {
    extra: {
      validate: v => v.is('gallery'),
    },
  },

  generate(relations, slots) {
    return relations[slots.extra ?? 'info'] ?? relations.info;
  },
};
