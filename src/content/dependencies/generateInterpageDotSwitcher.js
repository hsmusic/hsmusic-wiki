export default {
  contentDependencies: ['generateDotSwitcherTemplate'],
  extraDependencies: ['html', 'language'],

  relations: (relation) => ({
    template:
      relation('generateDotSwitcherTemplate'),
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    links: {
      validate: v => v.strictArrayOf(v.isHTML),
    },
  },

  generate: (relations, slots) =>
    relations.template.slots({
      attributes: [
        {class: 'interpage'},
        slots.attributes,
      ],

      // TODO: Do something to set a class on a link to the current page??
      options: slots.links,
    }),
};
