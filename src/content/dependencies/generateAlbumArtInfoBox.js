export default {
  contentDependencies: ['generateReleaseInfoContributionsLine'],
  extraDependencies: ['html', 'language'],

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
  }),

  generate: (relations, {html, language}) =>
    language.encapsulate('releaseInfo', capsule =>
      html.tag('div', {class: 'album-art-info'},
        {[html.onlyIfContent]: true},

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
          ]))),
};
