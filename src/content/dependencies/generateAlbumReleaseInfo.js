export default {
  relations: (relation, album) => ({
    block:
      relation('generateReleaseInfoBlock'),

    artistContributionsLine:
      relation('generateReleaseInfoContributionsLine', album.artistContribs),

    trackArtistContributionsLine:
      relation('generateReleaseInfoContributionsLine', album.trackArtistContribs),

    listenLineOrList:
      relation('generateListenLineOrList', album),
  }),

  data(album) {
    const data = {};

    data.albumStyle = album.style;

    data.date = album.date;
    data.dateStyle = album.dateStyle;

    if (album.coverArtDate && +album.coverArtDate !== +album.date) {
      data.coverArtDate = album.coverArtDate;
    }

    data.duration = album.duration;
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

          data.albumStyle === 'in-game vgm' &&
            relations.trackArtistContributionsLine.slots({
              stringKey: capsule + '.musicBy',
              featuringStringKey: capsule + '.musicBy.featuring',
              chronologyKind: null,
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

          data.duration.any &&
            language.$(capsule, 'duration', {
              duration:
                language.formatDuration(data.duration, {
                  showApproximate: true,
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
