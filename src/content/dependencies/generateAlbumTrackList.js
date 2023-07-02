import {accumulateSum, empty, stitchArrays} from '../../util/sugar.js';

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

        relations.itemsByTrackSection =
          album.trackSections.map(section =>
            section.tracks.map(track =>
              relation('generateAlbumTrackListItem', track, album)));

        break;

      case 'tracks':
        relations.itemsByTrack =
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
        data.trackSectionInfo =
          album.trackSections.map(section => {
            const info = {};

            info.name = section.name;
            info.duration = accumulateSum(section.tracks, track => track.duration);
            info.durationApproximate = section.tracks.length > 1;

            if (album.hasTrackNumbers) {
              info.startIndex = section.startIndex;
            }

            return info;
          });
        break;
    }

    return data;
  },

  generate(data, relations, {html, language}) {
    const listTag = (data.hasTrackNumbers ? 'ol' : 'ul');

    switch (data.displayMode) {
      case 'trackSections':
        return html.tag('dl', {class: 'album-group-list'},
          stitchArrays({
            heading: relations.trackSectionHeadings,
            items: relations.itemsByTrackSection,
            info: data.trackSectionInfo,
          }).map(({heading, items, info}) => [
              heading.slots({
                tag: 'dt',
                title:
                  language.$('trackList.section.withDuration', {
                    section: info.name,
                    duration:
                      language.formatDuration(info.duration, {
                        approximate: info.durationApproximate,
                      }),
                  }),
              }),

              html.tag('dd',
                html.tag(listTag,
                  data.hasTrackNumbers ? {start: info.startIndex + 1} : {},
                  items)),
            ]));

      case 'tracks':
        return html.tag(listTag, relations.itemsByTrack);

      default:
        return html.blank();
    }
  }
};
