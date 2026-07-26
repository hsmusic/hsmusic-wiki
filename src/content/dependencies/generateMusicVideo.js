export default {
  relations: (relation, musicVideo, thing) => ({
    image:
      relation('image', {
        path: musicVideo.path,
        artTags: [],
        dimensions: musicVideo.coverArtDimensions,
      }),

    artistsLine:
      relation('generateMusicVideoArtistsLine', musicVideo),

    dateLine:
      relation('generateMusicVideoDateLine', musicVideo, thing),

    musicVideoContributors:
      relation('generateMusicVideoContributors', musicVideo),

    contributorCredit:
      relation('generateArtistCredit', musicVideo.contributorContribs, []),

    watchLinks:
      musicVideo.urls
        .map(entry => relation('linkExternal', entry)),
  }),

  data: (musicVideo, _thing) => ({
    title:
      musicVideo.title,

    label:
      musicVideo.label,

    primaryURL:
      musicVideo.url,
  }),

  generate: (data, relations, {language, html}) =>
    language.encapsulate('misc.musicVideo', capsule =>
      html.tag('div', {class: 'music-video'}, [
        data.title &&
        data.label &&
          html.tag('p', {class: 'music-video-label'},
            {class: 'beside-title-style'},
            language.$(capsule, 'label.customLabel.besideTitle', {
              label: data.label,
            })),

        html.tag('p', {class: 'music-video-label'},
          data.title &&
            {class: 'title-style'},

          language.encapsulate(capsule, 'label', workingCapsule => {
            const workingOptions = {};

            if (data.title) {
              workingCapsule += '.customLabel.title';
              workingOptions.title = data.title;
            } else if (data.label) {
              workingCapsule += '.customLabel';
              workingOptions.label = data.label;
            }

            return language.$(workingCapsule, workingOptions);
          })),

        relations.image.slots({
          link: data.primaryURL,
        }),

        html.tag('p',
          {[html.onlyIfContent]: true},

          html.tag('span', {class: 'watch-line'},
            language.$(capsule, 'watchOn', {
              [language.onlyIfOptions]: ['links'],

              links:
                language.formatUnitList(relations.watchLinks),
            }))),

        html.tag('p',
          {[html.onlyIfContent]: true},
          {[html.joinChildren]: html.tag('br')},

          [
            html.tag('span', {class: 'artists-line'},
              {[html.onlyIfContent]: true},

              relations.artistsLine),

            relations.dateLine,
          ]),

        relations.musicVideoContributors,
      ])),
};
