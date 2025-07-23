export default {
  contentDependencies: ['linkMedium'],
  extraDependencies: ['html'],

  relations: (relation, media) => ({
    mediumLinks:
      media.map(medium => relation('linkMedium', medium)),
  }),

  generate: (relations, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.mediumLinks.map(link =>
        html.tag('li', link))),
};
