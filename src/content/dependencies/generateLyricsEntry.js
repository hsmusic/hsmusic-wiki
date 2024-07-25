export default {
  contentDependencies: [
    'transformContent',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, entry) => ({
    content:
      relation('transformContent', entry.body),
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },
  },

  generate: (relations, slots, {html}) =>
    html.tag('div', {class: 'lyrics-entry'},
      slots.attributes,

      relations.content.slot('mode', 'lyrics')),
};
