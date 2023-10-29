export default {
  contentDependencies: ['linkThing'],
  extraDependencies: ['html'],

  relations: (relation, flashAct) =>
    ({link: relation('linkThing', 'localized.flashActGallery', flashAct)}),

  data: (flashAct) =>
    ({name: flashAct.name}),

  generate: (data, relations, {html}) =>
    relations.link
      .slot('content', new html.Tag(null, null, data.name)),
};
