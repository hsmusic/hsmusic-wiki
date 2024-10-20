export default {
  extraDependencies: ['html'],

  slots: {
    contentSource: {type: 'string'},
  },

  generate: (slots, {html}) =>
    new html.Tag(null, null, slots.contentSource),
};
