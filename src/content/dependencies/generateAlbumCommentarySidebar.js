import {empty} from '#sugar';

export default {
  relations: (relation, album) => ({
    sidebar:
      relation('generatePageSidebar'),

    sidebarBox:
      relation('generatePageSidebarBox'),

    albumLink:
      relation('linkAlbum', album),

    trackList:
      relation('generateAlbumSidebarTrackList', album, null),
  }),

  data: (album) => ({
    albumHasCommentary:
      !empty(album.commentary),

    anyTrackHasCommentary:
      album.tracks.some(track => !empty(track.commentary)),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('albumCommentaryPage', pageCapsule =>
      relations.sidebar.slots({
        stickyMode: 'column',
        boxes: [
          relations.sidebarBox.slots({
            attributes: {class: 'commentary-track-list-sidebar-box'},
            content: [
              html.tag('h1', relations.albumLink),

              html.tag('p', {[html.onlyIfContent]: true},
                language.encapsulate(pageCapsule, 'sidebar', workingCapsule => {
                  if (data.anyTrackHasCommentary) return html.blank();

                  if (data.albumHasCommentary) {
                    workingCapsule += '.noTrackCommentary';
                  } else {
                    workingCapsule += '.noCommentary';
                  }

                  return language.$(workingCapsule);
                })),

              relations.trackList.slot('mode', 'commentary'),
            ],
          }),
        ]
      })),
}
