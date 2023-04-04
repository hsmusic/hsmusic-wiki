import {compareArrays} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'generateContributionLinks',
    'linkTrack',
  ],

  extraDependencies: [
    'getColors',
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

  data(track, album) {
    const data = {};

    data.color = track.color;
    data.duration = track.duration ?? 0;

    data.showArtists =
      !compareArrays(
        track.artistContribs.map(c => c.who),
        album.artistContribs.map(c => c.who),
        {checkOrder: false});

    return data;
  },

  generate(data, relations, {
    getColors,
    html,
    language,
  }) {
    const stringOpts = {
      duration: language.formatDuration(data.duration),
      track: relations.trackLink,
    };

    let style;
    if (data.color) {
      const {primary} = getColors(data.color);
      style = `--primary-color: ${primary}`;
    }

    return html.tag('li',
      {style},
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
