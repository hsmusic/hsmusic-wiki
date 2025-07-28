import {empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkTrack'],
  extraDependencies: ['html', 'language'],

  relations: (relation, medium) => ({
    trackLinks:
      medium.representedByTracks
        .map(({track}) => relation('linkTrack', track)),
  }),

  data: (medium) => ({
    trackAnnotations:
      medium.representedByTracks
        .map(({annotation}) => annotation),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('mediumPage.musicThatRepresents', listCapsule =>
      html.tag('ul',
        {[html.onlyIfContent]: true},

        stitchArrays({
          link: relations.trackLinks,
          annotation: data.trackAnnotations,
        }).map(({link, annotation}) =>
            html.tag('li',
              language.encapsulate(listCapsule, 'item', itemCapsule => {
                let item = language.$(itemCapsule, 'track', {track: link});

                let accentParts = [], accentOptions = {};

                if (annotation) {
                  accentParts.push('withAnnotation');
                  accentOptions.annotation = annotation;
                }

                if (!empty(accentParts)) {
                  item = language.$(itemCapsule, 'withAccent', {
                    item,

                    accent:
                      language.$(
                        itemCapsule, 'accent', ...accentParts,
                        accentOptions),
                  });
                }

                return item;
              }))))),
};
