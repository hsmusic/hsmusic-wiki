export default {
  extraDependencies: ['html'],

  slots: {
    groupInfo: {
      type: 'html',
      mutable: false,
    },

    chunks: {
      type: 'html',
      mutable: false,
    },
  },

  generate: (slots, {html}) =>
    html.tag('dl',
      {[html.onlyIfContent]: true},
      [slots.groupInfo, slots.chunks]),
};
