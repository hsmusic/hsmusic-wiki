export default {
  relations: (relation, musicVideo) => ({
    image:
      relation('image', {
        path: musicVideo.path,
        artTags: [],
        dimensions: musicVideo.coverArtDimensions,
      }),

    artistCredit:
      relation('generateArtistCredit', musicVideo.artistContribs, []),

    contributorCredit:
      relation('generateArtistCredit', musicVideo.contributorContribs, []),
  }),

  data: (musicVideo) => ({
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
            language.encapsulate(capsule, 'by', workingCapsule => {
              const additionalStringOptions = {};

              if (data.label) {
                workingCapsule += '.customLabel';
                additionalStringOptions.label = data.label;
              }

              return relations.artistCredit.slots({
                normalStringKey: workingCapsule,
                additionalStringOptions,

                showAnnotation: true,
                showChronology: true,

                chronologyKind: 'musicVideo',
              });
            }),

            relations.contributorCredit.slots({
              normalStringKey: language.encapsulate(capsule, 'contributors'),

              showAnnotation: true,
              showChronology: true,

              chronologyKind: 'musicVideoContribution',
            }),
          ]),
      ])),
};
