export default {
  contentDependencies: ['generateColorStyleAttribute'],
  extraDependencies: ['html', 'language'],

  relations: (relation, track) => ({
    colorStyle:
      relation('generateColorStyleAttribute', track.album.color),
  }),

  data: (track) => ({
    albumName:
      track.album.name,
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('a',
      {href: '#'},
      relations.colorStyle.slot('context', 'primary-only'),
      language.sanitize(data.albumName)),
};
