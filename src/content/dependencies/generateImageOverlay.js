export default {
  extraDependencies: ['html', 'language'],

  generate: ({html, language}) =>
    html.tag('div', {id: 'image-overlay-container'},
      html.tag('div', {id: 'image-overlay-content-container'}, [
        html.tag('span', {id: 'image-overlay-image-area'},
          html.tag('span', {id: 'image-overlay-image-layout'}, [
            html.tag('img', {id: 'image-overlay-image'}),
            html.tag('img', {id: 'image-overlay-image-thumb'}),
          ])),

        html.tag('div', {id: 'image-overlay-action-container'},
          language.encapsulate('releaseInfo.viewOriginalFile', capsule => [
            html.tag('div', {id: 'image-overlay-action-content-without-size'},
              language.$(capsule, {
                link: html.tag('a', {class: 'image-overlay-view-original'},
                  language.$(capsule, 'link')),
              })),

            html.tag('div', {id: 'image-overlay-action-content-with-size'}, [
              language.$(capsule, 'withSize', {
                link:
                  html.tag('a', {class: 'image-overlay-view-original'},
                    language.$(capsule, 'link')),

                size:
                  html.tag('span',
                    {[html.joinChildren]: ''},
                    [
                      html.tag('span', {id: 'image-overlay-file-size-kilobytes'},
                        language.$('count.fileSize.kilobytes', {
                          kilobytes:
                            html.tag('span', {class: 'image-overlay-file-size-count'}),
                        })),

                      html.tag('span', {id: 'image-overlay-file-size-megabytes'},
                        language.$('count.fileSize.megabytes', {
                          megabytes:
                            html.tag('span', {class: 'image-overlay-file-size-count'}),
                        })),
                    ]),
              }),

              html.tag('span', {id: 'image-overlay-file-size-warning'},
                language.$(capsule, 'sizeWarning')),
            ]),
          ])),
      ])),
};
