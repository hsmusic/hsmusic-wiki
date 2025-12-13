export default {
  relations: (relation, adventure) =>
    ({link: relation('linkThing', 'localized.adventureInfo', adventure)}),

  generate: (relations) => relations.link,
};