import {accumulateSum, empty} from '../../util/sugar.js';

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
  contentDependencies: [
    'generateAlbumTrackListItem',
  ],

  extraDependencies: [
    'html',
    'language',
  ],

  relations(relation, album) {
    const relations = {};

    const displayMode = getDisplayMode(album);

    if (displayMode === 'trackSections') {
      relations.itemsByTrackSection =
        album.trackSections.map(section =>
          section.tracks.map(track =>
            relation('generateAlbumTrackListItem', track, album)));
    }

    if (displayMode === 'tracks') {
      relations.itemsByTrack =
        album.tracks.map(track =>
          relation('generateAlbumTrackListItem', track, album));
    }

    return relations;
  },

  data(album) {
    const data = {};

    data.hasTrackNumbers = album.hasTrackNumbers;

    if (displayTrackSections && !empty(album.trackSections)) {
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
    }

    return data;
  },

  generate(data, relations, {
    html,
    language,
  }) {
    const listTag = (data.hasTrackNumbers ? 'ol' : 'ul');

    if (relations.itemsByTrackSection) {
      return html.tag('dl',
        {class: 'album-group-list'},
        data.trackSectionInfo.map((info, index) => [
          html.tag('dt',
            {class: 'content-heading', tabindex: '0'},
            language.$('trackList.section.withDuration', {
              section: info.name,
              duration:
                language.formatDuration(info.duration, {
                  approximate: info.durationApproximate,
                }),
            })),

          html.tag('dd',
            html.tag(listTag,
              data.hasTrackNumbers ? {start: info.startIndex + 1} : {},
              relations.itemsByTrackSection[index])),
        ]));
    }

    if (relations.itemsByTrack) {
      return html.tag(listTag, relations.itemsByTrack);
    }

    return html.blank();
  }
};
