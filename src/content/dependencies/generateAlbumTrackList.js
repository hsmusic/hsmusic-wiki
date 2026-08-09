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

        relations.trackSectionDescriptions =
          album.trackSections.map(section =>
            relation('transformContent', section.description));

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
    data.albumHasTrackNumbers = album.hasTrackNumbers;

    switch (query.displayMode) {
      case 'trackSections':
        data.trackSectionNames =
          album.trackSections
            .map(section =>
              (section.isDefaultTrackSection
                ? null
                : section.name));

        data.trackSectionStyles =
          album.trackSections
            .map(section => section.style);

        data.trackSectionDurations =
          album.trackSections
            .map(section =>
              (section.hideDuration
                ? null
                : accumulateSum(section.tracks, track => track.duration)));

        data.trackSectionDurationsApproximate =
          album.trackSections
            .map(section => section.tracks.length > 1);

        data.trackSectionsHaveTrackNumbers =
          album.trackSections
            .map(section => section.hasTrackNumbers);

        data.trackSectionsStartCountingFrom =
          album.trackSections
            .map(section =>
              (section.hasTrackNumbers
                ? section.startCountingFrom
                : null));

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
            description: relations.trackSectionDescriptions,
            items: relations.trackSectionItems,

            name: data.trackSectionNames,
            style: data.trackSectionStyles,
            duration: data.trackSectionDurations,
            durationApproximate: data.trackSectionDurationsApproximate,
            hasTrackNumbers: data.trackSectionsHaveTrackNumbers,
            startCountingFrom: data.trackSectionsStartCountingFrom,
          }).map(({
              heading,
              description,
              items,

              name,
              style,
              duration,
              durationApproximate,
              hasTrackNumbers,
              startCountingFrom,
            }) => [
              language.encapsulate('trackList.section', capsule =>
                heading.slots({
                  tag: 'dt',

                  attributes: [
                    style === 'aside' &&
                      {class: 'aside'},
                  ],

                  title:
                    language.encapsulate(capsule, workingCapsule => {
                      const workingOptions = {
                        [language.onlyIfOptions]: ['section'],
                        section: name,
                      };

                      if (html.isBlank(name)) {
                        return html.blank();
                      }

                      if (duration) {
                        workingCapsule += '.withDuration';
                        workingOptions.duration =
                          language.formatDuration(duration, {
                            approximate: durationApproximate,
                          });
                      }

                      return language.$(workingCapsule, workingOptions);
                    }),

                  stickyTitle:
                    language.$(capsule, 'sticky', {
                      [language.onlyIfOptions]: ['section'],
                      section: name,
                    }),
                })),

              html.tag('dd',
                style === 'aside' &&
                  {class: 'aside'},

                html.tag('blockquote',
                  {[html.onlyIfContent]: true},
                  description),

                (hasTrackNumbers
                  ? html.tag('ol', {start: startCountingFrom},
                      slotItems(items))
                  : html.tag('ul', slotItems(items)))),
            ]));

      case 'tracks':
        if (data.albumHasTrackNumbers) {
          return html.tag('ol', slotItems(relations.items));
        } else {
          return html.tag('ul', slotItems(relations.items));
        }

      default:
        return html.blank();
    }
  }
};
