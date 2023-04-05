import {empty} from '../../util/sugar.js';

export default {
  extraDependencies: [
    'html',
    'language',
  ],

  data(additionalFiles, {fileSize = true} = {}) {
    return {
      // Additional files are already a serializable format.
      additionalFiles,
      showFileSizes: fileSize,
    };
  },

  generate(data, {
    html,
    language,
  }) {
    return html.template(slot =>
      slot('additionalFileLinks', ([fileLinks]) =>
      slot('additionalFileSizes', ([fileSizes]) => {
        if (!fileSizes) {
          return html.blank();
        }

        const filesWithLinks = new Set(
          Object.entries(fileLinks)
            .filter(([key, value]) => value)
            .map(([key]) => key));

        if (filesWithLinks.size === 0) {
          return html.blank();
        }

        const filteredFileGroups = data.additionalFiles
          .map(({title, description, files}) => ({
            title,
            description,
            files: files.filter(f => filesWithLinks.has(f)),
          }))
          .filter(({files}) => !empty(files));

        if (empty(filteredFileGroups)) {
          return html.blank();
        }

        return html.tag('dl',
          filteredFileGroups.flatMap(({title, description, files}) => [
            html.tag('dt',
              (description
                ? language.$('releaseInfo.additionalFiles.entry.withDescription', {
                    title,
                    description,
                  })
                : language.$('releaseInfo.additionalFiles.entry', {title}))),

            html.tag('dd',
              html.tag('ul',
                files.map(file =>
                  html.tag('li',
                    (fileSizes[file]
                      ? language.$('releaseInfo.additionalFiles.file.withSize', {
                          file: fileLinks[file],
                          size: language.formatFileSize(fileSizes[file]),
                        })
                      : language.$('releaseInfo.additionalFiles.file', {
                          file: fileLinks[file],
                        })))))),
          ]));
      })));
  },
};
