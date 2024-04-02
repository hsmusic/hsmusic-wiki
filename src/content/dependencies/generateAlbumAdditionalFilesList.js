import {stitchArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateAdditionalFilesList',
    'generateAdditionalFilesListChunk',
    'generateAdditionalFilesListChunkItem',
    'linkAlbumAdditionalFile',
  ],

  extraDependencies: ['getSizeOfAdditionalFile', 'html', 'urls'],

  relations: (relation, album, additionalFiles) => ({
    list:
      relation('generateAdditionalFilesList', additionalFiles),

    chunks:
      additionalFiles
        .map(() => relation('generateAdditionalFilesListChunk')),

    chunkItems:
      additionalFiles
        .map(({files}) =>
          (files ?? [])
            .map(() => relation('generateAdditionalFilesListChunkItem'))),

    chunkItemFileLinks:
      additionalFiles
        .map(({files}) =>
          (files ?? [])
            .map(file => relation('linkAlbumAdditionalFile', album, file))),
  }),

  data: (album, additionalFiles) => ({
    albumDirectory: album.directory,

    chunkTitles:
      additionalFiles
        .map(({title}) => title),

    chunkDescriptions:
      additionalFiles
        .map(({description}) => description ?? null),

    chunkItemLocations:
      additionalFiles
        .map(({files}) => files ?? []),
  }),

  slots: {
    showFileSizes: {type: 'boolean', default: true},
  },

  generate: (data, relations, slots, {getSizeOfAdditionalFile, urls}) =>
    relations.list.slots({
      chunks:
        stitchArrays({
          chunk: relations.chunks,
          title: data.chunkTitles,
          description: data.chunkDescriptions,
        }).map(({chunk, title, description}) =>
            chunk.slots({title, description})),

      chunkItems:
        stitchArrays({
          items: relations.chunkItems,
          fileLinks: relations.chunkItemFileLinks,
          locations: data.chunkItemLocations,
        }).map(({items, fileLinks, locations}) =>
            stitchArrays({
              item: items,
              fileLink: fileLinks,
              location: locations,
            }).map(({item, fileLink, location}) =>
                item.slots({
                  fileLink: fileLink,
                  fileSize:
                    (slots.showFileSizes
                      ? getSizeOfAdditionalFile(
                          urls
                            .from('media.root')
                            .to('media.albumAdditionalFile', data.albumDirectory, location))
                      : 0),
                }))),
    }),
};
