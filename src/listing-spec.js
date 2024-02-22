import {showAggregate} from '#aggregate';
import {empty} from '#sugar';

const listingSpec = [];

listingSpec.push({
  scope: 'wiki',
  directory: 'index',
  stringsKey: 'index',
  contentFunction: 'generateListingsIndexPage',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'albums/by-name',
  stringsKey: 'listAlbums.byName',
  contentFunction: 'listAlbumsByName',

  seeAlso: [
    'tracks/by-album',
  ],
});

listingSpec.push({
  scope: 'wiki',
  directory: 'albums/by-tracks',
  stringsKey: 'listAlbums.byTracks',
  contentFunction: 'listAlbumsByTracks',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'albums/by-duration',
  stringsKey: 'listAlbums.byDuration',
  contentFunction: 'listAlbumsByDuration',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'albums/by-date',
  stringsKey: 'listAlbums.byDate',
  contentFunction: 'listAlbumsByDate',

  seeAlso: [
    'tracks/by-date',
  ],
});

listingSpec.push({
  scope: 'wiki',
  directory: 'albums/by-date-added',
  stringsKey: 'listAlbums.byDateAdded',
  contentFunction: 'listAlbumsByDateAdded',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'artists/by-name',
  stringsKey: 'listArtists.byName',
  contentFunction: 'listArtistsByName',
  seeAlso: ['artists/by-contribs', 'artists/by-group'],
});

listingSpec.push({
  scope: 'wiki',
  directory: 'artists/by-contribs',
  stringsKey: 'listArtists.byContribs',
  contentFunction: 'listArtistsByContributions',
  seeAlso: ['artists/by-name', 'artists/by-group'],
});

listingSpec.push({
  scope: 'wiki',
  directory: 'artists/by-commentary',
  stringsKey: 'listArtists.byCommentary',
  contentFunction: 'listArtistsByCommentaryEntries',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'artists/by-duration',
  stringsKey: 'listArtists.byDuration',
  contentFunction: 'listArtistsByDuration',
});

// TODO: hide if divideTrackListsByGroups empty...
listingSpec.push({
  scope: 'wiki',
  directory: 'artists/by-group',
  stringsKey: 'listArtists.byGroup',
  contentFunction: 'listArtistsByGroup',
  featureFlag: 'enableGroupUI',
  seeAlso: ['artists/by-name', 'artists/by-contribs'],
});

listingSpec.push({
  scope: 'wiki',
  directory: 'artists/by-latest',
  stringsKey: 'listArtists.byLatest',
  contentFunction: 'listArtistsByLatestContribution',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'groups/by-name',
  stringsKey: 'listGroups.byName',
  contentFunction: 'listGroupsByName',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'groups/by-category',
  stringsKey: 'listGroups.byCategory',
  contentFunction: 'listGroupsByCategory',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'groups/by-albums',
  stringsKey: 'listGroups.byAlbums',
  contentFunction: 'listGroupsByAlbums',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'groups/by-tracks',
  stringsKey: 'listGroups.byTracks',
  contentFunction: 'listGroupsByTracks',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'groups/by-duration',
  stringsKey: 'listGroups.byDuration',
  contentFunction: 'listGroupsByDuration',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'groups/by-latest-album',
  stringsKey: 'listGroups.byLatest',
  contentFunction: 'listGroupsByLatestAlbum',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/by-name',
  stringsKey: 'listTracks.byName',
  contentFunction: 'listTracksByName',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/by-album',
  stringsKey: 'listTracks.byAlbum',
  contentFunction: 'listTracksByAlbum',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/by-date',
  stringsKey: 'listTracks.byDate',
  contentFunction: 'listTracksByDate',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/by-duration',
  stringsKey: 'listTracks.byDuration',
  contentFunction: 'listTracksByDuration',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/by-duration-in-album',
  stringsKey: 'listTracks.byDurationInAlbum',
  contentFunction: 'listTracksByDurationInAlbum',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/by-times-referenced',
  stringsKey: 'listTracks.byTimesReferenced',
  contentFunction: 'listTracksByTimesReferenced',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/in-flashes/by-album',
  stringsKey: 'listTracks.inFlashes.byAlbum',
  contentFunction: 'listTracksInFlashesByAlbum',
  featureFlag: 'enableFlashesAndGames',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/in-flashes/by-flash',
  stringsKey: 'listTracks.inFlashes.byFlash',
  contentFunction: 'listTracksInFlashesByFlash',
  featureFlag: 'enableFlashesAndGames',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/with-lyrics',
  stringsKey: 'listTracks.withLyrics',
  contentFunction: 'listTracksWithLyrics',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/with-sheet-music-files',
  stringsKey: 'listTracks.withSheetMusicFiles',
  contentFunction: 'listTracksWithSheetMusicFiles',
  seeAlso: ['all-sheet-music-files'],
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tracks/with-midi-project-files',
  stringsKey: 'listTracks.withMidiProjectFiles',
  contentFunction: 'listTracksWithMidiProjectFiles',
  seeAlso: ['all-midi-project-files'],
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tags/by-name',
  stringsKey: 'listTags.byName',
  contentFunction: 'listTagsByName',
  featureFlag: 'enableArtTagUI',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'tags/by-uses',
  stringsKey: 'listTags.byUses',
  contentFunction: 'listTagsByUses',
  featureFlag: 'enableArtTagUI',
});

listingSpec.push({
  scope: 'wiki',
  directory: 'all-sheet-music-files',
  stringsKey: 'other.allSheetMusic',
  contentFunction: 'listAllSheetMusicFiles',
  seeAlso: ['tracks/with-sheet-music-files'],
  groupUnderOther: true,
});

listingSpec.push({
  scope: 'wiki',
  directory: 'all-midi-project-files',
  stringsKey: 'other.allMidiProjectFiles',
  contentFunction: 'listAllMidiProjectFiles',
  seeAlso: ['tracks/with-midi-project-files'],
  groupUnderOther: true,
});

listingSpec.push({
  scope: 'wiki',
  directory: 'all-additional-files',
  stringsKey: 'other.allAdditionalFiles',
  contentFunction: 'listAllAdditionalFiles',
  groupUnderOther: true,
});

listingSpec.push({
  scope: 'wiki',
  directory: 'random',
  stringsKey: 'other.randomPages',
  contentFunction: 'listRandomPageLinks',
  groupUnderOther: true,
});

{
  const errors = [];

  for (const listing of listingSpec) {
    if (listing.seeAlso) {
      const suberrors = [];

      for (let i = 0; i < listing.seeAlso.length; i++) {
        const directory = listing.seeAlso[i];
        const match = listingSpec.find(listing => listing.directory === directory);

        if (match) {
          listing.seeAlso[i] = match;
        } else {
          listing.seeAlso[i] = null;
          suberrors.push(new Error(`(index: ${i}) Didn't find a listing matching ${directory}`))
        }
      }

      listing.seeAlso = listing.seeAlso.filter(Boolean);

      if (!empty(suberrors)) {
        errors.push(new AggregateError(suberrors, `Errors matching "see also" listings for ${listing.directory}`));
      }
    } else {
      listing.seeAlso = null;
    }
  }

  if (!empty(errors)) {
    const aggregate = new AggregateError(errors, `Errors validating listings`);
    showAggregate(aggregate, {showTraces: false});
  }
}

const filterListings = (directoryPrefix) =>
  listingSpec.filter(l => l.directory.startsWith(directoryPrefix));

const listingTargetSpec = [
  {
    stringsKey: 'album',
    listings: filterListings('album'),
  },
  {
    stringsKey: 'artist',
    listings: filterListings('artist'),
  },
  {
    stringsKey: 'group',
    listings: filterListings('group'),
  },
  {
    stringsKey: 'track',
    listings: filterListings('track'),
  },
  {
    stringsKey: 'tag',
    listings: filterListings('tag'),
  },
  {
    stringsKey: 'other',
    listings: listingSpec.filter(l => l.groupUnderOther),
  },
];

for (const target of listingTargetSpec) {
  for (const listing of target.listings) {
    listing.target = target;
  }
}

export {listingSpec, listingTargetSpec};
