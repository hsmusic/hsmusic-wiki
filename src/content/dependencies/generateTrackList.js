export default {
  contentDependencies: ['generateTrackListItem'],
  extraDependencies: ['html'],

  relations: (relation, tracks) => ({
    items:
      tracks
        .map(track => relation('generateTrackListItem', track, [])),
  }),

  generate: (relations, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.items.map(item =>
        item.slots({
          showArtists: true,
          showDuration: false,
          color: true,
        }))),
};
