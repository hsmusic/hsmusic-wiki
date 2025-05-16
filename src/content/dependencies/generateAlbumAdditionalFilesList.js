import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAdditionalFilesList',
    'generateAdditionalFilesListChunk',
    'generateAdditionalFilesListChunkItem',
    'linkAdditionalFile',
    'transformContent',
  ],

  extraDependencies: ['getSizeOfMediaFile', 'html', 'urls'],

  relations: (relation, album, additionalFiles) => ({
    list:
      relation('generateAdditionalFilesList', additionalFiles),

    chunks:
      additionalFiles
        .map(() => relation('generateAdditionalFilesListChunk')),

    chunkDescriptions:
      additionalFiles
        .map(file => relation('transformContent', file.description)),

    chunkItems:
      additionalFiles
        .map(file => file.paths
          .map(() => relation('generateAdditionalFilesListChunkItem'))),

    chunkItemFileLinks:
      additionalFiles
        .map(file => file.filenames
          .map(filename => relation('linkAdditionalFile', file, filename))),
  }),

  data: (album, additionalFiles) => ({
    albumDirectory: album.directory,

    chunkTitles:
      additionalFiles
        .map(file => file.title),

    chunkItemPaths:
      additionalFiles
        .map(file => file.paths),
  }),

  slots: {
    showFileSizes: {type: 'boolean', default: true},
  },

  generate: (data, relations, slots, {getSizeOfMediaFile, urls}) =>
    relations.list.slots({
      chunks:
        stitchArrays({
          chunk: relations.chunks,
          description: relations.chunkDescriptions,
          title: data.chunkTitles,
        }).map(({chunk, title, description}) =>
            chunk.slots({
              title,
              description:
                (description
                  ? description.slot('mode', 'inline')
                  : null),
            })),

      chunkItems:
        stitchArrays({
          items: relations.chunkItems,
          fileLinks: relations.chunkItemFileLinks,
          paths: data.chunkItemPaths,
        }).map(({items, fileLinks, paths}) =>
            stitchArrays({
              item: items,
              fileLink: fileLinks,
              path: paths,
            }).map(({item, fileLink, path}) =>
                item.slots({
                  fileLink: fileLink,
                  fileSize:
                    (slots.showFileSizes
                      ? getSizeOfMediaFile(
                          urls
                            .from('media.root')
                            .to(...path))
                      : 0),
                }))),
    }),
};
