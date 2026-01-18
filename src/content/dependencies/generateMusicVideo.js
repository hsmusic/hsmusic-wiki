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

    contributorCredit:
      relation('generateArtistCredit', musicVideo.contributorContribs, []),
  }),

  data: (musicVideo, _thing) => ({
    label:
      musicVideo.label,

    labelStyle:
      musicVideo.labelStyle,

    url:
      musicVideo.url,
  }),

  generate: (data, relations, {language, html}) =>
    language.encapsulate('misc.musicVideo', capsule =>
      html.tag('div', {class: 'music-video'}, [
        html.tag('p', {class: 'music-video-label'},
          data.labelStyle !== 'label' &&
            {class: data.labelStyle + '-style'},

          language.encapsulate(capsule, 'label', workingCapsule => {
            const workingOptions = {};

            if (data.label) {
              workingCapsule += '.customLabel';

              if (data.labelStyle === 'title') {
                workingCapsule += '.title';
                workingOptions.title = data.label;
              } else {
                workingOptions.label = data.label;
              }
            }

            return language.$(workingCapsule, workingOptions);
          })),

        relations.image.slots({
          link: data.url,
        }),

        html.tag('p',
          {[html.joinChildren]: html.tag('br')},

          [
            html.tag('span', {class: 'artists-line'},
              {[html.onlyIfContent]: true},

              relations.artistsLine),

            relations.dateLine,
          ]),

        html.tag('p',
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
            }))),
      ])),
};
