import {showAggregate} from '#aggregate';
import {empty} from '#sugar';
import {getTotalDuration} from '#wiki-data';

const listingSpec = [];

listingSpec.push({
  directory: 'albums/by-name',
  stringsKey: 'listAlbums.byName',
  contentFunction: 'listAlbumsByName',

  condition: ({albumData}) =>
    albumData.some(() => true),

  seeAlso: [
    'tracks/by-album',
  ],
});

listingSpec.push({
  directory: 'albums/by-tracks',
  stringsKey: 'listAlbums.byTracks',
  contentFunction: 'listAlbumsByTracks',

  condition: ({albumData}) =>
    albumData.some(album => !empty(album.tracks)),
});

listingSpec.push({
  directory: 'albums/by-duration',
  stringsKey: 'listAlbums.byDuration',
  contentFunction: 'listAlbumsByDuration',

  condition: ({albumData}) =>
    albumData.some(album => getTotalDuration(album.tracks)),
});

listingSpec.push({
  directory: 'albums/by-date',
  stringsKey: 'listAlbums.byDate',
  contentFunction: 'listAlbumsByDate',

  condition: ({albumData}) =>
    albumData.some(album => album.date),

  seeAlso: [
    'tracks/by-date',
  ],
});

listingSpec.push({
  directory: 'albums/by-date-added',
  stringsKey: 'listAlbums.byDateAdded',
  contentFunction: 'listAlbumsByDateAdded',

  condition: ({albumData}) =>
    albumData.some(album => album.dateAddedToWiki),
});

listingSpec.push({
  directory: 'artists/by-name',
  stringsKey: 'listArtists.byName',
  contentFunction: 'listArtistsByName',
  seeAlso: ['artists/by-contribs', 'artists/by-group'],

  condition: ({artistData}) =>
    Iterator.from(artistData)
      .filter(artist => !artist.isAlias)
      .some(() => true),
});

listingSpec.push({
  directory: 'artists/by-contribs',
  stringsKey: 'listArtists.byContribs',
  contentFunction: 'listArtistsByContributions',
  seeAlso: ['artists/by-name', 'artists/by-group'],

  condition: ({artistData, wikiInfo}) =>
    Iterator.from(artistData)
      .filter(artist => !artist.isAlias)
      .some(artist =>
        !empty(artist.musicContributions) ||
        !empty(artist.artworkContributions) ||
        wikiInfo.enableFlashesAndGames &&
          !empty(artist.flashContributorContributions)),
});

listingSpec.push({
  directory: 'artists/by-commentary',
  stringsKey: 'listArtists.byCommentary',
  contentFunction: 'listArtistsByCommentaryEntries',

  condition: ({artistData}) =>
    Iterator.from(artistData)
      .filter(artist => !artist.isAlias)
      .some(artist =>
        !empty(artist.tracksAsCommentator) ||
        !empty(artist.albumsAsCommentator)),
});

listingSpec.push({
  directory: 'artists/by-duration',
  stringsKey: 'listArtists.byDuration',
  contentFunction: 'listArtistsByDuration',

  condition: ({artistData}) =>
    Iterator.from(artistData)
      .filter(artist => !artist.isAlias)
      .some(artist => artist.totalDuration),
});

listingSpec.push({
  directory: 'artists/by-group',
  stringsKey: 'listArtists.byGroup',
  contentFunction: 'listArtistsByGroup',
  seeAlso: ['artists/by-name', 'artists/by-contribs'],

  // TODO: This is a crude approximation, since it doesn't check if artists'
  // contributions ever actually end up in any of these groups.
  condition: ({artistData, wikiInfo}) =>
    wikiInfo.enableGroupUI &&
    !empty(wikiInfo.divideTrackListsByGroups) &&
    !empty(artistData),
});

listingSpec.push({
  directory: 'artists/by-latest',
  stringsKey: 'listArtists.byLatest',
  contentFunction: 'listArtistsByLatestContribution',

  condition: ({artistData, wikiInfo}) =>
    Iterator.from(artistData)
      .filter(artist => !artist.isAlias)
      .flatMap(artist => [
        // yes I know these should be iterator objects lol
        ...artist.musicContributions,
        ...artist.artworkContributions,
        ...(wikiInfo.enableFlashesAndGames ? artist.flashContributorContributions : [])
      ])
      .some(contrib => contrib.date)
});

listingSpec.push({
  directory: 'groups/by-name',
  stringsKey: 'listGroups.byName',
  contentFunction: 'listGroupsByName',

  condition: ({groupData, wikiInfo}) =>
    wikiInfo.enableGroupUI &&
    groupData.some(group => true),
});

listingSpec.push({
  directory: 'groups/by-category',
  stringsKey: 'listGroups.byCategory',
  contentFunction: 'listGroupsByCategory',

  condition: ({groupData, wikiInfo}) =>
    wikiInfo.enableGroupUI &&
    groupData.some(group => group.category),
});

listingSpec.push({
  directory: 'groups/by-albums',
  stringsKey: 'listGroups.byAlbums',
  contentFunction: 'listGroupsByAlbums',

  condition: ({groupData, wikiInfo}) =>
    wikiInfo.enableGroupUI &&
    groupData.some(group => !empty(group.albums)),
});

listingSpec.push({
  directory: 'groups/by-tracks',
  stringsKey: 'listGroups.byTracks',
  contentFunction: 'listGroupsByTracks',

  condition: ({groupData, wikiInfo}) =>
    wikiInfo.enableGroupUI &&
    Iterator.from(groupData)
      .flatMap(group => group.albums)
      .some(album => !empty(album.tracks)),
});

listingSpec.push({
  directory: 'groups/by-duration',
  stringsKey: 'listGroups.byDuration',
  contentFunction: 'listGroupsByDuration',

  condition: ({groupData, wikiInfo}) =>
    wikiInfo.enableGroupUI &&
    Iterator.from(groupData)
      .flatMap(group => group.albums)
      .some(album => getTotalDuration(album.tracks)),
});

listingSpec.push({
  directory: 'groups/by-latest-album',
  stringsKey: 'listGroups.byLatest',
  contentFunction: 'listGroupsByLatestAlbum',

  condition: ({groupData, wikiInfo}) =>
    wikiInfo.enableGroupUI &&
    Iterator.from(groupData)
      .flatMap(group => group.albums)
      .some(album => album.date),
});

listingSpec.push({
  directory: 'motifs/by-name',
  stringsKey: 'listMotifs.byName',
  contentFunction: 'listMotifsByName',

  condition: ({motifData}) =>
    motifData.some(motif => true),
});

listingSpec.push({
  directory: 'motifs/by-uses',
  stringsKey: 'listMotifs.byUses',
  contentFunction: 'listMotifsByUses',

  condition: ({motifData}) =>
    motifData.some(motif => !empty(motif.featuredInTracks)),
});

listingSpec.push({
  directory: 'motifs/by-group',
  stringsKey: 'listMotifs.byGroup',
  contentFunction: 'listMotifsByGroup',

  // TODO: Same as artists/by-group. This is a crude approximation, since it
  // doesn't check if motifs are actually used in any of these groups.
  condition: ({motifData, wikiInfo}) =>
    wikiInfo.enableGroupUI &&
    !empty(wikiInfo.divideTrackListsByGroups) &&
    !empty(motifData),
});

listingSpec.push({
  directory: 'tracks/by-name',
  stringsKey: 'listTracks.byName',
  contentFunction: 'listTracksByName',

  condition: ({trackData}) =>
    trackData.some(() => true),
});

listingSpec.push({
  directory: 'tracks/by-album',
  stringsKey: 'listTracks.byAlbum',
  contentFunction: 'listTracksByAlbum',

  condition: ({trackData}) =>
    trackData.some(track => track.album),
});

listingSpec.push({
  directory: 'tracks/by-date',
  stringsKey: 'listTracks.byDate',
  contentFunction: 'listTracksByDate',

  condition: ({trackData}) =>
    trackData.some(track => track.date),
});

listingSpec.push({
  directory: 'tracks/by-duration',
  stringsKey: 'listTracks.byDuration',
  contentFunction: 'listTracksByDuration',

  condition: ({trackData}) =>
    trackData.some(track => track.duration),
});

listingSpec.push({
  directory: 'tracks/by-duration-in-album',
  stringsKey: 'listTracks.byDurationInAlbum',
  contentFunction: 'listTracksByDurationInAlbum',

  condition: ({trackData}) =>
    // rocket science
    trackData.some(track => track.duration && track.album),
});

listingSpec.push({
  directory: 'tracks/by-times-referenced',
  stringsKey: 'listTracks.byTimesReferenced',
  contentFunction: 'listTracksByTimesReferenced',

  condition: ({trackData}) =>
    trackData.some(track => !empty(track.referencedByTracks)),
});

listingSpec.push({
  directory: 'tracks/in-flashes/by-album',
  stringsKey: 'listTracks.inFlashes.byAlbum',
  contentFunction: 'listTracksInFlashesByAlbum',

  condition: ({trackData, wikiInfo}) =>
    wikiInfo.enableFlashesAndGames &&
    trackData.some(track => !empty(track.ownFeaturedInFlashes) && track.album),
});

listingSpec.push({
  directory: 'tracks/in-flashes/by-flash',
  stringsKey: 'listTracks.inFlashes.byFlash',
  contentFunction: 'listTracksInFlashesByFlash',

  condition: ({trackData, wikiInfo}) =>
    wikiInfo.enableFlashesAndGames &&
    trackData.some(track => !empty(track.ownFeaturedInFlashes)),
});

listingSpec.push({
  directory: 'tracks/with-lyrics',
  stringsKey: 'listTracks.withLyrics',
  contentFunction: 'listTracksWithLyrics',
  seeAlso: ['tracks/needing-lyrics', 'tracks/with-music-videos'],

  condition: ({trackData}) =>
    trackData.some(track => !empty(track.lyrics)),
});

listingSpec.push({
  directory: 'tracks/with-music-videos',
  stringsKey: 'listTracks.withMusicVideos',
  contentFunction: 'listTracksWithMusicVideos',
  seeAlso: ['tracks/with-lyrics'],

  condition: ({trackData}) =>
    trackData.some(track => !empty(track.musicVideos)),
});

listingSpec.push({
  directory: 'tracks/with-sheet-music-files',
  stringsKey: 'listTracks.withSheetMusicFiles',
  contentFunction: 'listTracksWithSheetMusicFiles',
  seeAlso: ['all-sheet-music-files'],

  condition: ({trackData}) =>
    trackData.some(track => !empty(track.sheetMusicFiles)),
});

listingSpec.push({
  directory: 'tracks/with-midi-project-files',
  stringsKey: 'listTracks.withMidiProjectFiles',
  contentFunction: 'listTracksWithMidiProjectFiles',
  seeAlso: ['all-midi-project-files'],

  condition: ({trackData}) =>
    trackData.some(track => !empty(track.midiProjectFiles)),
});

listingSpec.push({
  directory: 'tracks/needing-lyrics',
  stringsKey: 'listTracks.needingLyrics',
  contentFunction: 'listTracksNeedingLyrics',
  seeAlso: ['tracks/with-lyrics'],

  condition: ({trackData}) =>
    trackData.some(track => track.needsLyrics),
});

listingSpec.push({
  directory: 'tags/by-name',
  stringsKey: 'listArtTags.byName',
  contentFunction: 'listArtTagsByName',

  condition: ({artTagData, wikiInfo}) =>
    wikiInfo.enableArtTagUI &&
    Iterator.from(artTagData)
      .filter(artTag => !artTag.isContentWarning)
      .some(() => true),
});

listingSpec.push({
  directory: 'tags/by-uses',
  stringsKey: 'listArtTags.byUses',
  contentFunction: 'listArtTagsByUses',

  condition: ({artTagData, wikiInfo}) =>
    wikiInfo.enableArtTagUI &&
    Iterator.from(artTagData)
      .filter(artTag => !artTag.isContentWarning)
      .some(artTag => !empty(artTag.directlyFeaturedInArtworks)),
});

listingSpec.push({
  directory: 'tags/network',
  stringsKey: 'listArtTags.network',
  contentFunction: 'listArtTagNetwork',

  condition: ({artTagData, wikiInfo}) =>
    wikiInfo.enableArtTagUI &&
    Iterator.from(artTagData)
      .filter(artTag => !artTag.isContentWarning)
      .some(artTag => !empty(artTag.directDescendantArtTags)),
});

listingSpec.push({
  directory: 'all-sheet-music-files',
  stringsKey: 'other.allSheetMusic',
  contentFunction: 'listAllSheetMusicFiles',
  seeAlso: ['tracks/with-sheet-music-files'],
  groupUnderOther: true,

  condition: ({sheetMusicFileData}) =>
    sheetMusicFileData.some(() => true),
});

listingSpec.push({
  directory: 'all-midi-project-files',
  stringsKey: 'other.allMidiProjectFiles',
  contentFunction: 'listAllMidiProjectFiles',
  seeAlso: ['tracks/with-midi-project-files'],
  groupUnderOther: true,

  condition: ({midiProjectFileData}) =>
    midiProjectFileData.some(() => true),
});

listingSpec.push({
  directory: 'all-additional-files',
  stringsKey: 'other.allAdditionalFiles',
  contentFunction: 'listAllAdditionalFiles',
  groupUnderOther: true,

  condition: ({miscellaneousAdditionalFileData}) =>
    miscellaneousAdditionalFileData
      .some(({thing}) => thing.isAlbum || thing.isTrack),
});

listingSpec.push({
  directory: 'random',
  stringsKey: 'other.randomPages',
  contentFunction: 'listRandomPageLinks',
  groupUnderOther: true,
});

// Dunkass mock. Listings should be Things! In the fuuuuture!
class Listing {
  static properties = {};

  constructor() {
    Object.assign(this, this.constructor.properties);
  }

  static hasPropertyDescriptor(key) {
    return Object.hasOwn(this.properties, key);
  }
}

for (const [index, listing] of listingSpec.entries()) {
  class ListingSubclass extends Listing {
    static properties = listing;
  }

  listingSpec.splice(index, 1, new ListingSubclass);
}

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
      listing.seeAlso = [];
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
    stringsKey: 'motif',
    listings: filterListings('motif'),
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
