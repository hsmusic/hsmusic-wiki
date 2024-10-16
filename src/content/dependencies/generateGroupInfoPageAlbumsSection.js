export default {
  contentDependencies: [
    'generateContentHeading',
    'generateGroupInfoPageAlbumsListByDate',
    'generateGroupInfoPageAlbumsListBySeries',
    'generateIntrapageDotSwitcher',
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

    viewSwitcher:
      relation('generateIntrapageDotSwitcher'),
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

            language.encapsulate(pageCapsule, 'viewAlbumGallery', viewAlbumGalleryCapsule =>
              language.encapsulate(viewAlbumGalleryCapsule, workingCapsule => {
                const workingOptions = {};

                workingOptions.link =
                  relations.galleryLink
                    .slot('content',
                      language.$(viewAlbumGalleryCapsule, 'link'));

                if (
                  !html.isBlank(relations.albumsListByDate) &&
                  !html.isBlank(relations.albumsListBySeries)
                ) {
                  workingCapsule += '.withViewSwitcher';
                  workingOptions.viewSwitcher =
                    html.tag('span', {class: 'group-view-switcher'},
                      language.encapsulate(pageCapsule, 'viewSwitcher', switcherCapsule =>
                        language.$(switcherCapsule, {
                          options:
                            relations.viewSwitcher.slots({
                              initialOptionIndex: 0,

                              titles: [
                                language.$(switcherCapsule, 'bySeries'),
                                language.$(switcherCapsule, 'byDate'),
                              ],

                              targetIDs: [
                                'group-album-list-by-series',
                                'group-album-list-by-date',
                              ],
                            }),
                        })));
                }

                return language.$(workingCapsule, workingOptions);
              }))),

          ((!html.isBlank(relations.albumsListByDate) &&
            !html.isBlank(relations.albumsListBySeries))

            ? [
                relations.albumsListBySeries,
                relations.albumsListByDate.slot('hidden', true),
              ]

            : [
                relations.albumsListBySeries,
                relations.albumsListByDate,
              ]),
        ]))),
};
