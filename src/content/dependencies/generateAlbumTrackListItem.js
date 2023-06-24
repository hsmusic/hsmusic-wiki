import {compareArrays} from '../../util/sugar.js';

export default {
  contentDependencies: [
    'linkContribution',
    'linkTrack',
  ],

  extraDependencies: ['getColors', 'html', 'language'],

  relations(relation, track) {
    const relations = {};

    relations.contributionLinks =
      track.artistContribs
        .map(contrib => relation('linkContribution', contrib));

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

  generate(data, relations, {getColors, html, language}) {
    let style;

    if (data.color) {
      const {primary} = getColors(data.color);
      style = `--primary-color: ${primary}`;
    }

    const parts = ['trackList.item.withDuration'];
    const options = {};

    options.duration = language.formatDuration(data.duration);
    options.track = relations.trackLink;

    if (data.showArtists) {
      parts.push('withArtists');
      options.by =
        html.tag('span', {class: 'by'},
          language.$('trackList.item.withArtists.by', {
            artists: language.formatConjunctionList(relations.contributionLinks),
          }));
    }

    return html.tag('li', {style},
      language.formatString(parts.join('.'), options));
  },
};
