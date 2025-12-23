export default {
  sprawl: ({wikiInfo}) => ({wikiInfo}),

  relations: (relation) => ({
    wallpaperStyleTag:
      relation('generateWallpaperStyleTag'),
  }),

  data: ({wikiInfo}) => ({
    wallpaperBrightness:
      wikiInfo.wikiWallpaperBrightness,

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
      wallpaperBrightness: data.wallpaperBrightness,
      singleWallpaperPath: data.singleWallpaperPath,
      singleWallpaperStyle: data.singleWallpaperStyle,
      wallpaperPartPaths: data.wallpaperPartPaths,
      wallpaperPartStyles: data.wallpaperPartStyles,
    }),
};
