import {sortChronologically} from '#sort';

export default {
  contentDependencies: [
    'generateContentHeading',
    'generateGroupInfoPageAlbumsSectionAlbumRow',
    'linkGroupGallery',
  ],

  extraDependencies: ['html', 'language'],

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
    contentHeading:
      relation('generateContentHeading'),

    galleryLink:
      relation('linkGroupGallery', group),

    albumRows:
      query.albums.map(album =>
        relation('generateGroupInfoPageAlbumsSectionAlbumRow',
          album,
          group)),
  }),

  generate: (relations, {html, language}) =>
    language.encapsulate('groupInfoPage', pageCapsule =>
      language.encapsulate(pageCapsule, 'albumList', listCapsule =>
        html.tags([
          relations.contentHeading
            .slots({
              tag: 'h2',
              title: language.$(listCapsule, 'title'),
            }),

          html.tag('p',
            {[html.onlyIfSiblings]: true},

            language.encapsulate(pageCapsule, 'viewAlbumGallery', capsule =>
              language.$(capsule, {
                link:
                  relations.galleryLink
                    .slot('content', language.$(capsule, 'link')),
              }))),

          html.tag('ul',
            {[html.onlyIfContent]: true},

            relations.albumRows),
        ]))),
};
