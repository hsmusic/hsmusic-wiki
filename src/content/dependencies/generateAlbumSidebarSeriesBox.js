import {atOffset} from '#sugar';

export default {
  query(album, track, series) {
    const query = {};

    const things =
      series.things;

    const currentIndex =
      (track && things.includes(track)
        ? things.indexOf(track)
        : things.indexOf(album));

    query.previousThing =
      atOffset(things, currentIndex, -1);

    query.nextThing =
      atOffset(things, currentIndex, +1);

    return query;
  },

  relations: (relation, query, album, track, series) => ({
    box:
      relation('generatePageSidebarBox'),

    groupLink:
      relation('linkGroup', series.group),

    description:
      relation('transformContent', series.description),

    previousThingLink:
      (query.previousThing
        ? relation('linkAnythingMan', query.previousThing)
        : null),

    nextThingLink:
      (query.nextThing
        ? relation('linkAnythingMan', query.nextThing)
        : null),
  }),

  data: (_query, _album, track, series) => ({
    name:
      series.name,

    seriesDirectlyIncludesTrack:
      (track
        ? series.things.includes(track)
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
        data.seriesDirectlyIncludesTrack;

      return relations.box.slots({
        attributes: {class: 'individual-series-sidebar-box'},
        content: [
          html.tag('h1',
            language.$(boxCapsule, 'title', {
              group:
                relations.groupLink.slots({
                  attributes: {class: 'series'},
                  content: language.sanitize(data.name),
                }),
            })),

          hsmusicLikeAnAlbum &&
            relations.description.slot('mode', 'multiline'),

          hsmusicLikeAnAlbum &&
          relations.nextThingLink &&
            html.tag('p', {class: 'series-chronology-link'},
              language.$(boxCapsule, 'next', {
                release: relations.nextThingLink,
              })),

          hsmusicLikeAnAlbum &&
          relations.previousThingLink &&
            html.tag('p', {class: 'series-chronology-link'},
              language.$(boxCapsule, 'previous', {
                release: relations.previousThingLink,
              })),
        ],
      });
    }),
};
