export default {
  relations: (relation, spec) =>
    ({page: relation('listTracksWithExtra', spec, 'needsLyrics', 'truthy')}),

  generate: (relations) =>
    relations.page,
};
