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

  generate(slots, {html}) {
    return (
      html.tag('dl', [
        slots.groupInfo,
        slots.chunks,
      ]));
  },
};
