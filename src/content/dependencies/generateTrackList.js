export default {
  relations: (relation, tracks, contextContributions) => ({
    items:
      tracks.map(track =>
        relation('generateTrackListItem', track, contextContributions)),
  }),

  slots: {
    showArtists: {
      validate: v => v.is(true, false, 'auto'),
      default: 'auto',
    },

    showDetail: {
      type: 'boolean',
      default: true,
    },

    showDuration: {
      type: 'boolean',
      default: false,
    },

    colorMode: {
      validate: v => v.is('none', 'track', 'line'),
      default: 'track',
    },
  },

  generate: (relations, slots, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.items.map(item =>
        item.slots({
          showArtists: slots.showArtists,
          showDetail: slots.showDetail,
          showDuration: slots.showDuration,
          colorMode: slots.colorMode,
        }))),
};
