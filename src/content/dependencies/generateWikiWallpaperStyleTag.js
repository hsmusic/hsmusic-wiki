export default {
  contentDependencies: ['generateWallpaperStyleTag'],
  extraDependencies: ['wikiData'],

  sprawl: ({wikiInfo}) => ({
    wikiWallpaperFileExtension: wikiInfo.wikiWallpaperFileExtension,
  }),

  relations: (relation) => ({
    wallpaperStyleTag:
      relation('generateWallpaperStyleTag'),
  }),

  data: (sprawl) => ({
    path: [
      'media.path',
      'bg.' + sprawl.wikiWallpaperFileExtension,
    ],
  }),

  generate: (data, relations) =>
    relations.wallpaperStyleTag.slots({
      singleWallpaperPath: data.path,
    }),
};
