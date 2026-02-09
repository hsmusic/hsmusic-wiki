export default {
  relations: (relation, flashAct) =>
    ({link: relation('linkThing', 'localized.flashActGallery', flashAct)}),

  generate: (relations) => relations.link,
};
