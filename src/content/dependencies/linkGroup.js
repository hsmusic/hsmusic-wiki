export default {
  contentDependencies: ['linkThing'],

  relations: (relation, group) =>
    ({link: relation('linkThing', 'localized.groupInfo', group)}),

  generate: (relations) => relations.link,
};
