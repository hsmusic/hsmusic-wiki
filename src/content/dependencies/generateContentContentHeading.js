export default {
  contentDependencies: ['generateContentHeading'],
  extraDependencies: ['html', 'language'],

  relations: (relation, _thing) => ({
    contentHeading:
      relation('generateContentHeading'),
  }),

  data: (thing) => ({
    name:
      thing.name,
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    string: {
      type: 'string',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    relations.contentHeading.slots({
      attributes: slots.attributes,

      title:
        language.$(slots.string, {
          thing:
            html.tag('i', data.name),
        }),

      stickyTitle:
        language.$(slots.string, 'sticky'),
    }),
};
