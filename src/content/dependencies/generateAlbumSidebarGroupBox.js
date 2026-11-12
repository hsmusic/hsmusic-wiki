import {sortAlbumsTracksChronologically} from '#sort';
import {atOffset} from '#sugar';

export default {
  query(album, track, group) {
    const query = {};

    if (album.date) {
      const things =
        group.albumsAndTracks.filter(album => album.date);

      // Sort by latest first. This matches the sorting order used on group
      // gallery pages, ensuring that previous/next matches moving up/down
      // the gallery. Note that this makes the index offsets "backwards"
      // compared to how latest-last chronological lists are accessed.
      sortAlbumsTracksChronologically(things, {latestFirst: true});

      const currentThing =
        (album.style === 'single' && track === album.tracks[0]
          ? album
          : track ?? album);

      const currentIndex = things.indexOf(currentThing);

      query.previousThing =
        atOffset(things, currentIndex, +1);

      query.nextThing =
        atOffset(things, currentIndex, -1);
    }

    return query;
  },

  relations: (relation, query, _album, _track, group) => ({
    box:
      relation('generatePageSidebarBox'),

    groupLink:
      relation('linkGroup', group),

    externalLinks:
      group.urls
        .map(entry => relation('linkExternal', entry)),

    description:
      relation('transformContent', group.descriptionShort),

    previousThingLink:
      (query.previousThing
        ? relation('linkAlbum', query.previousThing)
        : null),

    nextThingLink:
      (query.nextThing
        ? relation('linkAlbum', query.nextThing)
        : null),
  }),

  data: (query, _album, track, group) => ({
    directory:
      group.directory,

    color:
      group.color,

    collapse:
      group.collapseInAlbumSidebars,

    groupDirectlyIncludesTrack:
      (track
        ? group.albumsAndTracks.includes(track)
        : null),
  }),

  slots: {
    mode: {
      validate: v => v.is('album', 'track'),
      default: 'track',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('albumSidebar.groupBox', boxCapsule => {
      const collapse =
        slots.mode === 'track' ||
        data.collapse;

      return relations.box.slots({
        attributes: {class: 'individual-group-sidebar-box'},
        color: (collapse ? data.color : null),
        collapse: collapse,
        collapseMemorableID: `${data.directory}-sidebar-group`,

        title:
          language.$(boxCapsule, 'title', {group: relations.groupLink}),

        content: [
          relations.description.slot('mode', 'multiline'),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('releaseInfo.visitOn', {
              [language.onlyIfOptions]: ['links'],

              links:
                language.formatDisjunctionList(
                  relations.externalLinks
                    .map(link => link.slot('context', 'group'))),
            })),

          relations.nextThingLink &&
            html.tag('p', {class: 'group-chronology-link'},
              language.$(boxCapsule, 'next', {
                release:
                  relations.nextThingLink.slot('showNameDetail', 'accent'),
              })),

          relations.previousThingLink &&
            html.tag('p', {class: 'group-chronology-link'},
              language.$(boxCapsule, 'previous', {
                release:
                  relations.previousThingLink.slot('showNameDetail', 'accent'),
              })),
        ],
      });
    }),
};
