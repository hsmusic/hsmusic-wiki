import {accumulateSum, empty, stitchArrays} from '#sugar';

function displayTrackSections(album) {
  if (empty(album.trackSections)) {
    return false;
  }

  if (album.trackSections.length > 1) {
    return true;
  }

  if (!album.trackSections[0].isDefaultTrackSection) {
    return true;
  }

  return false;
}

function displayTracks(album) {
  if (empty(album.tracks)) {
    return false;
  }

  return true;
}

function getDisplayMode(album) {
  if (displayTrackSections(album)) {
    return 'trackSections';
  } else if (displayTracks(album)) {
    return 'tracks';
  } else {
    return 'none';
  }
}

export default {
  contentDependencies: ['generateAlbumTrackListItem', 'generateContentHeading'],
  extraDependencies: ['html', 'language'],

  query(album) {
    return {
      displayMode: getDisplayMode(album),
    };
  },

  relations(relation, query, album) {
    const relations = {};

    switch (query.displayMode) {
      case 'trackSections':
        relations.trackSectionHeadings =
          album.trackSections.map(() =>
            relation('generateContentHeading'));

        relations.trackSectionItems =
          album.trackSections.map(section =>
            section.tracks.map(track =>
              relation('generateAlbumTrackListItem', track, album)));

        break;

      case 'tracks':
        relations.items =
          album.tracks.map(track =>
            relation('generateAlbumTrackListItem', track, album));

        break;
    }

    return relations;
  },

  data(query, album) {
    const data = {};

    data.displayMode = query.displayMode;
    data.hasTrackNumbers = album.hasTrackNumbers;

    switch (query.displayMode) {
      case 'trackSections':
        data.trackSectionNames =
          album.trackSections
            .map(section => section.name);

        data.trackSectionDurations =
          album.trackSections
            .map(section =>
              accumulateSum(section.tracks, track => track.duration));

        data.trackSectionDurationsApproximate =
          album.trackSections
            .map(section => section.tracks.length > 1);

        if (album.hasTrackNumbers) {
          data.trackSectionStartIndices =
            album.trackSections
              .map(section => section.startIndex);
        } else {
          data.trackSectionStartIndices =
            album.trackSections
              .map(() => null);
        }

        break;
    }

    return data;
  },

  slots: {
    collapseDurationScope: {
      validate: v =>
        v.is('never', 'track', 'section', 'album'),

      default: 'album',
    },
  },

  generate(data, relations, slots, {html, language}) {
    const listTag = (data.hasTrackNumbers ? 'ol' : 'ul');

    const slotItems = items =>
      items.map(item =>
        item.slots({
          collapseDurationScope:
            slots.collapseDurationScope,
        }));

    switch (data.displayMode) {
      case 'trackSections':
        return html.tag('dl', {class: 'album-group-list'},
          stitchArrays({
            heading: relations.trackSectionHeadings,
            items: relations.trackSectionItems,

            name: data.trackSectionNames,
            duration: data.trackSectionDurations,
            durationApproximate: data.trackSectionDurationsApproximate,
            startIndex: data.trackSectionStartIndices,
          }).map(({
              heading,
              items,

              name,
              duration,
              durationApproximate,
              startIndex,
            }) => [
              language.encapsulate('trackList.section', capsule =>
                heading.slots({
                  tag: 'dt',

                  title:
                    language.encapsulate(capsule, capsule => {
                      const options = {section: name};

                      if (duration !== 0) {
                        capsule += '.withDuration';
                        options.duration =
                          language.formatDuration(duration, {
                            approximate: durationApproximate,
                          });
                      }

                      return language.$(capsule, options);
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky', {
                      section: name,
                    }),
                })),

              html.tag('dd',
                html.tag(listTag,
                  data.hasTrackNumbers &&
                    {start: startIndex + 1},

                  slotItems(items))),
            ]));

      case 'tracks':
        return html.tag(listTag, slotItems(relations.items));

      default:
        return html.blank();
    }
  }
};
