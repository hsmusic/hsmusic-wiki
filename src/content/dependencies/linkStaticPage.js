export default {
  relations: (relation, staticPage) =>
    ({link: relation('linkThing', 'localized.staticPage', staticPage)}),

  generate: (relations) => relations.link,
};
