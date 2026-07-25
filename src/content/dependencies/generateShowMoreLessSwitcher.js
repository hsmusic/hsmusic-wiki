export default {
  slots: {
    attributes: {type: 'attributes', mutable: false},

    memorableID: {type: 'string'},

    switcherString: {type: 'string'},
    showMoreString: {type: 'string'},
    showLessString: {type: 'string'},

    showMoreTargetID: {type: 'string'},
    showLessTargetID: {type: 'string'},
  },

  generate: (slots, {html, language}) =>
    html.tag('span', {class: 'show-more-less-switcher'},
      slots.memorableID &&
        {'data-memorable-id': slots.memorableID},

      slots.attributes,

      language.$(slots.switcherString, {
        showMoreLess:
          html.tags([
            html.tag('a', {class: 'show-more'},
              {href: '#'},
              {'data-target-id': slots.showMoreTargetID},

              language.$(slots.showMoreString)),

            html.tag('a', {class: 'show-less'},
              {href: '#'},
              {style: 'display: none'},
              {'data-target-id': slots.showLessTargetID},

              language.$(slots.showLessString)),
          ], {[html.joinChildren]: ''}),
      })),
};
