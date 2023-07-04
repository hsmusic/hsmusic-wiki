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

  data: ({wikiData: {artistData}}) =>
    artistData
      .map((artist) => ({
        artist,
        duration: getTotalDuration([
          ...(artist.tracksAsArtist ?? []),
          ...(artist.tracksAsContributor ?? []),
        ], {originalReleasesOnly: true}),
      }))
      .filter(({duration}) => duration > 0)
      .sort((a, b) => b.duration - a.duration),

  row: ({artist, duration}, {language, link}) =>
    language.$('listingPage.listArtists.byDuration.item', {
      artist: link.artist(artist),
      duration: language.formatDuration(duration),
    }),
});

listingSpec.push({
  directory: 'artists/by-latest',
  stringsKey: 'listArtists.byLatest',

  data({wikiData: {
    albumData,
    flashData,
    trackData,
    wikiInfo,
  }}) {
    const processContribs = values => {
      const filteredValues = values
        .filter(value => value.date && !empty(value.contribs));

      const datedArtistLists = sortByDate(filteredValues)
        .map(({
          contribs,
          date,
        }) => ({
          artists: contribs.map(({who}) => who),
          date,
        }));

      const remainingArtists = new Set(datedArtistLists.flatMap(({artists}) => artists));
      const artistEntries = [];

      for (let i = datedArtistLists.length - 1; i >= 0; i--) {
        const {artists, date} = datedArtistLists[i];
        for (const artist of artists) {
          if (!remainingArtists.has(artist))
            continue;

          remainingArtists.delete(artist);
          artistEntries.push({
            artist,
            date,

            // For sortChronologically!
            directory: artist.directory,
            name: artist.name,
          });
        }

        // Early exit: If we've gotten every artist, there's no need to keep
        // going.
        if (remainingArtists.size === 0)
          break;
      }

      return sortChronologically(artistEntries, {latestFirst: true});
    };

    // Tracks are super easy to sort because they only have one pertinent
    // date: the date the track was released on.

    const toTracks = processContribs(
      trackData.map(({
        artistContribs,
        date,
      }) => ({
        contribs: artistContribs,
        date,
      })));

    // Artworks are a bit more involved because there are multiple dates
    // involved - cover artists correspond to one date, wallpaper artists to
    // another, etc.

    const toArtAndFlashes = processContribs([
      ...trackData.map(({
        coverArtistContribs,
        coverArtDate,
      }) => ({
        contribs: coverArtistContribs,
        date: coverArtDate,
      })),

      ...flashData
        ? flashData.map(({
            contributorContribs,
            date,
          }) => ({
            contribs: contributorContribs,
            date,
          }))
        : [],

      ...albumData.flatMap(({
        bannerArtistContribs,
        coverArtistContribs,
        coverArtDate,
        date,
        wallpaperArtistContribs,
      }) => [
        {
          contribs: coverArtistContribs,
          date: coverArtDate,
        },
        {
          contribs: bannerArtistContribs,
          date, // TODO: bannerArtDate (see issue #90)
        },
        {
          contribs: wallpaperArtistContribs,
          date, // TODO: wallpaperArtDate (see issue #90)
        },
      ]),
    ]);

    return {
      toArtAndFlashes,
      toTracks,

      // (Ok we did it again.)
      // This is a kinda naughty hack, 8ut like, it's the only place
      // we'd 8e passing wikiData to html() otherwise, so like....
      showAsFlashes: wikiInfo.enableFlashesAndGames,
    };
  },

  html: (
    {toTracks, toArtAndFlashes, showAsFlashes},
    {html, language, link}
  ) =>
    html.tag('div', {class: 'content-columns'}, [
      html.tag('div', {class: 'column'}, [
        html.tag('h2',
          language.$('listingPage.misc.trackContributors')),

        html.tag('ul',
          toTracks.map(({artist, date}) =>
            html.tag('li',
              language.$('listingPage.listArtists.byLatest.item', {
                artist: link.artist(artist),
                date: language.formatDate(date),
              })))),
      ]),

      html.tag('div', {class: 'column'}, [
        html.tag('h2',
          language.$(
            'listingPage.misc' +
              (showAsFlashes
                ? '.artAndFlashContributors'
                : '.artContributors'))),

        html.tag('ul',
          toArtAndFlashes.map(({artist, date}) =>
            html.tag('li',
              language.$('listingPage.listArtists.byLatest.item', {
                artist: link.artist(artist),
                date: language.formatDate(date),
              })))),
      ]),
    ]),
});

listingSpec.push({
  directory: 'groups/by-name',
  stringsKey: 'listGroups.byName',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableGroupUI,

  data: ({wikiData: {groupData}}) =>
    sortAlphabetically(groupData.slice()),

  row: (group, {language, link}) =>
    language.$('listingPage.listGroups.byCategory.group', {
      group: link.groupInfo(group),
      gallery: link.groupGallery(group, {
        text: language.$('listingPage.listGroups.byCategory.group.gallery'),
      }),
    }),
});

listingSpec.push({
  directory: 'groups/by-category',
  stringsKey: 'listGroups.byCategory',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableGroupUI,

  data: ({wikiData: {groupCategoryData}}) =>
    groupCategoryData
      .map(category => ({
        category,
        groups: category.groups,
      })),

  html: (data, {html, language, link}) =>
    html.tag('dl',
      data.flatMap(({category, groups}) => [
        html.tag('dt',
          {class: ['content-heading']},
          language.$('listingPage.listGroups.byCategory.category', {
            category: empty(groups)
              ? category.name
              : link.groupInfo(groups[0], {
                  text: category.name,
                }),
          })),

        html.tag('dd',
          empty(groups)
            ? null // todo: #85
            : html.tag('ul',
                category.groups.map(group =>
                  html.tag('li',
                    language.$('listingPage.listGroups.byCategory.group', {
                      group: link.groupInfo(group),
                      gallery: link.groupGallery(group, {
                        text: language.$('listingPage.listGroups.byCategory.group.gallery'),
                      }),
                    }))))),
      ])),
});

listingSpec.push({
  directory: 'groups/by-albums',
  stringsKey: 'listGroups.byAlbums',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableGroupUI,

  data: ({wikiData: {groupData}}) =>
    groupData
      .map(group => ({
        group,
        albums: group.albums.length
      }))
      .sort((a, b) => b.albums - a.albums),

  row: ({group, albums}, {language, link}) =>
    language.$('listingPage.listGroups.byAlbums.item', {
      group: link.groupInfo(group),
      albums: language.countAlbums(albums, {unit: true}),
    }),
});

listingSpec.push({
  directory: 'groups/by-tracks',
  stringsKey: 'listGroups.byTracks',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableGroupUI,

  data: ({wikiData: {groupData}}) =>
    groupData
      .map((group) => ({
        group,
        tracks: accumulateSum(
          group.albums,
          ({tracks}) => tracks.length),
      }))
      .sort((a, b) => b.tracks - a.tracks),

  row: ({group, tracks}, {language, link}) =>
    language.$('listingPage.listGroups.byTracks.item', {
      group: link.groupInfo(group),
      tracks: language.countTracks(tracks, {unit: true}),
    }),
});

listingSpec.push({
  directory: 'groups/by-duration',
  stringsKey: 'listGroups.byDuration',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableGroupUI,

  data: ({wikiData: {groupData}}) =>
    groupData
      .map(group => ({
        group,
        duration: getTotalDuration(
          group.albums.flatMap(album => album.tracks),
          {originalReleasesOnly: true}),
      }))
      .filter(({duration}) => duration > 0)
      .sort((a, b) => b.duration - a.duration),

  row: ({group, duration}, {language, link}) =>
    language.$('listingPage.listGroups.byDuration.item', {
      group: link.groupInfo(group),
      duration: language.formatDuration(duration),
    }),
});

listingSpec.push({
  directory: 'groups/by-latest-album',
  stringsKey: 'listGroups.byLatest',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableGroupUI,

  data: ({wikiData: {groupData}}) =>
    sortChronologically(
      groupData
        .map(group => {
          const albums = group.albums.filter(a => a.date);
          return !empty(albums) && {
            group,
            directory: group.directory,
            name: group.name,
            date: albums[albums.length - 1].date,
          };
        })
        .filter(Boolean),
      {latestFirst: true}),

  row: ({group, date}, {language, link}) =>
    language.$('listingPage.listGroups.byLatest.item', {
      group: link.groupInfo(group),
      date: language.formatDate(date),
    }),
});

listingSpec.push({
  directory: 'tracks/by-name',
  stringsKey: 'listTracks.byName',

  data: ({wikiData: {trackData}}) =>
    sortAlphabetically(trackData.slice()),

  row: (track, {language, link}) =>
    language.$('listingPage.listTracks.byName.item', {
      track: link.track(track),
    }),
});

listingSpec.push({
  directory: 'tracks/by-album',
  stringsKey: 'listTracks.byAlbum',

  data: ({wikiData: {albumData}}) =>
    albumData.map(album => ({
      album,
      tracks: album.tracks,
    })),

  html: (data, {html, language, link}) =>
    html.tag('dl',
      data.flatMap(({album, tracks}) => [
        html.tag('dt',
          {class: ['content-heading']},
          language.$('listingPage.listTracks.byAlbum.album', {
            album: link.album(album),
          })),

        html.tag('dd',
          html.tag('ol',
            tracks.map(track =>
              html.tag('li',
                language.$('listingPage.listTracks.byAlbum.track', {
                  track: link.track(track),
                }))))),
      ])),
});

listingSpec.push({
  directory: 'tracks/by-date',
  stringsKey: 'listTracks.byDate',

  data: ({wikiData: {albumData}}) =>
    chunkByProperties(
      sortByDate(
        sortChronologically(albumData)
          .flatMap(album => album.tracks)
          .filter(track => track.date)),
      ['album', 'date']),

  html: (data, {html, language, link}) =>
    html.tag('dl',
      data.flatMap(({album, date, chunk: tracks}) => [
        html.tag('dt',
          language.$('listingPage.listTracks.byDate.album', {
            album: link.album(album),
            date: language.formatDate(date),
          })),

        html.tag('dd',
          html.tag('ul',
            tracks.map(track =>
              track.originalReleaseTrack
                ? html.tag('li',
                    {class: 'rerelease'},
                    language.$('listingPage.listTracks.byDate.track.rerelease', {
                      track: link.track(track),
                    }))
                : html.tag('li',
                    language.$('listingPage.listTracks.byDate.track', {
                      track: link.track(track),
                    }))))),
      ])),
});

listingSpec.push({
  directory: 'tracks/by-duration',
  stringsKey: 'listTracks.byDuration',

  data: ({wikiData: {trackData}}) =>
    trackData
      .map(track => ({
        track,
        duration: track.duration
      }))
      .filter(({duration}) => duration > 0)
      .sort((a, b) => b.duration - a.duration),

  row: ({track, duration}, {language, link}) =>
    language.$('listingPage.listTracks.byDuration.item', {
      track: link.track(track),
      duration: language.formatDuration(duration),
    }),
});

listingSpec.push({
  directory: 'tracks/by-duration-in-album',
  stringsKey: 'listTracks.byDurationInAlbum',

  data: ({wikiData: {albumData}}) =>
    albumData.map(album => ({
      album,
      tracks: album.tracks
        .slice()
        .sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0)),
    })),

  html: (data, {html, language, link}) =>
    html.tag('dl',
      data.flatMap(({album, tracks}) => [
        html.tag('dt',
          {class: ['content-heading']},
          language.$('listingPage.listTracks.byDurationInAlbum.album', {
            album: link.album(album),
          })),

        html.tag('dd',
          html.tag('ul',
            tracks.map(track =>
              html.tag('li',
                language.$('listingPage.listTracks.byDurationInAlbum.track', {
                  track: link.track(track),
                  duration: language.formatDuration(track.duration ?? 0),
                }))))),
      ])),
});

listingSpec.push({
  directory: 'tracks/by-times-referenced',
  stringsKey: 'listTracks.byTimesReferenced',

  data: ({wikiData: {trackData}}) =>
    trackData
      .map(track => ({
        track,
        timesReferenced: track.referencedByTracks.length,
      }))
      .filter(({timesReferenced}) => timesReferenced)
      .sort((a, b) => b.timesReferenced - a.timesReferenced),

  row: ({track, timesReferenced}, {language, link}) =>
    language.$('listingPage.listTracks.byTimesReferenced.item', {
      track: link.track(track),
      timesReferenced: language.countTimesReferenced(timesReferenced, {
        unit: true,
      }),
    }),
});

listingSpec.push({
  directory: 'tracks/in-flashes/by-album',
  stringsKey: 'listTracks.inFlashes.byAlbum',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableFlashesAndGames,

  data: ({wikiData: {trackData}}) =>
    chunkByProperties(
      trackData.filter(t => !empty(t.featuredInFlashes)),
      ['album']),

  html: (data, {html, language, link}) =>
    html.tag('dl',
      data.flatMap(({album, chunk: tracks}) => [
        html.tag('dt',
          {class: ['content-heading']},
          language.$('listingPage.listTracks.inFlashes.byAlbum.album', {
            album: link.album(album),
            date: language.formatDate(album.date),
          })),

        html.tag('dd',
          html.tag('ul',
            tracks.map(track =>
              html.tag('li',
                language.$('listingPage.listTracks.inFlashes.byAlbum.track', {
                  track: link.track(track),
                  flashes: language.formatConjunctionList(
                    track.featuredInFlashes.map(link.flash)),
                }))))),
      ])),
});

listingSpec.push({
  directory: 'tracks/in-flashes/by-flash',
  stringsKey: 'listTracks.inFlashes.byFlash',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableFlashesAndGames,

  data: ({wikiData: {flashData}}) =>
    sortFlashesChronologically(flashData.slice())
      .map(flash => ({
        flash,
        tracks: flash.featuredTracks,
      })),

  html: (data, {html, language, link}) =>
    html.tag('dl',
      data.flatMap(({flash, tracks}) => [
        html.tag('dt',
          {class: ['content-heading']},
          language.$('listingPage.listTracks.inFlashes.byFlash.flash', {
            flash: link.flash(flash),
            date: language.formatDate(flash.date),
          })),

        html.tag('dd',
          html.tag('ul',
            tracks.map(track =>
              html.tag('li',
                language.$('listingPage.listTracks.inFlashes.byFlash.track', {
                  track: link.track(track),
                  album: link.album(track.album),
                }))))),
      ])),
});

function listTracksWithProperty(property, {
  directory,
  stringsKey,
  seeAlso,
  hash = '',
}) {
  return {
    directory,
    stringsKey,
    seeAlso,

    data: ({wikiData: {albumData}}) =>
      albumData
        .map(album => ({
          album,
          tracks: album.tracks.filter(track => {
            const value = track[property];
            if (!value) return false;
            if (Array.isArray(value)) {
              return !empty(value);
            }
            return true;
          }),
        }))
        .filter(({tracks}) => !empty(tracks)),

    html: (data, {html, language, link}) =>
      html.tag('dl',
        data.flatMap(({album, tracks}) => [
          html.tag('dt',
            {class: ['content-heading']},
            language.$(`listingPage.${stringsKey}.album`, {
              album: link.album(album),
              date: language.formatDate(album.date),
            })),

          html.tag('dd',
            html.tag('ul',
              tracks.map(track =>
                html.tag('li',
                  language.$(`listingPage.${stringsKey}.track`, {
                    track: link.track(track, {hash}),
                  }))))),
        ])),
  };
}

listingSpec.push(listTracksWithProperty('lyrics', {
  directory: 'tracks/with-lyrics',
  stringsKey: 'listTracks.withLyrics',
}));

listingSpec.push(listTracksWithProperty('sheetMusicFiles', {
  directory: 'tracks/with-sheet-music-files',
  stringsKey: 'listTracks.withSheetMusicFiles',
  hash: 'sheet-music-files',
  seeAlso: ['all-sheet-music-files'],
}));

listingSpec.push(listTracksWithProperty('midiProjectFiles', {
  directory: 'tracks/with-midi-project-files',
  stringsKey: 'listTracks.withMidiProjectFiles',
  hash: 'midi-project-files',
  seeAlso: ['all-midi-project-files'],
}));

listingSpec.push({
  directory: 'tags/by-name',
  stringsKey: 'listTags.byName',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableArtTagUI,

  data: ({wikiData: {artTagData}}) =>
    sortAlphabetically(
      artTagData
        .filter(tag => !tag.isContentWarning)
        .map(tag => ({
          tag,
          timesUsed: tag.taggedInThings.length,

          // For sortAlphabetically!
          directory: tag.directory,
          name: tag.name,
        }))),

  row: ({tag, timesUsed}, {language, link}) =>
    language.$('listingPage.listTags.byName.item', {
      tag: link.tag(tag),
      timesUsed: language.countTimesUsed(timesUsed, {unit: true}),
    }),
});

listingSpec.push({
  directory: 'tags/by-uses',
  stringsKey: 'listTags.byUses',

  condition: ({wikiData: {wikiInfo}}) =>
    wikiInfo.enableArtTagUI,

  data: ({wikiData: {artTagData}}) =>
    artTagData
      .filter(tag => !tag.isContentWarning)
      .map(tag => ({
        tag,
        timesUsed: tag.taggedInThings.length
      }))
      .sort((a, b) => b.timesUsed - a.timesUsed),

  row: ({tag, timesUsed}, {language, link}) =>
    language.$('listingPage.listTags.byUses.item', {
      tag: link.tag(tag),
      timesUsed: language.countTimesUsed(timesUsed, {unit: true}),
    }),
});

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

listingSpec.push(listAdditionalFilesInProperty('sheetMusicFiles', {
  directory: 'all-sheet-music-files',
  stringsKey: 'other.allSheetMusic',
  seeAlso: ['tracks/with-sheet-music-files'],
}));

listingSpec.push(listAdditionalFilesInProperty('midiProjectFiles', {
  directory: 'all-midi-project-files',
  stringsKey: 'other.allMidiProjectFiles',
  seeAlso: ['tracks/with-midi-project-files'],
}));

listingSpec.push({
  directory: 'random',
  stringsKey: 'other.randomPages',
  groupUnderOther: true,

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
