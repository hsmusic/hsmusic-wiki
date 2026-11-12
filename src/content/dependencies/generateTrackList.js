export default {
  relations: (relation, list) => ({
    items:
      list.map(item =>
        (item.isDivider
          ? relation('generateListDivider')
          : relation('generateTrackListItem', item, []))),
  }),

  slots: {
    showNameDetail: {
      type: 'boolean',
      default: true,
    },

    colorMode: {
      validate: v => v.is('none', 'track', 'line'),
      default: 'track',
    },
  },

  generate: (relations, slots, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.items.map(item => {
        if (item.setSlots) {
          item.setSlots({
            showNameDetail:
              (slots.showNameDetail
                ? 'from across wiki'
                : false),

            colorMode: slots.colorMode,
          });
        };

        return item;
      })),
};
