import {empty} from '#sugar';

export default {
  slots: {
    // This isn't mutable, but we will be inspecting items' contents.
    items: {validate: v => v.looseArrayOf(v.isHTML)},
  },

  generate(slots, {html}) {
    const tags = [];

    let paragraphLines = [];
    const closeParagraph = () => {
      if (empty(paragraphLines)) return;

      const paragraph =
        html.tag('p',
          {[html.joinChildren]: html.tag('br')},
          {[html.onlyIfContent]: true},
            paragraphLines);

      tags.push(paragraph);
      paragraphLines = [];
    };

    for (let item of slots.items) {
      item = html.Template.resolve(item);

      if (typeof item === 'string' && item.length) {
        paragraphLines.push(item);
        continue;
      }

      if (html.isBlank(item) || !item) {
        continue;
      }

      if (item.contentOnly) {
        paragraphLines.push(item);
        continue;
      }

      if (item.tagName === 'br') {
        continue;
      }

      if (item.tagName === 'p') {
        paragraphLines.push(item.content);
        continue;
      }

      closeParagraph();
      tags.push(item);
    }

    closeParagraph();

    if (empty(tags)) {
      return html.blank();
    } else {
      return html.tags(tags);
    }
  }
};
