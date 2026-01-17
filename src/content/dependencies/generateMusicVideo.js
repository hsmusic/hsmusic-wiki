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

  data: (musicVideo, track) => ({
    label:
      musicVideo.label,

    url:
      musicVideo.url,

    sameDay:
      (() => {
        if (!musicVideo.dateIsSpecified) return null;

        const compare = (a, b) =>
          a.toDateString() === b.toDateString();

        if (compare(musicVideo.date, track.album.date)) {
          if (track.album.style === 'single') {
            return 'single';
          } else {
            return 'album';
          }
        }

        if (compare(musicVideo.date, track.date)) {
          return 'track';
        }

        return null;
      })(),
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

        html.tag('p', {class: 'music-video-info'},
          {[html.joinChildren]: html.tag('br')},

          [
            html.tag('span', {class: 'release-line'},
              {[html.onlyIfContent]: true},

              relations.releaseLine),

            language.encapsulate(capsule, 'date', capsule => [
              data.sameDay == 'album' &&
                language.$(capsule, 'sameDayAsAlbum'),

              data.sameDay == 'single' &&
                language.$(capsule, 'sameDayAsTrack'),

              data.sameDay === 'track' &&
                language.$(capsule, 'sameDayAsTrack'),
            ]),

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
