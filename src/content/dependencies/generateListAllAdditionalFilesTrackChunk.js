export default {
  relations: (relation, track, additionalFiles) => ({
    trackLink:
      relation('linkTrack', track),

    chunk:
      relation('generateListAllAdditionalFilesChunk', additionalFiles),
  }),

  slots: {
    stringsKey: {type: 'string'},
  },

  generate: (relations, slots) =>
    relations.chunk.slots({
      title: relations.trackLink,
      stringsKey: slots.stringsKey,
    }),
};

