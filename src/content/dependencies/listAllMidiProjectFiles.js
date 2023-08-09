export default {
  contentDependencies: ['listAllAdditionalFilesTemplate'],

  relations: (relation, spec) =>
    ({page: relation('listAllAdditionalFilesTemplate', spec, 'midiProjectFiles')}),

  generate: (relations) =>
    relations.page.slot('stringsKey', 'other.allMidiProjectFiles'),
};
