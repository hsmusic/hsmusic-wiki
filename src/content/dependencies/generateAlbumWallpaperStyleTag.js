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
      (album.wallpaperArtwork
        ? album.wallpaperArtwork.path
        : null),

    singleWallpaperStyle:
      album.wallpaperStyle,

    wallpaperPartPaths:
      album.wallpaperParts.map(part =>
        (part.asset
          ? album.getWallpaperPartPath(part)
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
