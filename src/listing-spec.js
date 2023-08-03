import {OFFICIAL_GROUP_DIRECTORY} from './util/magic-constants.js';

import {
  accumulateSum,
  empty,
  showAggregate,
} from './util/sugar.js';

import {
  chunkByProperties,
  getArtistNumContributions,
  getTotalDuration,
  sortAlphabetically,
  sortByDate,
  sortChronologically,
  sortFlashesChronologically,
} from './util/wiki-data.js';

const listingSpec = [];

listingSpec.push({
  directory: 'albums/by-name',
  stringsKey: 'listAlbums.byName',
  contentFunction: 'listAlbumsByName',

  seeAlso: [
    'tracks/by-album',
  ],
});

listingSpec.push({
  directory: 'albums/by-tracks',
  stringsKey: 'listAlbums.byTracks',
  contentFunction: 'listAlbumsByTracks',
});

listingSpec.push({
  directory: 'albums/by-duration',
  stringsKey: 'listAlbums.byDuration',
  contentFunction: 'listAlbumsByDuration',
});

listingSpec.push({
  directory: 'albums/by-date',
  stringsKey: 'listAlbums.byDate',
  contentFunction: 'listAlbumsByDate',

  seeAlso: [
    'tracks/by-date',
  ],
});

listingSpec.push({
  directory: 'albums/by-date-added',
  stringsKey: 'listAlbums.byDateAdded',
  contentFunction: 'listAlbumsByDateAdded',
});

listingSpec.push({
  directory: 'artists/by-name',
  stringsKey: 'listArtists.byName',
  contentFunction: 'listArtistsByName',
});

listingSpec.push({
  directory: 'artists/by-contribs',
  stringsKey: 'listArtists.byContribs',
  contentFunction: 'listArtistsByContributions',
});

listingSpec.push({
  directory: 'artists/by-commentary',
  stringsKey: 'listArtists.byCommentary',
  contentFunction: 'listArtistsByCommentaryEntries',
});

listingSpec.push({
  directory: 'artists/by-duration',
  stringsKey: 'listArtists.byDuration',
  contentFunction: 'listArtistsByDuration',
});

listingSpec.push({
  directory: 'artists/by-latest',
  stringsKey: 'listArtists.byLatest',
  contentFunction: 'listArtistsByLatestContribution',
});

listingSpec.push({
  directory: 'groups/by-name',
  stringsKey: 'listGroups.byName',
  contentFunction: 'listGroupsByName',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  directory: 'groups/by-category',
  stringsKey: 'listGroups.byCategory',
  contentFunction: 'listGroupsByCategory',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  directory: 'groups/by-albums',
  stringsKey: 'listGroups.byAlbums',
  contentFunction: 'listGroupsByAlbums',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  directory: 'groups/by-tracks',
  stringsKey: 'listGroups.byTracks',
  contentFunction: 'listGroupsByTracks',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  directory: 'groups/by-duration',
  stringsKey: 'listGroups.byDuration',
  contentFunction: 'listGroupsByDuration',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  directory: 'groups/by-latest-album',
  stringsKey: 'listGroups.byLatest',
  contentFunction: 'listGroupsByLatestAlbum',
  featureFlag: 'enableGroupUI',
});

listingSpec.push({
  directory: 'tracks/by-name',
  stringsKey: 'listTracks.byName',
  contentFunction: 'listTracksByName',
});

listingSpec.push({
  directory: 'tracks/by-album',
  stringsKey: 'listTracks.byAlbum',
  contentFunction: 'listTracksByAlbum',
});

listingSpec.push({
  directory: 'tracks/by-date',
  stringsKey: 'listTracks.byDate',
  contentFunction: 'listTracksByDate',
});

listingSpec.push({
  directory: 'tracks/by-duration',
  stringsKey: 'listTracks.byDuration',
  contentFunction: 'listTracksByDuration',
});

listingSpec.push({
  directory: 'tracks/by-duration-in-album',
  stringsKey: 'listTracks.byDurationInAlbum',
  contentFunction: 'listTracksByDurationInAlbum',
});

listingSpec.push({
  directory: 'tracks/by-times-referenced',
  stringsKey: 'listTracks.byTimesReferenced',
  contentFunction: 'listTracksByTimesReferenced',
});

listingSpec.push({
  directory: 'tracks/in-flashes/by-album',
  stringsKey: 'listTracks.inFlashes.byAlbum',
  contentFunction: 'listTracksInFlashesByAlbum',
  featureFlag: 'enableFlashesAndGames',
});

listingSpec.push({
  directory: 'tracks/in-flashes/by-flash',
  stringsKey: 'listTracks.inFlashes.byFlash',
  contentFunction: 'listTracksInFlashesByFlash',
  featureFlag: 'enableFlashesAndGames',
});

listingSpec.push({
  directory: 'tracks/with-lyrics',
  stringsKey: 'listTracks.withLyrics',
  contentFunction: 'listTracksWithLyrics',
});

listingSpec.push({
  directory: 'tracks/with-sheet-music-files',
  stringsKey: 'listTracks.withSheetMusicFiles',
  contentFunction: 'listTracksWithSheetMusicFiles',
  seeAlso: ['all-sheet-music-files'],
});

listingSpec.push({
  directory: 'tracks/with-midi-project-files',
  stringsKey: 'listTracks.withMidiProjectFiles',
  contentFunction: 'listTracksWithMidiProjectFiles',
  seeAlso: ['all-midi-project-files'],
});

listingSpec.push({
  directory: 'tags/by-name',
  stringsKey: 'listTags.byName',
  contentFunction: 'listTagsByName',
  featureFlag: 'enableArtTagUI',
});

listingSpec.push({
  directory: 'tags/by-uses',
  stringsKey: 'listTags.byUses',
  contentFunction: 'listTagsByUses',
  featureFlag: 'enableArtTagUI',
});

/*
function listAdditionalFilesInProperty(property, {
  directory,
  stringsKey,
  seeAlso,
}) {
  return {
    directory,
    stringsKey,
    seeAlso,
    groupUnderOther: true,

    data: ({wikiData: {albumData}}) =>
      albumData
        .map(album => ({
          album,
          tracks: album.tracks.filter(t => !empty(t[property])),
        }))
        .filter(({tracks}) => !empty(tracks)),

    html: (data, {
      html,
      language,
      link,
    }) =>
      data.flatMap(({album, tracks}) => [
        html.tag('h3', {class: 'content-heading'},
          link.album(album)),

        html.tag('dl', tracks.flatMap(track => [
          // No hash here since the full list of additional files is already visible
          // below. The track link serves more as a way to quickly recall the track or
          // to access listen links, all of which is positioned at the top of the page.
          html.tag('dt', link.track(track)),
          html.tag('dd',
            // This page doesn't really look better with color-coded file links.
            // Track links are still colored.
            html.tag('ul', track[property].map(({title, files}) =>
              html.tag('li',
                {class: [files.length > 1 && 'has-details']},
                (files.length === 1
                  ? link.albumAdditionalFile(
                      {album, file: files[0]},
                      {
                        text: language.$(`listingPage.${stringsKey}.file`, {title}),
                      })
                  : html.tag('details', [
                      html.tag('summary',
                        html.tag('span',
                          language.$(`listingPage.${stringsKey}.file.withMultipleFiles`, {
                            title: html.tag('span', {class: 'group-name'}, title),
                            files: language.countAdditionalFiles(files.length, {unit: true}),
                          }))),
                      html.tag('ul', files.map(file =>
                        html.tag('li',
                          link.albumAdditionalFile({album, file})))),
                    ])))))),
        ])),
      ]),
  };
}
*/

listingSpec.push({
  /* listAdditionalFilesInProperty('sheetMusicFiles') */
  directory: 'all-sheet-music-files',
  stringsKey: 'other.allSheetMusic',
  contentFunction: 'listAllSheetMusicFiles',
  seeAlso: ['tracks/with-sheet-music-files'],
  groupUnderOther: true,
});

listingSpec.push({
  /* listAdditionalFilesInProperty('midiProjectFiles') */
  directory: 'all-midi-project-files',
  stringsKey: 'other.allMidiProjectFiles',
  contentFunction: 'listAllMidiProjectFiles',
  seeAlso: ['tracks/with-midi-project-files'],
  groupUnderOther: true,
});

listingSpec.push({
  directory: 'random',
  stringsKey: 'other.randomPages',
  contentFunction: 'listRandomPageLinks',
  groupUnderOther: true,

  /*
  data: ({wikiData: {albumData}}) => [
    {
      name: 'Official',
      randomCode: 'official',
      albums: albumData
        .filter((album) => album.groups
          .some((group) => group.directory === OFFICIAL_GROUP_DIRECTORY)),
    },
    {
      name: 'Fandom',
      randomCode: 'fandom',
      albums: albumData
        .filter((album) => album.groups
          .every((group) => group.directory !== OFFICIAL_GROUP_DIRECTORY)),
    },
  ],

  html: (data, {getLinkThemeString, html}) =>
    html.fragment([
      html.tag('p',
        `Choose a link to go to a random page in that category or album! If your browser doesn't support relatively modern JavaScript or you've disabled it, these links won't work - sorry.`),

      html.tag('p',
        {class: 'js-hide-once-data'},
        `(Data files are downloading in the background! Please wait for data to load.)`),

      html.tag('p',
        {class: 'js-show-once-data'},
        `(Data files have finished being downloaded. The links should work!)`),

      html.tag('dl', [
        html.tag('dt',
          `Miscellaneous:`),

        html.tag('dd',
          html.tag('ul', [
            html.tag('li', [
              html.tag('a',
                {href: '#', 'data-random': 'artist'},
                `Random Artist`),
              '(' +
                html.tag('a',
                  {href: '#', 'data-random': 'artist-more-than-one-contrib'},
                  `&gt;1 contribution`) +
                ')',
            ]),

            html.tag('li',
              html.tag('a',
                {href: '#', 'data-random': 'album'},
                `Random Album (whole site)`)),

            html.tag('li',
              html.tag('a',
                {href: '#', 'data-random': 'track'},
                `Random Track (whole site)`)),
          ])),

        ...data.flatMap(({albums, name, randomCode}) => [
          html.tag('dt', [
            name + ':',
            '(' +
              html.tag('a',
                {href: '#', 'data-random': 'album-in-' + randomCode},
                `Random Album`) +
              ', ' +
              html.tag('a',
                {href: '#', 'data-random': 'track-in' + randomCode},
                'Random Track') +
              ')',
          ]),

          html.tag('dd',
            html.tag('ul',
              albums.map(album =>
                html.tag('li',
                  html.tag('a',
                    {
                      href: '#',
                      'data-random': 'track-in-album',
                      style: getLinkThemeString(album.color) +
                        `; --album-directory: ${album.directory}`,
                    },
                    album.name))))),
        ]),
      ]),
    ]),
  */
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
