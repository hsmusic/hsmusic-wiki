import {empty} from '../../util/sugar.js';

export default {
  extraDependencies: [
    'to',
  ],

  data: function(album) {
    const data = {};

    data.hasWallpaper = !empty(album.wallpaperArtistContribs);
    data.hasBanner = !empty(album.bannerArtistContribs);

    if (data.hasWallpaper) {
      data.hasWallpaperStyle = !!album.wallpaperStyle;
      data.wallpaperPath = ['media.albumWallpaper', album.directory, album.wallpaperFileExtension];
      data.wallpaperStyle = album.wallpaperStyle;
    }

    if (data.hasBanner) {
      data.hasBannerStyle = !!album.bannerStyle;
      data.bannerStyle = album.bannerStyle;
    }

    return data;
  },

  generate(data, {to}) {
    const wallpaperPart =
      (data.hasWallpaper
        ? [
            `body::before {`,
            `    background-image: url("${to(...data.wallpaperPath)}");`,
            ...(data.hasWallpaperStyle
              ? data.wallpaperStyle
                  .split('\n')
                  .map(line => `    ${line}`)
              : []),
            `}`,
          ]
        : []);

    const bannerPart =
      (data.hasBannerStyle
        ? [
            `#banner img {`,
            ...data.bannerStyle
              .split('\n')
              .map(line => `    ${line}`),
            `}`,
          ]
        : []);

    return [
      ...wallpaperPart,
      ...bannerPart,
    ]
      .filter(Boolean)
      .join('\n');
  },
};
