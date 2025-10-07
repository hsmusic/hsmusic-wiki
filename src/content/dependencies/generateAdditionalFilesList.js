export default {
  relations: (relation, additionalFiles) => ({
    chunks:
      additionalFiles
        .map(file => relation('generateAdditionalFilesListChunk', file)),
  }),

  slots: {
    showFileSizes: {type: 'boolean', default: true},
  },

  generate: (relations, slots, {html}) =>
    html.tag('ul', {class: 'additional-files-list'},
      {[html.onlyIfContent]: true},

      relations.chunks.map(chunk => chunk.slots({
        showFileSizes: slots.showFileSizes,
      }))),
};
