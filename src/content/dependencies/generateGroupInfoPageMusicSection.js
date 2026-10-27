export default {
  relations: (relation, group) => ({
    contentHeading:
      relation('generateContentHeading'),

    galleryLink:
      relation('linkGroupGallery', group),

    musicListByDate:
      relation('generateGroupInfoPageMusicListByDate', group),

    musicListBySeries:
      relation('generateGroupInfoPageMusicListBySeries', group),

    viewSwitcher:
      relation('generateIntrapageDotSwitcher'),
  }),

  generate: (relations, {html, language}) =>
    language.encapsulate('groupInfoPage', pageCapsule =>
      language.encapsulate(pageCapsule, 'musicList', listCapsule =>
        html.tags([
          relations.contentHeading.slots({
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
                  !html.isBlank(relations.musicListByDate) &&
                  !html.isBlank(relations.musicListBySeries)
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
                                'group-music-list-by-series',
                                'group-music-list-by-date',
                              ],
                            }),
                        })));
                }

                return language.$(workingCapsule, workingOptions);
              }))),

          ((!html.isBlank(relations.musicListByDate) &&
            !html.isBlank(relations.musicListBySeries))

            ? [
                relations.musicListBySeries,
                relations.musicListByDate.slot('hidden', true),
              ]

            : [
                relations.musicListBySeries,
                relations.musicListByDate,
              ]),
        ]))),
};
