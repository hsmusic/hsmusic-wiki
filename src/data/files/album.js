import * as path from 'node:path';

import {traverse} from '#node-utils';
import {sortAlbumsTracksChronologically, sortChronologically} from '#sort';
import {empty} from '#sugar';
import Thing from '#thing';

export default ({
  documentModes: {headerAndEntries},
  thingConstructors: {
    Album,
    Track,
    TrackSection,

    AsideTrackSection,
    CloseAsideTrackSection,
  },
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
   : 'Aside Section' in document
      ? AsideTrackSection
   : 'Close Aside Section' in document
      ? CloseAsideTrackSection
      : Track),

  connect({header: album, entries}) {
    const trackSections = [];

    let currentTrackSection = new TrackSection();
    let currentTrackSectionTracks = [];

    let latestNonAsideTrackSection = currentTrackSection;

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

        if (entry.style !== 'aside') {
          latestNonAsideTrackSection = entry;
        }

        continue;
      }

      if (entry instanceof CloseAsideTrackSection) {
        if (currentTrackSection.style !== 'aside') {
          throw new Error(`Current track section "${currentTrackSection.name}" is not an aside`);
        }

        if (entry.name !== currentTrackSection.name) {
          throw new Error(`Expected "Close Aside Section: ${currentTrackSection.name}", got "${entry.name}"`);
        }

        closeCurrentTrackSection();
        currentTrackSection = Thing.clone(latestNonAsideTrackSection);
        currentTrackSection.tracks = [];
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
