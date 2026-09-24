export default {
  relations: (relation, section) => ({
    link:
      relation('linkThing', null, section),
  }),

  data: (section) => ({
    updateDirectory:
      section.update.directory,

    sectionHash:
      section.hash,
  }),

  generate: (data, relations) =>
    relations.link.slot('path', [
      'localized.wikiUpdateSection',
      data.updateDirectory,
      data.sectionHash,
    ]),
};
