export default {
  contentDependencies: [
    'generateAdditionalFilesList',
    'linkAlbumAdditionalFile',
  ],

  extraDependencies: [
    'getSizeOfAdditionalFile',
    'urls',
  ],

  data(album, additionalFiles, {fileSize = true} = {}) {
    return {
      albumDirectory: album.directory,
      fileLocations: additionalFiles.flatMap(({files}) => files),
      showFileSizes: fileSize,
    };
  },

  relations(relation, album, additionalFiles, {fileSize = true} = {}) {
    return {
      additionalFilesList:
        relation('generateAdditionalFilesList', additionalFiles, {
          fileSize,
        }),

      additionalFileLinks:
        Object.fromEntries(
          additionalFiles
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
