export default {
  contentDependencies: ['generateContentHeading'],
  extraDependencies: ['html', 'language'],

  relations: (relation) => ({
    contentHeading:
      relation('generateContentHeading'),
  }),

  slots: {
    year: {type: 'number'},
  },

  generate: (relations, slots, {language}) =>
    language.encapsulate('groupInfoPage.albumList.yearChunk.title', titleCapsule =>
      relations.contentHeading.slots({
        tag: 'h3',

        title:
          language.$(titleCapsule, {
            year: slots.year,
          }),

        stickyTitle:
          language.$(titleCapsule, 'sticky', {
            year: slots.year,
          }),
      })),
}
