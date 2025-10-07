export default {
  relations: (relation, spec) =>
    ({page: relation('listAllAdditionalFilesTemplate', spec, 'sheetMusicFiles')}),

  generate: (relations) =>
    relations.page.slot('stringsKey', 'other.allSheetMusic'),
};
