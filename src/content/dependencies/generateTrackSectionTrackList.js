import {atOffset, stitchArrays} from '#sugar';

export default {
  // Albums always have track sections, so this is called with the default
  // track section (even on albums whose only section is that section - i.e,
  // using a "flat" presentation).

  relations: (relation, section) => ({
    items:
      section.tracks
        .map(track =>
          relation('generateAlbumTrackListItem', track, section.album)),
  }),

  data: (section) => ({
    hasTrackNumbers:
      section.hasTrackNumbers,

    startCountingFrom:
      section.startCountingFrom,

    trackNumbers:
      section.tracks
        .map(track => track.trackNumber),
  }),

  slots: {
    showArtists: {type: 'boolean', default: false},
    showDuration: {type: 'boolean', default: false},

    collapseDurationScope: {
      validate: v => v.is('never', 'track', 'section', 'album'),
      default: 'album',
    },

    itemAttributes: {
      validate: v => v.sparseArrayOf(v.isAttributes),
    },

    linkSlots: {
      validate: v =>
        v.sparseArrayOf(
          v.validateProperties({
            anchor: v.optional(v.isBoolean),
            linkless: v.optional(v.isBoolean),
            hash: v.optional(v.isString),
          }))
    },
  },

  generate(data, relations, slots, {html}) {
    const items =
      stitchArrays({
        item: relations.items,
        trackNumber: data.trackNumbers,

        attributes: slots.itemAttributes ?? relations.items.map(() => null),
        linkSlots: slots.linkSlots ?? relations.items.map(() => null),
      }).map(({item, trackNumber, attributes, linkSlots}, index) => {
          item.setSlots({
            attributes: attributes,
            collapseDurationScope: slots.collapseDurationScope,

            anchor: linkSlots?.anchor ?? null,
            linkless: linkSlots?.linkless ?? null,
            hash: linkSlots?.hash ?? null,

            showArtists: slots.showArtists,
            showDuration: slots.showDuration,
          });

          if (data.hasTrackNumbers) {
            if (index === 0) {
              if (trackNumber !== data.startCountingFrom) {
                item.setSlot('setTrackNumberAttribute', true);
              }
            } else {
              if (trackNumber !== atOffset(data.trackNumbers, index, -1) + 1) {
                item.setSlot('setTrackNumberAttribute', true);
              }
            }
          }

          return item;
        });

    const list =
      (data.hasTrackNumbers
        ? html.tag('ol', {class: 'album-track-list'},
            {start: data.startCountingFrom},
            items)
        : html.tag('ul', {class: 'album-track-list'},
            items));

    return list;
  },
};
