export default {
  relations: (relation, musicVideo, thing) => ({
    image:
      relation('image', {
        path: musicVideo.path,
        artTags: [],
        dimensions: musicVideo.coverArtDimensions,
      }),

    datetimestamp:
      relation('generateAbsoluteDatetimestamp', musicVideo.date, thing.date),

    artistCredit:
      relation('generateArtistCredit', musicVideo.artistContribs, []),

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
            language.encapsulate(capsule, 'by', workingCapsule => {
              const workingOptions = {};

              if (data.label) {
                workingCapsule += '.customLabel';
                workingOptions.label = data.label;
              }

              const {datetimestamp} = relations;

              datetimestamp.setSlot('style', 'year-difference');

              if (!html.isBlank(datetimestamp)) {
                workingCapsule += '.withDate';
                workingOptions.date = datetimestamp;
              }

              return relations.artistCredit.slots({
                normalStringKey: workingCapsule,
                additionalStringOptions: workingOptions,

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
