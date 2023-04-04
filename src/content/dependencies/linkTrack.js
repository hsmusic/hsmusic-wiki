export default {
  contentDependencies: ['linkThing'],

  relations: (relation, track) =>
    ({link: relation('linkThing', 'localized.track', track)}),

  generate: (relations) => relations.link,
};
