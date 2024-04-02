export default {
  contentDependencies: [
    'generateAdditionalFilesList',
    'linkAlbumAdditionalFile',
  ],

  extraDependencies: ['getSizeOfAdditionalFile', 'html', 'urls'],

  data: (album, additionalFiles) => ({
    albumDirectory: album.directory,

    fileLocations:
      additionalFiles.flatMap(({files}) => files),
  }),

  relations: (relation, album, additionalFiles) => ({
    additionalFilesList:
      relation('generateAdditionalFilesList', additionalFiles),

    additionalFileLinks:
      Object.fromEntries(
        additionalFiles
          .flatMap(({files}) => files)
          .map(file => [
            file,
            relation('linkAlbumAdditionalFile', album, file),
          ])),
  }),

  slots: {
    showFileSizes: {type: 'boolean', default: true},
  },

  generate: (data, relations, slots, {getSizeOfAdditionalFile, urls}) =>
    relations.additionalFilesList.slots({
      fileLinks: relations.additionalFileLinks,
      fileSizes:
        Object.fromEntries(data.fileLocations.map(file => [
          file,
          (slots.showFileSizes
            ? getSizeOfAdditionalFile(
                urls
                  .from('media.root')
                  .to('media.albumAdditionalFile', data.albumDirectory, file))
            : 0),
        ])),
    }),
};
