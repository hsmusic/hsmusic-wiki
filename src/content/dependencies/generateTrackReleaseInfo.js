import {compareArrays} from '#sugar';

export default {
  contentDependencies: [
    'generateReleaseInfoContributionsLine',
    'generateReleaseInfoListenLine',
    'linkAlbum',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, track) {
    const relations = {};

    relations.artistContributionsLine =
      relation('generateReleaseInfoContributionsLine',
        track.artistContribs,
        track.artistText);

    relations.listenLine =
      relation('generateReleaseInfoListenLine', track);

    relations.albumLink =
      relation('linkAlbum', track.album);

    return relations;
  },

  data(track) {
    const data = {};

    data.name = track.name;
    data.date = track.date;
    data.duration = track.duration;

    const {album} = track;

    data.showAlbum =
      album.showAlbumInTracksWithoutArtists &&
      track.artistContribs.every(({annotation}) => !annotation) &&
      compareArrays(
        track.artistContribs.map(({artist}) => artist),
        album.artistContribs.map(({artist}) => artist),
        {checkOrder: true});

    if (
      track.hasUniqueCoverArt &&
      +track.coverArtDate !== +track.date
    ) {
      data.coverArtDate = track.coverArtDate;
    }

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('releaseInfo', capsule =>
      html.tags([
        html.tag('p',
          {[html.onlyIfContent]: true},
          {[html.joinChildren]: html.tag('br')},

          [
            language.encapsulate(capsule, 'by', capsule => {
              const withAlbum =
                (data.showAlbum ? '.withAlbum' : '');

              const albumOptions =
                (data.showAlbum ? {album: relations.albumLink} : {});

              return relations.artistContributionsLine.slots({
                stringKey: capsule + withAlbum,
                featuringStringKey: capsule + '.featuring' + withAlbum,

                additionalStringOptions: albumOptions,

                chronologyKind: 'track',
              });
            }),

            language.$(capsule, 'released', {
              [language.onlyIfOptions]: ['date'],
              date: language.formatDate(data.date),
            }),

            language.$(capsule, 'duration', {
              [language.onlyIfOptions]: ['duration'],
              duration: language.formatDuration(data.duration),
            }),
          ]),

        html.tag('p',
          relations.listenLine.slots({
            visibleWithoutLinks: true,
            context: ['track'],
          })),
      ])),
};
