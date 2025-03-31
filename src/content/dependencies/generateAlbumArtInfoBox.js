export default {
  contentDependencies: ['generateReleaseInfoContributionsLine'],
  extraDependencies: ['html', 'language'],

  relations: (relation, album) => ({
    wallpaperArtistContributionsLine:
      relation('generateReleaseInfoContributionsLine',
        album.wallpaperArtistContribs),

    bannerArtistContributionsLine:
      relation('generateReleaseInfoContributionsLine',
        album.bannerArtistContribs),
  }),

  generate: (relations, {html, language}) =>
    language.encapsulate('releaseInfo', capsule =>
      html.tag('div', {class: 'album-art-info'},
        {[html.onlyIfContent]: true},

        html.tag('p',
          {[html.onlyIfContent]: true},
          {[html.joinChildren]: html.tag('br')},

          [
            relations.wallpaperArtistContributionsLine.slots({
              stringKey: capsule + '.wallpaperArtBy',
              chronologyKind: 'wallpaperArt',
            }),

            relations.bannerArtistContributionsLine.slots({
              stringKey: capsule + '.bannerArtBy',
              chronologyKind: 'bannerArt',
            }),
          ]))),
};
