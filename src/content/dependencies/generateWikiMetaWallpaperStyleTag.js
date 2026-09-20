export default {
  sprawl: ({wikiInfo}) => ({wikiInfo}),

  relations: (relation, {wikiInfo}) => ({
    metaWikiWallpaperStyleTag:
      (wikiInfo.hasMetaWallpaper
        ? relation('generateWallpaperStyleTag')
        : null),

    regularWikiWallpaperStyleTag:
      (wikiInfo.hasMetaWallpaper
        ? relation('generateWikiWallpaperStyleTag')
        : null),
  }),

  data: ({wikiInfo}) => ({
    hasMetaWallpaper:
      wikiInfo.hasMetaWallpaper,

    wallpaperBrightness:
      wikiInfo.metaWallpaperBrightness,

    singleWallpaperPath: [
      'media.path',
      'bg-meta.' + wikiInfo.metaWallpaperFileExtension,
    ],

    singleWallpaperStyle:
      wikiInfo.metaWallpaperStyle,

    wallpaperPartPaths:
      wikiInfo.metaWallpaperParts.map(part =>
        (part.asset
          ? ['media.path', part.asset]
          : null)),

    wallpaperPartStyles:
      wikiInfo.metaWallpaperParts.map(part => part.style),
  }),

  generate(data, relations) {
    if (!data.hasMetaWallpaper) {
      return relations.regularWikiWallpaperStyleTag;
    }

    return relations.metaWikiWallpaperStyleTag.slots({
      wallpaperBrightness: data.wallpaperBrightness,
      singleWallpaperPath: data.singleWallpaperPath,
      singleWallpaperStyle: data.singleWallpaperStyle,
      wallpaperPartPaths: data.wallpaperPartPaths,
      wallpaperPartStyles: data.wallpaperPartStyles,
    });
  },
};
