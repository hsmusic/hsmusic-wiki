export default {
  contentDependencies: ['listTracksWithExtra'],

  relations: (relation, spec) =>
    ({page: relation('listTracksWithExtra', spec, 'sheetMusicFiles', 'array')}),

  generate: (relations) =>
    relations.page.slot('hash', 'sheet-music-files'),
};
