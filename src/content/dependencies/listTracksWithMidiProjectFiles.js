export default {
  contentDependencies: ['listTracksWithExtra'],

  relations: (relation, spec) =>
    ({page: relation('listTracksWithExtra', spec, 'midiProjectFiles', 'array')}),

  generate: (relations) =>
    relations.page.slot('hash', 'midi-project-files'),
};
