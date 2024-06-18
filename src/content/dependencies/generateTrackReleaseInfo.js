import {empty} from '#sugar';

export default {
  contentDependencies: [
    'generateReleaseInfoContributionsLine',
    'linkExternal',
  ],

  extraDependencies: ['html', 'language'],

  relations(relation, track) {
    const relations = {};

    relations.artistContributionLinks =
      relation('generateReleaseInfoContributionsLine', track.artistContribs);

    if (track.hasUniqueCoverArt) {
      relations.coverArtistContributionsLine =
        relation('generateReleaseInfoContributionsLine', track.coverArtistContribs);
    }

    if (!empty(track.urls)) {
      relations.externalLinks =
        track.urls.map(url =>
          relation('linkExternal', url));
    }

    return relations;
  },

  data(track) {
    const data = {};

    data.name = track.name;
    data.date = track.date;
    data.duration = track.duration;

    if (
      track.hasUniqueCoverArt &&
      track.coverArtDate &&
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
            relations.artistContributionLinks.slots({
              stringKey: capsule + '.by',
              chronologyKind: 'track',
            }),

            relations.coverArtistContributionsLine?.slots({
              stringKey: capsule + '.coverArtBy',
              chronologyKind: 'trackArt',
            }),

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
              duration: language.formatDuration(data.duration),
            }),
          ]),

        html.tag('p',
          language.encapsulate(capsule, 'listenOn', capsule =>
            (relations.externalLinks
              ? language.$(capsule, {
                  links:
                    language.formatDisjunctionList(
                      relations.externalLinks
                        .map(link => link.slot('context', 'track'))),
                })
              : language.$(capsule, 'noLinks', {
                  name:
                    html.tag('i', data.name),
                })))),
      ])),
};
