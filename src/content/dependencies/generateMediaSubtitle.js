import {stitchArrays} from '#sugar';

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
        .map(({medium}) => relation('linkMedium', medium)),
  }),

  data: (query, _thing) => ({
    mediumAnnotations:
      query.media
        .map(({annotation}) => annotation),
  }),

  slots: {
    pageCapsule: {type: 'string'},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.$(slots.pageCapsule, 'subtitle.media', {
      [language.onlyIfOptions]: ['media'],

      media:
        // XXX: Kludge. The span here is necessary to make chunkwrap
        // work at all within the string, but that seems ridiculous??
        html.tag('span',
          html.metatag('chunkwrap', {split: /,/},
            html.resolve(
              language.formatUnitList(
                stitchArrays({
                  link: relations.mediumLinks,
                  annotation: data.mediumAnnotations,
                }).map(({link, annotation}) =>
                    link.slots({
                      trimType: true,
                      showYear: true,
                      annotation,
                    })))))),
    }),
}
