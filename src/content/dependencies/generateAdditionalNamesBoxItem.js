import {stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkTrack', 'transformContent'],
  extraDependencies: ['html', 'language'],

  relations: (relation, entry) => ({
    nameContent:
      relation('transformContent', entry.name),

    annotationContent:
      (entry.annotation
        ? relation('transformContent', entry.annotation)
        : null),

    trackLinks:
      (entry.from
        ? entry.from.map(track => relation('linkTrack', track))
        : null),
  }),

  data: (entry) => ({
    albumNames:
      (entry.from
        ? entry.from.map(track => track.album.name)
        : null),
  }),

  generate: (data, relations, {html, language}) => {
    const prefix = 'misc.additionalNames.item';

    const itemParts = [prefix];
    const itemOptions = {};

    itemOptions.name =
      html.tag('span', {class: 'additional-name'},
        relations.nameContent.slot('mode', 'inline'));

    const accentParts = [prefix, 'accent'];
    const accentOptions = {};

    if (relations.annotationContent) {
      accentParts.push('withAnnotation');
      accentOptions.annotation =
        relations.annotationContent.slot('mode', 'inline');
    }

    if (relations.trackLinks) {
      accentParts.push('withAlbums');
      accentOptions.albums =
        language.formatConjunctionList(
          stitchArrays({
            trackLink: relations.trackLinks,
            albumName: data.albumNames,
          }).map(({trackLink, albumName}) =>
              trackLink.slot('content',
                language.sanitize(albumName))));
    }

    if (accentParts.length > 2) {
      itemParts.push('withAccent');
      itemOptions.accent =
        html.tag('span', {class: 'accent'},
          html.metatag('chunkwrap', {split: ','},
            html.resolve(
              language.$(...accentParts, accentOptions))));
    }

    return language.$(...itemParts, itemOptions);
  },
};
