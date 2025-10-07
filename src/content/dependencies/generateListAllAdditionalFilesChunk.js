import {stitchArrays} from '#sugar';

export default {
  relations: (relation, additionalFiles) => ({
    links:
      additionalFiles
        .map(file => file.filenames
          .map(filename => relation('linkAdditionalFile', file, filename))),
  }),

  data: (additionalFiles) => ({
    titles:
      additionalFiles
        .map(file => file.title),

    filenames:
      additionalFiles
        .map(file => file.filenames),
  }),

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    stringsKey: {type: 'string'},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('listingPage', slots.stringsKey, pageCapsule =>
      html.tags([
        html.tag('dt',
          {[html.onlyIfSiblings]: true},
          slots.title),

        html.tag('dd',
          {[html.onlyIfContent]: true},

          html.tag('ul',
          {[html.onlyIfContent]: true},

            stitchArrays({
              title: data.titles,
              links: relations.links,
              filenames: data.filenames,
            }).map(({
                title,
                links,
                filenames,
              }) =>
                language.encapsulate(pageCapsule, 'file', capsule =>
                  (links.length === 1
                    ? html.tag('li',
                        links[0].slots({
                          content:
                            language.$(capsule, {
                              title: title,
                            }),
                        }))

                 : links.length === 0
                    ? html.tag('li',
                        language.$(capsule, 'withNoFiles', {
                          title: title,
                        }))

                    : html.tag('li', {class: 'has-details'},
                        html.tag('details', [
                          html.tag('summary',
                            html.tag('span',
                              language.$(capsule, 'withMultipleFiles', {
                                title:
                                  html.tag('b', title),

                                files:
                                  language.countAdditionalFiles(
                                    links.length,
                                    {unit: true}),
                              }))),

                          html.tag('ul',
                            stitchArrays({
                              link: links,
                              filename: filenames,
                            }).map(({link, filename}) =>
                                html.tag('li',
                                  link.slots({
                                    content:
                                      language.$(capsule, {
                                        title: filename,
                                      }),
                                  })))),
                        ]))))))),
      ])),
};
