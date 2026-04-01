import {basename} from 'node:path';

import {empty} from '#sugar';

export default {
  relations: (relation, album) => ({
    wallpaperArtistContributionsLine:
      (album.wallpaperArtwork
        ? relation('generateReleaseInfoContributionsLine',
            album.wallpaperArtwork.artistContribs)
        : null),

    bannerArtistContributionsLine:
      (album.bannerArtwork
        ? relation('generateReleaseInfoContributionsLine',
            album.bannerArtwork.artistContribs)
        : null),

    linkTemplate:
      relation('linkTemplate'),
  }),

  data: (album) => ({
    wallpaperImagePath:
      (album.wallpaperArtwork && empty(album.wallpaperParts)
        ? album.wallpaperArtwork.path
        : null),

    wallpaperPartPaths:
      album.wallpaperParts
        .filter(part => part.asset)
        .map(part => ['media.albumWallpaperPart', album.directory, part.asset]),

    bannerImagePath:
      (album.bannerArtwork
        ? album.bannerArtwork.path
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('div', {class: 'album-art-info'},
      {[html.onlyIfContent]: true},
      {[html.joinChildren]: html.tag('hr', {class: 'cute'})},

      [
        language.encapsulate('releaseInfo', capsule =>
          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            [
              relations.wallpaperArtistContributionsLine?.slots({
                stringKey: capsule + '.wallpaperArtBy',
                chronologyKind: 'wallpaperArt',
              }),

              relations.bannerArtistContributionsLine?.slots({
                stringKey: capsule + '.bannerArtBy',
                chronologyKind: 'bannerArt',
              }),
            ])),

        language.encapsulate('misc.downloadLayoutMedia', downloadCapsule =>
          html.tag('p',
            {[html.onlyIfContent]: true},
            {[html.joinChildren]: html.tag('br')},

            [
              language.encapsulate(downloadCapsule, workingCapsule => {
                const workingOptions = {};

                let any = false;

                if (data.wallpaperImagePath) {
                  any = true;
                  workingCapsule += '.withWallpaper';
                  workingOptions.wallpaper =
                    relations.linkTemplate.clone().slots({
                      path: data.wallpaperImagePath,
                      content: language.$(downloadCapsule, 'wallpaper'),
                    });
                }

                if (data.bannerImagePath) {
                  any = true;
                  workingCapsule += '.withBanner';
                  workingOptions.banner =
                    relations.linkTemplate.clone().slots({
                      path: data.bannerImagePath,
                      content: language.$(downloadCapsule, 'banner'),
                    });
                }

                if (any) {
                  return language.$(workingCapsule, workingOptions);
                } else {
                  return html.blank();
                }
              }),

              language.$(downloadCapsule, 'withWallpaperParts', {
                [language.onlyIfOptions]: ['parts'],

                parts:
                  language.formatUnitList(
                    data.wallpaperPartPaths.map(path =>
                      relations.linkTemplate.clone().slots({
                        path,
                        content: language.sanitize(basename(path.at(-1))),
                      }))),
              }),
            ])),
      ]),
};
