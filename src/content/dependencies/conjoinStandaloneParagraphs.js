import {empty} from '#sugar';

export default {
  slots: {
    items: {validate: v => v.looseArrayOf(v.isHTML)},
  },

  generate(slots, {html}) {
    const paragraphize = tags =>
      html.tag('p',
        {[html.joinChildren]: html.tag('br')},
        {[html.onlyIfContent]: true},
        tags);

    const result = [];
    let current = [];

    for (const item of slots.items) {
      const {content: tags} =
        html.smooth(html.resolve(item, {normalize: 'tag'}));

      const notJustParagraphs =
        tags.some(tag =>
          typeof tag !== 'object' ||
          tag.tagName !== 'p');

      if (notJustParagraphs) {
        if (!empty(current)) {
          result.push(paragraphize(current));
        }

        result.push(item);
        current = [];
      } else if (!empty(tags)) {
        // Add tag contents directly. These are literally html.tag('p') objects
        // so it's safe to access their content, and this preserves whatever
        // properties are set on a contained html.tags(), as opposed to using
        // html.inside().
        current.push(html.tags(tags.map(p => p.content)));
      }
    }

    if (!empty(current)) {
      result.push(paragraphize(current));
    }

    return result;
  },
};
