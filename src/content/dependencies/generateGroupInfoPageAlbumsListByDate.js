import {sortChronologically} from '#sort';

export default {
  contentDependencies: ['generateGroupInfoPageAlbumsListItem'],

  extraDependencies: ['html'],

  query: (group) => ({
    // Typically, a latestFirst: false (default) chronological sort would be
    // appropriate here, but navigation between adjacent albums in a group is a
    // rather "essential" movement or relationship in the wiki, and we consider
    // the sorting order of a group's gallery page (latestFirst: true) to be
    // "canonical" in this regard. We exactly match its sort here, but reverse
    // it, to still present earlier albums preceding later ones.
    albums:
      sortChronologically(group.albums.slice(), {latestFirst: true})
        .reverse(),
  }),

  relations: (relation, query, group) => ({
    items:
      query.albums
        .map(album =>
          relation('generateGroupInfoPageAlbumsListItem',
            album,
            group)),
  }),

  generate: (relations, {html}) =>
    html.tag('ul',
      {[html.onlyIfContent]: true},

      relations.items),
};
