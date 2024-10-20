export default {
  contentDependencies: ['generateUnsafeMunchy', 'linkThing'],

  relations: (relation, flashAct) => ({
    unsafeMunchy:
      relation('generateUnsafeMunchy'),

    link:
      relation('linkThing', 'localized.flashActGallery', flashAct),
  }),

  data: (flashAct) => ({
    name: flashAct.name,
  }),

  generate: (data, relations) =>
    relations.link.slots({
      content:
        relations.unsafeMunchy
          .slot('contentSource', data.name),
    }),
};
