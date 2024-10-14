import {empty, stitchArrays} from '#sugar';

export default {
  extraDependencies: ['html', 'language'],

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    additionalFileTitles: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    additionalFileLinks: {
      validate: v => v.strictArrayOf(v.strictArrayOf(v.isHTML)),
    },

    additionalFileFiles: {
      validate: v => v.strictArrayOf(v.strictArrayOf(v.isString)),
    },

    stringsKey: {type: 'string'},
  },

  generate(slots, {html, language}) {
    if (empty(slots.additionalFileLinks)) {
      return html.blank();
    }

    return html.tags([
      html.tag('dt', slots.title),
      html.tag('dd',
        html.tag('ul',
          stitchArrays({
            additionalFileTitle: slots.additionalFileTitles,
            additionalFileLinks: slots.additionalFileLinks,
            additionalFileFiles: slots.additionalFileFiles,
          }).map(({
              additionalFileTitle,
              additionalFileLinks,
              additionalFileFiles,
            }) =>
              language.encapsulate('listingPage', slots.stringsKey, 'file', capsule =>
                (additionalFileLinks.length === 1
                  ? html.tag('li',
                      additionalFileLinks[0].slots({
                        content:
                          language.$(capsule, {
                            title: additionalFileTitle,
                          }),
                      }))

               : additionalFileLinks.length === 0
                  ? html.tag('li',
                      language.$(capsule, 'withNoFiles', {
                        title: additionalFileTitle,
                      }))

                  : html.tag('li', {class: 'has-details'},
                      html.tag('details', [
                        html.tag('summary',
                          html.tag('span',
                            language.$(capsule, 'withMultipleFiles', {
                              title:
                                html.tag('b', additionalFileTitle),

                              files:
                                language.countAdditionalFiles(
                                  additionalFileLinks.length,
                                  {unit: true}),
                            }))),

                        html.tag('ul',
                          stitchArrays({
                            additionalFileLink: additionalFileLinks,
                            additionalFileFile: additionalFileFiles,
                          }).map(({additionalFileLink, additionalFileFile}) =>
                              html.tag('li',
                                additionalFileLink.slots({
                                  content:
                                    language.$(capsule, {
                                      title: additionalFileFile,
                                    }),
                                })))),
                      ]))))))),
    ]);
  },
};
