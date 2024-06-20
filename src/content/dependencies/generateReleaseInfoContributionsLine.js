export default {
  contentDependencies: ['generateArtistCredit'],
  extraDependencies: ['html'],

  relations: (relation, contributions) => ({
    credit:
      relation('generateArtistCredit', contributions),
  }),

  slots: {
    stringKey: {type: 'string'},
    chronologyKind: {type: 'string'},
  },

  generate: (relations, slots) =>
    relations.credit.slots({
      showAnnotation: true,
      showExternalLinks: true,
      showChronology: true,

      trimAnnotation: false,

      stringKey: slots.stringKey,

      chronologyKind: slots.chronologyKind,
    }),
};
