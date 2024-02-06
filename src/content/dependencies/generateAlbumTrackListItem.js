import {compareArrays, empty} from '#sugar';

export default {
  contentDependencies: [
    'generateAlbumTrackListMissingDuration',
    'linkContribution',
    'linkTrack',
  ],

  extraDependencies: ['getColors', 'html', 'language'],

  query(track) {
    const query = {};

    query.duration = track.duration ?? 0;
    query.durationMissing = !track.duration;

    return query;
  },

  relations(relation, query, track) {
    const relations = {};

    if (!empty(track.artistContribs)) {
      relations.contributionLinks =
        track.artistContribs
          .map(contrib => relation('linkContribution', contrib));
    }

    relations.trackLink =
      relation('linkTrack', track);

    if (query.durationMissing) {
      relations.missingDuration =
        relation('generateAlbumTrackListMissingDuration');
    }

    return relations;
  },

  data(query, track, album) {
    const data = {};

    data.duration = query.duration;
    data.durationMissing = query.durationMissing;

    if (track.color !== album.color) {
      data.color = track.color;
    }

    data.showArtists =
      !empty(track.artistContribs) &&
       (empty(album.artistContribs) ||
        !compareArrays(
          track.artistContribs.map(c => c.who),
          album.artistContribs.map(c => c.who),
          {checkOrder: false}));

    return data;
  },

  generate(data, relations, {getColors, html, language}) {
    let colorStyle;
    if (data.color) {
      const {primary} = getColors(data.color);
      colorStyle = {style: `--primary-color: ${primary}`};
    }

    const parts = ['trackList.item'];
    const options = {};

    parts.push('withDuration');

    options.duration =
      (data.durationMissing
        ? relations.missingDuration
        : language.$('trackList.item.withDuration.duration', {
            duration:
              language.formatDuration(data.duration),
          }));

    options.track =
      relations.trackLink
        .slot('color', false);

    if (data.showArtists) {
      parts.push('withArtists');
      options.by =
        html.tag('span', {class: 'by'},
          language.$('trackList.item.withArtists.by', {
            artists: language.formatConjunctionList(relations.contributionLinks),
          }));
    }

    return html.tag('li',
      colorStyle,
      language.formatString(...parts, options));
  },
};
