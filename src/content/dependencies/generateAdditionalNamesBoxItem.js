export default {
  relations: (relation, entry) => ({
    nameContent:
      relation('transformContent', entry.name),

    annotationContent:
      (entry.annotation
        ? relation('transformContent', entry.annotation)
        : null),
  }),

  generate: (relations, {html, language}) => {
    const prefix = 'misc.additionalNames.item';

    const itemParts = [prefix];
    const itemOptions = {};

    itemOptions.name =
      html.tag('span', {class: 'additional-name'},
        relations.nameContent.slot('mode', 'inline'));

    const accentParts = [prefix, 'accent'];
    const accentOptions = {};

    if (relations.annotationContent) {
      accentParts.push('withAnnotation');
      accentOptions.annotation =
        relations.annotationContent.slots({
          mode: 'inline',
          absorbPunctuationFollowingExternalLinks: false,
        });
    }

    if (accentParts.length > 2) {
      itemParts.push('withAccent');
      itemOptions.accent =
        html.tag('span', {class: 'accent'},
          html.metatag('chunkwrap', {split: ','},
            html.resolve(
              language.$(...accentParts, accentOptions))));
    }

    return language.$(...itemParts, itemOptions);
  },
};
