export default {
  contentDependencies: ['linkMedium'],
  extraDependencies: ['html', 'language'],

  query: (thing) => ({
    media:
      thing.representedMedia,
  }),

  relations: (relation, query, _thing) => ({
    mediumLinks:
      query.media
        .map(medium => relation('linkMedium', medium)),
  }),

  slots: {
    pageCapsule: {type: 'string'},
  },

  generate: (relations, slots, {html, language}) =>
    language.$(slots.pageCapsule, 'subtitle.media', {
      [language.onlyIfOptions]: ['media'],

      media:
        // XXX: Kludge. The span here is necessary to make chunkwrap
        // work at all within the string, but that seems ridiculous??
        html.tag('span',
          html.metatag('chunkwrap', {split: /,/},
            html.resolve(
              language.formatUnitList(
                relations.mediumLinks.map(link =>
                  link.slots({
                    trimType: true,
                    showYear: true,
                  })))))),
    }),
}
