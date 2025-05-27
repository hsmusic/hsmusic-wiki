import {empty} from '#sugar';

export default {
  contentDependencies: ['generateAlbumWallpaperStyleTag', 'generateStyleTag'],
  extraDependencies: ['html'],

  relations: (relation, album, _track) => ({
    styleTag:
      relation('generateStyleTag'),

    wallpaperStyleTag:
      relation('generateAlbumWallpaperStyleTag', album),
  }),

  data(album, track) {
    const data = {};

    data.hasBanner = !empty(album.bannerArtistContribs);

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

  generate: (data, relations, {html}) =>
    html.tags([
      relations.wallpaperStyleTag,

      relations.styleTag.clone().slots({
        attributes: {class: 'album-banner-style'},

        rules: [
          data.hasBanner && {
            select: '#banner img',
            declare: [data.bannerStyle],
          },
        ],
      }),

      relations.styleTag.clone().slots({
        attributes: {class: 'album-directory-style'},

        rules: [
          {
            select: ':root',
            declare: [
              data.albumDirectory &&
                `--album-directory: ${data.albumDirectory};`,
              data.trackDirectory &&
                `--track-directory: ${data.trackDirectory};`,
            ],
          },
        ]
      }),
    ], {[html.joinChildren]: ''}),
};
