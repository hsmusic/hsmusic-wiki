export default {
  relations: (relation, musicVideo, thing) => ({
    image:
      relation('image', {
        path: musicVideo.path,
        artTags: [],
        dimensions: musicVideo.coverArtDimensions,
      }),

    releaseLine:
      relation('generateMusicVideoReleaseLine', musicVideo, thing),

    contributorCredit:
      relation('generateArtistCredit', musicVideo.contributorContribs, []),
  }),

  data: (musicVideo, _track) => ({
    label:
      musicVideo.label,

    url:
      musicVideo.url,
  }),

  generate: (data, relations, {language, html}) =>
    language.encapsulate('misc.musicVideo', capsule =>
      html.tag('div', {class: 'music-video'}, [
        html.tag('p', {class: 'music-video-label'},
          language.encapsulate(capsule, 'label', workingCapsule => {
            const workingOptions = {};

            if (data.label) {
              workingCapsule += '.customLabel';
              workingOptions.label = data.label;
            }

            return language.$(workingCapsule, workingOptions);
          })),

        relations.image.slots({
          link: data.url,
        }),

        html.tag('p', {class: 'music-video-credits'},
          {[html.joinChildren]: html.tag('br')},

          [
            html.tag('span', {class: 'release-line'},
              {[html.onlyIfContent]: true},

              relations.releaseLine),

            language.encapsulate(capsule, 'contributorsLine', capsule =>
              language.$(capsule, {
                [language.onlyIfOptions]: ['credit'],

                credit:
                  relations.contributorCredit.slots({
                    normalStringKey: language.encapsulate(capsule, 'credit'),

                    showAnnotation: true,
                    showChronology: true,
                    chunkwrap: false,

                    chronologyKind: 'musicVideoContribution',
                  }),
              })),
          ]),
      ])),
};
