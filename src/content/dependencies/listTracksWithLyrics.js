export default {
  contentDependencies: ['listTracksWithExtra'],

  relations: (relation, spec) =>
    ({page: relation('listTracksWithExtra', spec, 'lyrics', 'truthy')}),

  generate: (relations) =>
    relations.page,
};
