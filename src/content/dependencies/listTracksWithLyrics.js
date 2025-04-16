export default {
  contentDependencies: ['listTracksWithExtra'],

  relations: (relation, spec) =>
    ({page: relation('listTracksWithExtra', spec, 'lyrics', 'array')}),

  generate: (relations) =>
    relations.page,
};
