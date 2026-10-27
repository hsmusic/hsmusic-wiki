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

      const currentIndex =
        (track && things.includes(track)
          ? things.indexOf(track)
          : things.indexOf(album));

      query.previousThing =
        atOffset(things, currentIndex, +1);

      query.nextThing =
        atOffset(things, currentIndex, -1);
    }

    return query;
  },

  relations(relation, query, _album, _track, group) {
    const relations = {};

    relations.box =
      relation('generatePageSidebarBox');

    relations.groupLink =
      relation('linkGroup', group);

    relations.externalLinks =
      group.urls
        .map(entry => relation('linkExternal', entry));

    if (group.descriptionShort) {
      relations.description =
        relation('transformContent', group.descriptionShort);
    }

    if (query.previousThing) {
      relations.previousThingLink =
        relation('linkAlbum', query.previousThing);
    }

    if (query.nextThing) {
      relations.nextThingLink =
        relation('linkAlbum', query.nextThing);
    }

    return relations;
  },

  data: (_query, _album, track, group) => ({
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
      const hsmusicLikeAnAlbum =
        slots.mode === 'album' ||
        data.groupDirectlyIncludesTrack;

      return relations.box.slots({
        attributes: {class: 'individual-group-sidebar-box'},
        content: [
          html.tag('h1',
            language.$(boxCapsule, 'title', {
              group: relations.groupLink,
            })),

          hsmusicLikeAnAlbum &&
            relations.description
              ?.slot('mode', 'multiline'),

          html.tag('p',
            {[html.onlyIfContent]: true},

            language.$('releaseInfo.visitOn', {
              [language.onlyIfOptions]: ['links'],

              links:
                language.formatDisjunctionList(
                  relations.externalLinks
                    .map(link => link.slot('context', 'group'))),
            })),

          hsmusicLikeAnAlbum &&
          relations.nextThingLink &&
            html.tag('p', {class: 'group-chronology-link'},
              language.$(boxCapsule, 'next', {
                release:
                  relations.nextThingLink.slot('showNameDetail', 'accent'),
              })),

          hsmusicLikeAnAlbum &&
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
