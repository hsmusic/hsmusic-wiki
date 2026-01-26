import * as path from 'node:path';

import {traverse} from '#node-utils';
import {sortAlbumsTracksChronologically, sortChronologically} from '#sort';
import {empty} from '#sugar';

export default ({
  documentModes: {headerAndEntries},
  thingConstructors: {Album, Track, TrackSection},
}) => ({
  title: `Process album files`,

  files: dataPath =>
    traverse(path.join(dataPath, 'album'), {
      filterFile: name => path.extname(name) === '.yaml',
      prefixPath: 'album',
    }),

  documentMode: headerAndEntries,
  headerDocumentThing: Album,
  entryDocumentThing: document =>
    ('Section' in document
      ? TrackSection
      : Track),

  connect({header: album, entries}) {
    const trackSections = [];

    let currentTrackSection = new TrackSection();
    let currentTrackSectionTracks = [];

    Object.assign(currentTrackSection, {
      name: `Default Track Section`,
      isDefaultTrackSection: true,
    });

    const closeCurrentTrackSection = () => {
      if (
        currentTrackSection.isDefaultTrackSection &&
        empty(currentTrackSectionTracks)
      ) {
        return;
      }

      currentTrackSection.tracks = currentTrackSectionTracks;
      currentTrackSection.album = album;

      trackSections.push(currentTrackSection);
    };

    for (const entry of entries) {
      if (entry instanceof TrackSection) {
        closeCurrentTrackSection();
        currentTrackSection = entry;
        currentTrackSectionTracks = [];
        continue;
      }

      entry.album = album;
      entry.trackSection = currentTrackSection;

      currentTrackSectionTracks.push(entry);
    }

    closeCurrentTrackSection();

    album.trackSections = trackSections;
  },

  sort({albumData, trackData}) {
    sortChronologically(albumData);
    sortAlbumsTracksChronologically(trackData);
  },
});
