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

    relations.externalLinks =
      album.urls.map(url =>
        relation('linkExternal', url));

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

    const durationTerms =
      album.tracks
        .map(track => track.duration)
        .filter(value => value > 0);

    if (empty(durationTerms)) {
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
        html.tag('p',
          {[html.onlyIfContent]: true},
          {[html.joinChildren]: html.tag('br')},

          [
            relations.artistContributionsLine
              .slots({stringKey: capsule + '.by'}),

            relations.coverArtistContributionsLine
              .slots({stringKey: capsule + '.coverArtBy'}),

            relations.wallpaperArtistContributionsLine
              .slots({stringKey: capsule + '.wallpaperArtBy'}),

            relations.bannerArtistContributionsLine
              .slots({stringKey: capsule + '.bannerArtBy'}),

            language.$(capsule, 'released', {
              [language.onlyIfOptions]: ['date'],
              date: language.formatDate(data.date),
            }),

            language.$(capsule, 'artReleased', {
              [language.onlyIfOptions]: ['date'],
              date: language.formatDate(data.coverArtDate),
            }),

            language.$(capsule, 'duration', {
              [language.onlyIfOptions]: ['duration'],
              duration:
                language.formatDuration(data.duration, {
                  approximate: data.durationApproximate,
                }),
            }),
          ]),

        html.tag('p',
          {[html.onlyIfContent]: true},

          language.$(capsule, 'listenOn', {
            [language.onlyIfOptions]: ['links'],

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
      ])),
};
