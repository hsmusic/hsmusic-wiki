export default {
  extraDependencies: ['html'],

  slots: {
    groupInfo: {type: 'html'},
    chunks: {type: 'html'},
  },

  generate(slots, {html}) {
    return (
      html.tag('dl', [
        slots.groupInfo,
        slots.chunks,
      ]));
  },
};
