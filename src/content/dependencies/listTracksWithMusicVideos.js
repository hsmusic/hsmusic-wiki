export default {
  relations: (relation, spec) =>
    ({page: relation('listTracksWithExtra', spec, 'musicVideos', 'array')}),

  generate: (relations) =>
    relations.page,
};
