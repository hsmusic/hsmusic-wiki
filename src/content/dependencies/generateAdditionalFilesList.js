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
    const fileKeys = data.additionalFiles.flatMap(({files}) => files);
    const validateFileMapping = (v, validateValue) => {
      return value => {
        v.isObject(value);

        // It's OK to skip values for files, but if keys are provided for files
        // which don't exist, that's an error.

        const unexpectedKeys =
          Object.keys(value).filter(key => !fileKeys.includes(key))

        if (!empty(unexpectedKeys)) {
          throw new TypeError(`Unexpected file keys: ${unexpectedKeys.join(', ')}`);
        }

        const valueErrors = [];
        for (const [fileKey, fileValue] of Object.entries(value)) {
          if (fileValue === null) {
            continue;
          }

          try {
            validateValue(fileValue);
          } catch (error) {
            error.message = `(${fileKey}) ` + error.message;
            valueErrors.push(error);
          }
        }

        if (!empty(valueErrors)) {
          throw new AggregateError(valueErrors, `Errors validating values`);
        }
      };
    };

    return html.template({
      annotation: 'generateAdditionalFilesList',

      slots: {
        fileLinks: {
          validate: v => validateFileMapping(v, v.isHTML),
        },

        fileSizes: {
          validate: v => validateFileMapping(v, v.isWholeNumber),
        },
      },

      content(slots) {
        if (!slots.fileSizes) {
          return html.blank();
        }

        const filesWithLinks = new Set(
          Object.entries(slots.fileLinks)
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
                    (slots.fileSizes[file]
                      ? language.$('releaseInfo.additionalFiles.file.withSize', {
                          file: slots.fileLinks[file],
                          size: language.formatFileSize(slots.fileSizes[file]),
                        })
                      : language.$('releaseInfo.additionalFiles.file', {
                          file: slots.fileLinks[file],
                        })))))),
          ]));
      },
    });
  },
};
