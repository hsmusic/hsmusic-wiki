export default {
  contentDependencies: ['generateWallpaperStyleTag'],
  extraDependencies: ['wikiData'],

  sprawl: ({wikiInfo}) => ({
    wikiWallpaperFileExtension: wikiInfo.wikiWallpaperFileExtension,
  }),

  relations: (relation) => ({
    wallpaperStyle:
      relation('generateWallpaperStyleTag'),
  }),

  data: (sprawl) => ({
    path: [
      'media.path',
      'bg.' + sprawl.wikiWallpaperFileExtension,
    ],
  }),

  generate: (data, relations) =>
    relations.wallpaperStyle.slots({
      singleWallpaperPath: data.path,
    }),
};
