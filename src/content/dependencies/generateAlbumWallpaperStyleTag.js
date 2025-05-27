export default {
  contentDependencies: ['generateWallpaperStyleTag'],
  extraDependencies: ['html'],

  relations: (relation, album) => ({
    wallpaperStyle:
      (album.hasWallpaperArt
        ? relation('generateWallpaperStyleTag')
        : null),
  }),

  data: (album) => ({
    singleWallpaperPath:
      ['media.albumWallpaper', album.directory, album.wallpaperFileExtension],

    singleWallpaperStyle:
      album.wallpaperStyle,

    wallpaperPartPaths:
      album.wallpaperParts.map(part =>
        (part.asset
          ? ['media.albumWallpaperPart', album.directory, part.asset]
          : null)),

    wallpaperPartStyles:
      album.wallpaperParts.map(part => part.style),
  }),

  generate: (data, relations, {html}) =>
    (relations.wallpaperStyle
      ? relations.wallpaperStyle.slots({
          singleWallpaperPath: data.singleWallpaperPath,
          singleWallpaperStyle: data.singleWallpaperStyle,
          wallpaperPartPaths: data.wallpaperPartPaths,
          wallpaperPartStyles: data.wallpaperPartStyles,
        })
      : html.blank()),
};
