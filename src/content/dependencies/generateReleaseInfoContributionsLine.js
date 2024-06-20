export default {
  contentDependencies: ['generateArtistCredit'],
  extraDependencies: ['html'],

  relations: (relation, contributions) => ({
    credit:
      relation('generateArtistCredit', contributions, []),
  }),

  slots: {
    stringKey: {type: 'string'},
    featuringStringKey: {type: 'string'},

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
    }),
};
