import {compareArrays} from '#sugar';

export default {
  relations: (relation, track) => ({
    block:
      relation('generateReleaseInfoBlock'),

    artistContributionsLine:
      relation('generateReleaseInfoContributionsLine',
        track.artistContribs,
        track.artistTextOnOwnPage),

    listenLineOrList:
      relation('generateListenLineOrList', track),

    albumLink:
      relation('linkAlbum', track.album),
  }),

  data(track) {
    const data = {};

    data.name = track.name;
    data.date = track.date;
    data.dateStyle = track.dateStyle;
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
        relations.block.slot('items', [
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

          (data.dateStyle === 'released'
            ? language.$(capsule, 'released', {
                date: language.formatDate(data.date),
              })
         : data.dateStyle === 'posted'
            ? language.$(capsule, 'posted', {
                date: language.formatDate(data.date),
              })
            : html.blank()),

          language.$(capsule, 'duration', {
            [language.onlyIfOptions]: ['duration'],
            duration: language.formatDuration(data.duration),
          }),
        ]),

        relations.listenLineOrList.slots({
          visibleWithoutLinks: true,
          context: 'track',
        }),
      ])),
};
