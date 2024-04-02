export default {
  extraDependencies: ['html', 'language'],

  slots: {
    fileLink: {
      type: 'html',
      mutable: false,
    },

    fileSize: {
      validate: v => v.isWholeNumber,
    },
  },

  generate(slots, {html, language}) {
    const itemParts = ['releaseInfo.additionalFiles.file'];
    const itemOptions = {file: slots.fileLink};

    if (slots.fileSize) {
      itemParts.push('withSize');
      itemOptions.size = language.formatFileSize(slots.fileSize);
    }

    const li =
      html.tag('li',
        language.$(...itemParts, itemOptions));

    return li;
  },
};
