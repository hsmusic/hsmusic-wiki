export default {
  relations: (relation, contributions, formatText) => ({
    credit:
      relation('generateArtistCredit', contributions, [], formatText),
  }),

  slots: {
    stringKey: {type: 'string'},
    featuringStringKey: {type: 'string'},

    additionalStringOptions: {validate: v => v.isObject},

    chronologyKind: {type: 'string'},
  },

  generate: (relations, slots) =>
    relations.credit.slots({
      showAnnotation: true,
      showExternalLinks: true,
      showChronology: true,
      showWikiEdits: true,

      trimAnnotation: false,

      chronologyKind: slots.chronologyKind,

      normalStringKey: slots.stringKey,
      normalFeaturingStringKey: slots.featuringStringKey,
      additionalStringOptions: slots.additionalStringOptions,
    }),
};
