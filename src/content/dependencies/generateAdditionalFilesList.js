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
    html.tag('dl',
      stitchArrays({
        chunk: slots.chunks,
        items: slots.chunkItems,
      }).map(({chunk, items}) =>
          chunk.clone()
            .slot('items', items))),
};
