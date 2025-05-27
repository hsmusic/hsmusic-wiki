export default {
  contentDependencies: ['generateWallpaperStyleTag'],
  extraDependencies: ['wikiData'],

  sprawl: ({wikiInfo}) => ({wikiInfo}),

  relations: (relation) => ({
    wallpaperStyleTag:
      relation('generateWallpaperStyleTag'),
  }),

  data: ({wikiInfo}) => ({
    singleWallpaperPath: [
      'media.path',
      'bg.' + wikiInfo.wikiWallpaperFileExtension,
    ],

    singleWallpaperStyle:
      wikiInfo.wikiWallpaperStyle,

    wallpaperPartPaths:
      wikiInfo.wikiWallpaperParts.map(part =>
        (part.asset
          ? ['media.path', part.asset]
          : null)),

    wallpaperPartStyles:
      wikiInfo.wikiWallpaperParts.map(part => part.style),
  }),

  generate: (data, relations) =>
    relations.wallpaperStyleTag.slots({
      singleWallpaperPath: data.singleWallpaperPath,
      singleWallpaperStyle: data.singleWallpaperStyle,
      wallpaperPartPaths: data.wallpaperPartPaths,
      wallpaperPartStyles: data.wallpaperPartStyles,
    }),
};
