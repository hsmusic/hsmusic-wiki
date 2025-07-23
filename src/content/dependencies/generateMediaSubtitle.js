export default {
  contentDependencies: ['linkMedium'],
  extraDependencies: ['html', 'language'],

  relations: (relation, thing) => ({
    mediumLinks:
      thing.representedMedia
        .map(medium => relation('linkMedium', medium)),
  }),

  slots: {
    pageCapsule: {type: 'string'},
  },

  generate: (relations, slots, {language}) =>
    language.$(slots.pageCapsule, 'subtitle.media', {
      [language.onlyIfOptions]: ['media'],

      media:
        language.formatUnitList(
          relations.mediumLinks.map(link => link
            .slots({
              trimType: true,
            }))),
    }),
}
