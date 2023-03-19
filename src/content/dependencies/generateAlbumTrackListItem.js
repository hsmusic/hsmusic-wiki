import {compareArrays} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateContributionLinks',
    'linkTrack',
  ],

  extraDependencies: [
    'getLinkThemeString',
    'html',
    'language',
  ],

  relations(relation, track) {
    const relations = {};

    relations.contributionLinks =
      relation('generateContributionLinks', track.artistContribs, {
        showContribution: false,
        showIcons: false,
      });

    relations.trackLink =
      relation('linkTrack', track);

    return relations;
  },

  data(track) {
    const data = {};

    data.color = track.color;
    data.duration = track.duration ?? 0;

    data.showArtists =
      !compareArrays(
        track.artistContribs.map(c => c.who),
        track.album.artistContribs.map(c => c.who),
        {checkOrder: false});
  },

  generate(data, relations, {
    getLinkThemeString,
    html,
    language,
  }) {
    const stringOpts = {
      duration: language.formatDuration(data.duration),
      track: relations.trackLink,
    };

    return html.tag('li',
      {style: getLinkThemeString(data.color)},
      (!data.showArtists
        ? language.$('trackList.item.withDuration', stringOpts)
        : language.$('trackList.item.withDuration.withArtists', {
            ...stringOpts,
            by:
              html.tag('span', {class: 'by'},
                language.$('trackList.item.withArtists.by', {
                  artists: relations.contributionLinks,
                })),
          })));
  },
};
