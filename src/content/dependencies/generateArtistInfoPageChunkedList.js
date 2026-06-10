export default {
  slots: {
    groupInfo: {
      type: 'html',
      mutable: false,
    },

    chunks: {
      type: 'html',
      mutable: false,
    },
  },

  generate: (slots, {html, language}) =>
    html.tag('dl',
      {[html.onlyIfContent]: true},

      [
        slots.groupInfo,

        slots.chunks,

        !html.isBlank(slots.groupInfo) &&
          html.tag('dt', {class: 'filter-notice'},
            {style: 'display: none'},

            language.encapsulate('artistPage.filterNotice', capsule =>
              language.$(capsule, {
                clear:
                  html.tag('a', {href: '#'},
                    language.$(capsule, 'clear')),
              }))),
      ]),
};
