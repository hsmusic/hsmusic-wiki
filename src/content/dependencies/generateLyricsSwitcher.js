export default {
  contentDependencies: ['transformContent'],
  extraDependencies: ['html', 'language'],

  relations: (relation, entries) => ({
    annotations:
      entries
        .map(entry => entry.annotation)
        .map(annotation => relation('transformContent', annotation)),
  }),

  slots: {
    tag: {type: 'string', default: 'p'},
  },

  generate: (relations, slots, {html, language}) =>
    html.tag(slots.tag, {class: 'lyrics-switcher'},
      language.$('releaseInfo.lyrics.switcher', {
        entries:
          language.formatListWithoutSeparator(
            relations.annotations
              .map((annotation, index) =>
                html.tag('span', {[html.joinChildren]: ''}, [
                  html.tag('a',
                    {href: '#'},

                    index === 0 &&
                      {style: 'display: none'},

                    annotation
                      .slots({
                        mode: 'inline',
                        textOnly: true,
                      })),

                  html.tag('a',
                    {class: 'current'},

                    index >= 1 &&
                      {style: 'display: none'},

                    annotation
                      .slots({
                        mode: 'inline',
                        textOnly: true,
                      })),
                ]))),
      })),
};
