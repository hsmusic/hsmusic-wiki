export default {
  contentDependencies: [
    'generateContentHeading',
    'generateGroupInfoPageAlbumsListByDate',
    'generateGroupInfoPageAlbumsListBySeries',
    'linkGroupGallery',
  ],

  extraDependencies: ['html', 'language'],

  relations: (relation, group) => ({
    contentHeading:
      relation('generateContentHeading'),

    galleryLink:
      relation('linkGroupGallery', group),

    albumsListByDate:
      relation('generateGroupInfoPageAlbumsListByDate', group),

    albumsListBySeries:
      relation('generateGroupInfoPageAlbumsListBySeries', group),
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

          relations.albumsListByDate,
          relations.albumsListBySeries,
        ]))),
};
