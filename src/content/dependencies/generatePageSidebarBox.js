import striptags from 'striptags';

export default {
  relations: (relation) => ({
    colorStyle:
      relation('generateColorStyleAttribute'),
  }),

  slots: {
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    color: {
      validate: v => v.isColor,
    },

    collapse: {
      validate: v => v.is(true, false, 'chain'),
    },

    collapseMemorableID: {
      type: 'string',
    },

    hideForNarrowLayout: {
      type: 'boolean',
      default: true,
    },

    title: {
      type: 'html',
      mutable: false,
    },

    content: {
      type: 'html',
      mutable: false,
    },
  },

  generate(relations, slots, {html}) {
    // Some boxes are only a title! These are allowed.
    if (html.isBlank(slots.content) && html.isBlank(slots.title)) {
      return html.blank();
    }

    const plainTitle =
      (html.isBlank(slots.title)
        ? html.blank()
        : striptags(
            html.resolve(slots.title, {normalize: 'string'}),
            {disallowedTags: new Set(['a'])}));

    const content =
      html.tag('div', {class: 'sidebar-content'},
        {[html.onlyIfContent]: true},

        // Distinctly not onlyIfSiblings: true.
        html.tag('h1', {[html.onlyIfContent]: true},
          slots.title),

        slots.content);

    const box =
      html.tag('div', {class: 'sidebar'},
        slots.hideForNarrowLayout &&
          {class: 'hide-for-narrow-layout'},

        slots.attributes,

        slots.color &&
          relations.colorStyle.slot('color', slots.color),

        (slots.collapse === true
          ? html.tag('details',
              slots.collapseMemorableID && [
                {class: 'memorable'},
                {'data-memorable-id': slots.collapseMemorableID},
              ],

              html.tag('summary',
                html.tag('div',
                  html.tag('span', plainTitle))),

              content)

       : slots.collapse === 'chain'
          ? html.tag('div', {class: 'chain-details'},
              html.tag('p', {class: 'chain-summary'},
                html.tag('span', plainTitle)),

              content)

        : content));

    return box;
  },
};
