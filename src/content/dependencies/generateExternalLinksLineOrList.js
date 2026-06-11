import {isExternalLinkContext} from '#external-links';
import {empty, stitchArrays} from '#sugar';

export default {
  relations: (relation, urlEntries) => ({
    externalLinks:
      urlEntries.map(entry => relation('linkExternal', entry)),
  }),

  data: (urlEntries) => ({
    totalEntries:
      urlEntries.length,

    annotatedEntries:
      urlEntries.filter(entry => entry.annotation).length,
  }),

  slots: {
    string: {type: 'string'},

    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },

    contexts: {
      validate: v => v.strictArrayOf(isExternalLinkContext),
      default: [],
    },

    maximumTotalEntriesInLine: {type: 'number', default: 4},
    maximumAnnotatedEntriesInLine: {type: 'number', default: 1},
    maximumParenthesizedEntriesInLine: {type: 'number', default: 3},
  },

  generate(data, relations, slots, {html, language}) {
    const {externalLinks} = relations;

    if (empty(externalLinks)) {
      return html.blank();
    }

    if (!html.isBlank(slots.contexts)) {
      stitchArrays({
        link: externalLinks,
        linkContext: slots.contexts,
      }).forEach(({link, linkContext}) => {
          link.setSlot('context', [slots.context, linkContext].flat(Infinity));
        });
    } else {
      externalLinks.forEach(link => {
        link.setSlot('context', slots.context);
      });
    }

    let style = 'line';

    if (data.totalEntries > slots.maximumTotalEntriesInLine) {
      style = 'list';
    }

    if (data.annotatedEntries > slots.maximumAnnotatedEntriesInLine) {
      style = 'list';
    }

    let parenthesizedEntries = 0;
    for (const item of externalLinks) {
      const plainText = html.resolve(item, {normalize: 'plain'});
      if (plainText.endsWith(')')) {
        parenthesizedEntries++;
      }
    }

    if (parenthesizedEntries > slots.maximumParenthesizedEntriesInLine) {
      style = 'list';
    }

    switch (style) {
      case 'line': return (
        html.tag('p',
          html.metatag('chunkwrap', {split: /,/},
            language.$(slots.string, {
              links:
                language.formatDisjunctionList(externalLinks),
            })))
      );

      case 'list': return (
        html.tags([
          html.tag('p', language.$(slots.string, 'title')),
          html.tag('ul',
            externalLinks.map(link => html.tag('li', link))),
        ])
      );

      default:
        return html.blank();
    }
  },
};
