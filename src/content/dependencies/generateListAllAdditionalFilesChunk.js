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
              (additionalFileLinks.length === 1
                ? html.tag('li',
                    additionalFileLinks[0].slots({
                      content:
                        language.$('listingPage', slots.stringsKey, 'file', {
                          title: additionalFileTitle,
                        }),
                    }))

             : additionalFileLinks.length === 0
                ? html.tag('li',
                    language.$('listingPage', slots.stringsKey, 'file.withNoFiles', {
                      title: additionalFileTitle,
                    }))

                : html.tag('li', {class: 'has-details'},
                    html.tag('details', [
                      html.tag('summary',
                        html.tag('span',
                          language.$('listingPage', slots.stringsKey, 'file.withMultipleFiles', {
                            title:
                              html.tag('span', {class: 'group-name'},
                                additionalFileTitle),

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
                                  language.$('listingPage', slots.stringsKey, 'file', {
                                    title: additionalFileFile,
                                  }),
                              })))),
                    ])))))),
    ]);
  },
};
