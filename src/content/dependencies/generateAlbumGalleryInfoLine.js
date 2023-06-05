import {getTotalDuration} from '../../util/wiki-data.js';

export default {
  extraDependencies: ['html', 'language'],

  data(album) {
    return {
      name: album.name,
      date: album.date,
      duration: getTotalDuration(album.tracks),
      numTracks: album.tracks.length,
    };
  },

  generate(data, {html, language}) {
    const parts = ['albumGalleryPage.infoLine'];
    const options = {};

    options.tracks =
      html.tag('b',
        language.countTracks(data.numTracks, {unit: true}));

    options.duration =
      html.tag('b',
        language.formatDuration(data.duration, {unit: true}));

    if (data.date) {
      parts.push('withDate');
      options.date =
        html.tag('b',
          language.formatDate(data.date));
    }

    return (
      html.tag('p', {class: 'quick-info'},
        language.formatString(parts.join('.'), options)));
  },
};
