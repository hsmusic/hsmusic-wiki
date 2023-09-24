import {empty} from '#sugar';

export default {
  extraDependencies: ['to'],

  data(album, track) {
    const data = {};

    data.hasWallpaper = !empty(album.wallpaperArtistContribs);
    data.hasBanner = !empty(album.bannerArtistContribs);

    if (data.hasWallpaper) {
      data.wallpaperPath = ['media.albumWallpaper', album.directory, album.wallpaperFileExtension];
      data.wallpaperStyle = album.wallpaperStyle;
    }

    if (data.hasBanner) {
      data.hasBannerStyle = !!album.bannerStyle;
      data.bannerStyle = album.bannerStyle;
    }

    data.albumDirectory = album.directory;

    if (track) {
      data.trackDirectory = track.directory;
    }

    return data;
  },

  generate(data, {to}) {
    const indent = parts =>
      (parts ?? [])
        .filter(Boolean)
        .join('\n')
        .split('\n')
        .map(line => ' '.repeat(4) + line)
        .join('\n');

    const rule = (selector, parts) =>
      (!empty(parts.filter(Boolean))
        ? [`${selector} {`, indent(parts), `}`]
        : []);

    const wallpaperRule =
      data.hasWallpaper &&
        rule(`body::before`, [
          `background-image: url("${to(...data.wallpaperPath)}");`,
          data.wallpaperStyle,
        ]);

    const bannerRule =
      data.hasBanner &&
        rule(`#banner img`, [
          data.bannerStyle,
        ]);

    const dataRule =
      rule(`:root`, [
        data.albumDirectory &&
          `--album-directory: ${data.albumDirectory};`,
        data.trackDirectory &&
          `--track-directory: ${data.trackDirectory};`,
      ]);

    return (
      [...wallpaperRule, ...bannerRule, ...dataRule]
        .filter(Boolean)
        .join('\n'));
  },
};
