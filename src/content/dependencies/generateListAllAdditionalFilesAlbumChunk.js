export default {
  relations: (relation, _album, additionalFiles) => ({
    chunk:
      relation('generateListAllAdditionalFilesChunk', additionalFiles),
  }),

  slots: {
    stringsKey: {type: 'string'},
  },

  generate: (relations, slots, {language}) =>
    language.encapsulate('listingPage', slots.stringsKey, pageCapsule =>
      relations.chunk.slots({
        title:
          language.$(pageCapsule, 'albumFiles'),

        stringsKey: slots.stringsKey,
      })),
};
