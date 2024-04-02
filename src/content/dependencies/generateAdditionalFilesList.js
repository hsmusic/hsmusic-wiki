import {stitchArrays} from '#sugar';

export default {
  extraDependencies: ['html'],

  slots: {
    chunks: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    chunkItems: {
      validate: v => v.strictArrayOf(v.isHTML),
    },
  },

  generate: (slots, {html}) =>
    html.tag('ul', {class: 'additional-files-list'},
      stitchArrays({
        chunk: slots.chunks,
        items: slots.chunkItems,
      }).map(({chunk, items}) =>
          chunk.clone()
            .slot('items', items))),
};
