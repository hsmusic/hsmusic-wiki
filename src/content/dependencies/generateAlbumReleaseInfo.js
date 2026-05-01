import {accumulateSum, empty} from '#sugar';

export default {
  relations: (relation, album) => ({
    block:
      relation('generateReleaseInfoBlock'),

    artistContributionsLine:
      relation('generateReleaseInfoContributionsLine', album.artistContribs),

    listenLineOrList:
      relation('generateListenLineOrList', album),
  }),

  data(album) {
    const data = {};

    if (album.date) {
      data.date = album.date;
    }

    if (album.coverArtDate && +album.coverArtDate !== +album.date) {
      data.coverArtDate = album.coverArtDate;
    }

    const durationTerms =
      album.tracks
        .map(track => track.duration)
        .filter(value => value > 0);

    if (empty(durationTerms) || album.hideDuration) {
      data.duration = null;
      data.durationApproximate = null;
    } else {
      data.duration = accumulateSum(durationTerms);
      data.durationApproximate = album.tracks.length > 1;
    }

    data.numTracks = album.tracks.length;

    return data;
  },

  generate: (data, relations, {html, language}) =>
    language.encapsulate('releaseInfo', capsule =>
      html.tags([
        relations.block.slot('items', [
          relations.artistContributionsLine.slots({
            stringKey: capsule + '.by',
            featuringStringKey: capsule + '.by.featuring',
            chronologyKind: 'album',
          }),

          language.$(capsule, 'released', {
            [language.onlyIfOptions]: ['date'],
            date: language.formatDate(data.date),
          }),

          language.$(capsule, 'duration', {
            [language.onlyIfOptions]: ['duration'],
            duration:
              language.formatDuration(data.duration, {
                approximate: data.durationApproximate,
              }),
          }),
        ]),

        relations.listenLineOrList.slots({
          context: [
            'album',

            (data.numTracks === 0
              ? 'albumNoTracks'
           : data.numTracks === 1
              ? 'albumOneTrack'
              : 'albumMultipleTracks'),
          ],
        }),
      ])),
};
