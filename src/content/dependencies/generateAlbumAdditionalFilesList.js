import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAdditionalFilesList',
    'generateAdditionalFilesListChunk',
    'generateAdditionalFilesListChunkItem',
    'linkAlbumAdditionalFile',
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
        .map(({description}) =>
          relation('transformContent', description)),

    chunkItems:
      additionalFiles
        .map(({filenames}) => filenames
          .map(() => relation('generateAdditionalFilesListChunkItem'))),

    chunkItemFileLinks:
      additionalFiles
        .map(({filenames}) => filenames
          .map(filename => relation('linkAlbumAdditionalFile', album, filename))),
  }),

  data: (album, additionalFiles) => ({
    albumDirectory: album.directory,

    chunkTitles:
      additionalFiles
        .map(({title}) => title),

    chunkItemFilenames:
      additionalFiles
        .map(({filenames}) => filenames),
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
          filenames: data.chunkItemFilenames,
        }).map(({items, fileLinks, filenames}) =>
            stitchArrays({
              item: items,
              fileLink: fileLinks,
              filename: filenames,
            }).map(({item, fileLink, filename}) =>
                item.slots({
                  fileLink: fileLink,
                  fileSize:
                    (slots.showFileSizes
                      ? getSizeOfMediaFile(
                          urls
                            .from('media.root')
                            .to('media.albumAdditionalFile', data.albumDirectory, filename))
                      : 0),
                }))),
    }),
};
