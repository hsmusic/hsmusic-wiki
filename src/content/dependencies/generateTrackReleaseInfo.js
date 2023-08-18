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

  generate(data, relations, {html, language}) {
    return html.tags([
      html.tag('p', {
        [html.onlyIfContent]: true,
        [html.joinChildren]: html.tag('br'),
      }, [
        relations.artistContributionLinks
          .slots({stringKey: 'releaseInfo.by'}),

        relations.coverArtistContributionsLine
          ?.slots({stringKey: 'releaseInfo.coverArtBy'}),

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
            duration: language.formatDuration(data.duration),
          }),
      ]),

      html.tag('p',
        (relations.externalLinks
          ? language.$('releaseInfo.listenOn', {
              links: language.formatDisjunctionList(relations.externalLinks),
            })
          : language.$('releaseInfo.listenOn.noLinks', {
              name: html.tag('i', data.name),
            }))),
    ]);
  },
};
