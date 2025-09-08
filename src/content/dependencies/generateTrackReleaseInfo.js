export default {
  contentDependencies: [
    'generateReleaseInfoContributionsLine',
    'generateReleaseInfoListenLine',
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

    return relations;
  },

  data(track) {
    const data = {};

    data.name = track.name;
    data.date = track.date;
    data.duration = track.duration;

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
            relations.artistContributionsLine.slots({
              stringKey: capsule + '.by',
              featuringStringKey: capsule + '.by.featuring',
              chronologyKind: 'track',
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
