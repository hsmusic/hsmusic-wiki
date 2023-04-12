export default {
  contentDependencies: [
    'generateAdditionalFilesList',
    'linkAlbumAdditionalFile',
  ],

  extraDependencies: [
    'getSizeOfAdditionalFile',
    'urls',
  ],

  data(album, {fileSize = true} = {}) {
    return {
      albumDirectory: album.directory,
      fileLocations: album.additionalFiles.flatMap(({files}) => files),
      showFileSizes: fileSize,
    };
  },

  relations(relation, album, {fileSize = true} = {}) {
    return {
      additionalFilesList:
        relation('generateAdditionalFilesList', album.additionalFiles, {
          fileSize,
        }),

      additionalFileLinks:
        Object.fromEntries(
          album.additionalFiles
            .flatMap(({files}) => files)
            .map(file => [
              file,
              relation('linkAlbumAdditionalFile', album, file),
            ])),
    };
  },

  generate(data, relations, {
    getSizeOfAdditionalFile,
    urls,
  }) {
    return relations.additionalFilesList
      .slots({
        fileLinks: relations.additionalFileLinks,
        fileSizes:
          Object.fromEntries(data.fileLocations.map(file => [
            file,
            (data.showFileSizes
              ? getSizeOfAdditionalFile(
                  urls
                    .from('media.root')
                    .to('media.albumAdditionalFile', data.albumDirectory, file))
              : 0),
          ])),
      });
  },
};
