export default {
  contentDependencies: ['linkThing'],
  extraDependencies: ['html'],

  relations: (relation, medium) => ({
    link:
      relation('linkThing', 'localized.medium', medium),
  }),

  data: (medium) => ({
    nameWithoutType:
      medium.name.replace(/\s*\([^()]*\)$/, ''),
  }),

  slots: {
    trimType: {
      type: 'boolean',
      default: false,
    },
  },

  generate(data, relations, slots) {
    const {link} = relations;

    if (slots.trimType) {
      link.setSlot('content', data.nameWithoutType);
    }

    return link;
  },
};
