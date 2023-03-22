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
      html.tag('dl',
        data.additionalFiles.flatMap(({title, description, files}) => [
          html.tag('dt',
            (description
              ? language.$('releaseInfo.additionalFiles.entry.withDescription', {
                  title,
                  description,
                })
              : language.$('releaseInfo.additionalFiles.entry', {title}))),

          slot('additionalFileLinks', ([fileLinks]) =>
          slot('additionalFileSizes', ([fileSizes]) =>
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
                        })))))))),
        ])));
  },
};
