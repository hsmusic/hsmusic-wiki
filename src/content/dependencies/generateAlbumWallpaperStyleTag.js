export default {
  relations: (relation, album) => ({
    wallpaperStyleTag:
      (album.hasWallpaperArt
        ? relation('generateWallpaperStyleTag')
        : null),
  }),

  data: (album) => ({
    wallpaperBrightness:
      album.wallpaperBrightness,

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
    (relations.wallpaperStyleTag
      ? relations.wallpaperStyleTag.slots({
          wallpaperBrightness: data.wallpaperBrightness,
          singleWallpaperPath: data.singleWallpaperPath,
          singleWallpaperStyle: data.singleWallpaperStyle,
          wallpaperPartPaths: data.wallpaperPartPaths,
          wallpaperPartStyles: data.wallpaperPartStyles,
        })
      : html.blank()),
};
