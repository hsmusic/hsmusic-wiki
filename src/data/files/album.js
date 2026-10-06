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
    TrackSectionContinuation,
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

  *connect({header: album, entries}) {
    const trackSections = [];

    const defaultTrackSection = new TrackSection();

    Object.assign(defaultTrackSection, {
      name: `Default Track Section`,
      isDefaultTrackSection: true,
    });

    let currentTrackSection = null;
    let currentTrackSectionTracks = null;

    let latestNonContinuationTrackSection = null;

    const leadingContinuationTrackSections = [];

    const closeCurrentTrackSection = function*() {
      if (!currentTrackSection) {
        return;
      }

      yield currentTrackSection;

      currentTrackSection.tracks = currentTrackSectionTracks;
      currentTrackSection.album = album;

      trackSections.push(currentTrackSection);
    };

    const attachLeadingTrackSections = stem => {
      // Aside track sections (or continuations in general) placed at
      // the front of an album stem from the first non-continuation
      // track section, even though that section is ahead of them.
      for (const section of leadingContinuationTrackSections) {
        section.stem = stem;
      }
    };

    for (const entry of entries) {
      if (entry instanceof TrackSection) {
        yield* closeCurrentTrackSection();

        if (entry.isTrackSectionContinuation || entry.isAsideTrackSection) {
          if (latestNonContinuationTrackSection) {
            entry.stem = latestNonContinuationTrackSection;
          } else {
            leadingContinuationTrackSections.push(entry);
          }
        } else {
          if (latestNonContinuationTrackSection) {
            latestNonContinuationTrackSection = entry;
          } else {
            attachLeadingTrackSections(entry);
            latestNonContinuationTrackSection = entry;
          }
        }

        currentTrackSection = entry;
        currentTrackSectionTracks = [];

        continue;
      }

      if (entry instanceof CloseAsideTrackSection) {
        if (!currentTrackSection.isAsideTrackSection) {
          throw new Error(`Current track section "${currentTrackSection.name}" is not an aside`);
        }

        if (entry.name !== currentTrackSection.name) {
          throw new Error(`Expected "Close Aside Section: ${currentTrackSection.name}", got "${entry.name}"`);
        }

        yield* closeCurrentTrackSection();

        currentTrackSection = null;
        currentTrackSectionTracks = null;

        continue;
      }

      if (entry instanceof Track) {
        if (!currentTrackSection) {
          if (latestNonContinuationTrackSection) {
            currentTrackSection = new TrackSectionContinuation();
            currentTrackSection.stem = latestNonContinuationTrackSection;
            currentTrackSectionTracks = [];
          } else {
            attachLeadingTrackSections(defaultTrackSection);
            latestNonContinuationTrackSection = defaultTrackSection;
            currentTrackSection = defaultTrackSection;
            currentTrackSectionTracks = [];
          }
        }

        entry.album = album;
        entry.trackSection = currentTrackSection;

        currentTrackSectionTracks.push(entry);

        continue;
      }

      throw new Error(`Unrecognized entry class "${entry.constructor.name}"`);
    }

    yield* closeCurrentTrackSection();

    album.trackSections = trackSections;
  },

  sort({albumData, trackData}) {
    sortChronologically(albumData);
    sortAlbumsTracksChronologically(trackData);
  },
});
