export default {
  relations: (relation, spec) =>
    ({page: relation('listAllAdditionalFilesTemplate', spec, 'midiProjectFiles')}),

  generate: (relations) =>
    relations.page.slot('stringsKey', 'other.allMidiProjectFiles'),
};
