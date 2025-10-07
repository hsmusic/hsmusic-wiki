import {stitchArrays} from '#sugar';

export default {
  relations: (relation, file) => ({
    description:
      relation('transformContent', file.description),

    links:
      file.filenames
        .map(filename => relation('linkAdditionalFile', file, filename)),
  }),

  data: (file) => ({
    title:
      file.title,

    paths:
      file.paths,
  }),

  slots: {
    showFileSizes: {
      type: 'boolean',
    },
  },

  generate: (data, relations, slots, {getSizeOfMediaFile, html, language, urls}) =>
    language.encapsulate('releaseInfo.additionalFiles', capsule =>
      html.tag('li',
        html.tag('details',
          html.isBlank(relations.links) &&
            {open: true},

          [
            html.tag('summary',
              html.tag('span',
                language.$(capsule, 'entry', {
                  title:
                    html.tag('b', data.title),
                }))),

            html.tag('ul', [
              html.tag('li', {class: 'entry-description'},
                {[html.onlyIfContent]: true},

                relations.description.slot('mode', 'inline')),

              (html.isBlank(relations.links)
                ? html.tag('li',
                    language.$(capsule, 'entry.noFilesAvailable'))

                : stitchArrays({
                    link: relations.links,
                    path: data.paths,
                  }).map(({link, path}) =>
                      html.tag('li',
                        language.encapsulate(capsule, 'file', workingCapsule => {
                          const workingOptions = {file: link};

                          if (slots.showFileSizes) {
                            const fileSize =
                              getSizeOfMediaFile(
                                urls
                                  .from('media.root')
                                  .to(...path));

                            if (fileSize) {
                              workingCapsule += '.withSize';
                              workingOptions.size =
                                language.formatFileSize(fileSize);
                            }
                          }

                          return language.$(workingCapsule, workingOptions);
                        })))),
            ]),
          ]))),
};
