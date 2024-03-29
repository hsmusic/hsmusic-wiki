import {accumulateSum, empty} from '#sugar';

export default {
  contentDependencies: [
    'generateReleaseInfoContributionsLine',
    'linkExternal',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, album) {
    const relations = {};

    relations.artistContributionsLine =
      relation('generateReleaseInfoContributionsLine', album.artistContribs);

    relations.coverArtistContributionsLine =
      relation('generateReleaseInfoContributionsLine', album.coverArtistContribs);

    relations.wallpaperArtistContributionsLine =
      relation('generateReleaseInfoContributionsLine', album.wallpaperArtistContribs);

    relations.bannerArtistContributionsLine =
      relation('generateReleaseInfoContributionsLine', album.bannerArtistContribs);

    if (!empty(album.urls)) {
      relations.externalLinks =
        album.urls.map(url =>
          relation('linkExternal', url));
    }

    return relations;
  },

  data(album) {
    const data = {};

    if (album.date) {
      data.date = album.date;
    }

    if (album.coverArtDate && +album.coverArtDate !== +album.date) {
      data.coverArtDate = album.coverArtDate;
    }

    data.duration = accumulateSum(album.tracks, track => track.duration);
    data.durationApproximate = album.tracks.length > 1;

    data.numTracks = album.tracks.length;

    return data;
  },

  generate(data, relations, {html, language}) {
    return html.tags([
      html.tag('p',
        {[html.onlyIfContent]: true},
        {[html.joinChildren]: html.tag('br')},

        [
          relations.artistContributionsLine
            .slots({stringKey: 'releaseInfo.by'}),

          relations.coverArtistContributionsLine
            .slots({stringKey: 'releaseInfo.coverArtBy'}),

          relations.wallpaperArtistContributionsLine
            .slots({stringKey: 'releaseInfo.wallpaperArtBy'}),

          relations.bannerArtistContributionsLine
            .slots({stringKey: 'releaseInfo.bannerArtBy'}),

          data.date &&
            language.$('releaseInfo.released', {
              date: language.formatDate(data.date),
            }),

          data.coverArtDate &&
            language.$('releaseInfo.artReleased', {
              date: language.formatDate(data.coverArtDate),
            }),

          data.duration &&
            language.$('releaseInfo.duration', {
              duration:
                language.formatDuration(data.duration, {
                  approximate: data.durationApproximate,
                }),
            }),
        ]),

      relations.externalLinks &&
        html.tag('p',
          language.$('releaseInfo.listenOn', {
            links:
              language.formatDisjunctionList(
                relations.externalLinks
                  .map(link =>
                    link.slot('context', [
                      'album',
                      (data.numTracks === 0
                        ? 'albumNoTracks'
                     : data.numTracks === 1
                        ? 'albumOneTrack'
                        : 'albumMultipleTracks'),
                    ]))),
          })),
    ]);
  },
};
