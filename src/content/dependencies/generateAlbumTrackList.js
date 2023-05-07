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

  contracts: {
    length: {
      hook(contract, [array]) {
        contract.provide({
          length: contract.selectProperty(array, 'length'),
        });
      },

      compute({length}) {
        return length;
      },
    },

    isDefault: {
      hook(contract, [trackSection]) {
        contract.provide({
          isDefault: contract.selectProperty(trackSection, 'isDefaultTrackSection', false),
        });
      },

      compute({isDefault}) {
        return isDefault;
      },
    },

    firstIsDefault: {
      hook(contract, [trackSections]) {
        contract.provide({
          isDefault: contract.subcontract('#isDefault', contract.selectProperty(trackSections, '0')),
        });
      },

      compute({isDefault}) {
        return isDefault;
      },
    },

    displayTrackSections: {
      hook(contract, [album]) {
        contract.provide({
          numTrackSections: contract.subcontract('#length', contract.selectProperty(album, 'trackSections')),
          firstIsDefault: contract.subcontract('#firstIsDefault', contract.selectProperty(album, 'trackSections')),
        });
      },

      compute({numTrackSections, firstIsDefault}) {
        return numTrackSections >= 2 || firstIsDefault;
      },
    },

    displayTracks: {
      hook(contract, [album]) {
        contract.provide({
          numTracks: contract.subcontract('#length', contract.selectProperty(album, 'tracks')),
        });
      },

      compute({numTracks}) {
        return numTracks >= 1;
      },
    },

    displayMode: {
      hook(contract, [album]) {
        contract.provide({
          displayTrackSections: contract.subcontract('#displayTrackSections', album),
          displayTracks: contract.subcontract('#displayTracks', album),
        });
      },

      compute({displayTrackSections, displayTracks}) {
        if (displayTrackSections) {
          return 'trackSections';
        } else if (displayTracks) {
          return 'tracks';
        } else {
          return 'none';
        }
      },
    },

    relations: {
      hook(contract, [relation, album]) {
        contract.branch({
          subcontract: ['#displayMode', album],
          branches: {
            trackSections() {
              contract.provide({
                trackSections: contract.selectProperty(album, 'trackSections'),
              });
            },

            tracks() {
              contract.provide({
                tracks: contract.selectProperty(album, 'tracks'),
              });
            },
          },
        });
      },
    },
  },

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
            {class: 'content-heading'},
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
