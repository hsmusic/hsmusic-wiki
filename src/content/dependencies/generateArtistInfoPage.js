import {empty, filterProperties, unique} from '../../util/sugar.js';

import {
  chunkByProperties,
  getTotalDuration,
  sortAlbumsTracksChronologically,
  sortFlashesChronologically,
} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateArtistNavLinks',
    'generateContentHeading',
    'generateCoverArtwork',
    'generatePageLayout',
    'linkAlbum',
    'linkArtist',
    'linkArtistGallery',
    'linkExternal',
    'linkFlash',
    'linkGroup',
    'linkTrack',
    'transformContent',
  ],

  extraDependencies: ['html', 'language', 'wikiData'],

  sprawl({wikiInfo}) {
    return {
      enableFlashesAndGames: wikiInfo.enableFlashesAndGames,
    };
  },

  relations(relation, sprawl, artist) {
    const relations = {};
    const sections = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.artistNavLinks =
      relation('generateArtistNavLinks', artist);

    function getContributionDescriptions(...contribArrays) {
      const ownContribs =
        contribArrays
          .map(contribs => contribs.find(({who}) => who === artist))
          .filter(Boolean);

      const contributionDescriptions =
        ownContribs
          .map(({what}) => what)
          .filter(Boolean);

      if (empty(contributionDescriptions)) {
        return {};
      }

      return {contributionDescriptions};
    }

    function getOtherArtistLinks(...contribArrays) {
      const otherArtistContribs =
        contribArrays
          .map(contribs => contribs.filter(({who}) => who !== artist))
          .flat();

      if (empty(otherArtistContribs)) {
        return {};
      }

      const otherArtistLinks =
        otherArtistContribs
          .map(({who}) => relation('linkArtist', who));

      return {otherArtistLinks};
    }

    function sortContributionEntries(entries, sortFunction) {
      const things = unique(entries.map(({thing}) => thing));
      sortFunction(things);

      const outputArrays = [];
      const thingToOutputArray = new Map();

      for (const thing of things) {
        const array = [];
        thingToOutputArray.set(thing, array);
        outputArrays.push(array);
      }

      for (const entry of entries) {
        thingToOutputArray.get(entry.thing).push(entry);
      }

      entries.splice(0, entries.length, ...outputArrays.flat());
    }

    function getGroupInfo(entries) {
      const allGroups = new Set();
      const groupToDuration = new Map();
      const groupToCount = new Map();

      for (const entry of entries) {
        for (const group of entry.album.groups) {
          allGroups.add(group);
          groupToCount.set(group, (groupToCount.get(group) ?? 0) + 1);
          groupToDuration.set(group, (groupToDuration.get(group) ?? 0) + entry.duration ?? 0);
        }
      }

      const groupInfo =
        Array.from(allGroups)
          .map(group => ({
            groupLink: relation('linkGroup', group),
            duration: groupToDuration.get(group) ?? 0,
            count: groupToCount.get(group),
          }));

      groupInfo.sort((a, b) => b.count - a.count);
      groupInfo.sort((a, b) => b.duration - a.duration);

      return groupInfo;
    }

    if (artist.hasAvatar) {
      relations.cover =
        relation('generateCoverArtwork', []);
    }

    if (artist.contextNotes) {
      const contextNotes = sections.contextNotes = {};
      contextNotes.content = relation('transformContent', artist.contextNotes);
    }

    if (!empty(artist.urls)) {
      const visit = sections.visit = {};
      visit.externalLinks =
        artist.urls.map(url =>
          relation('linkExternal', url));
    }

    const trackContributionEntries = [
      ...artist.tracksAsArtist.map(track => ({
        date: track.date,
        thing: track,
        album: track.album,
        duration: track.duration,
        rerelease: track.originalReleaseTrack !== null,
        trackLink: relation('linkTrack', track),
        ...getContributionDescriptions(track.artistContribs),
        ...getOtherArtistLinks(track.artistContribs),
      })),

      ...artist.tracksAsContributor.map(track => ({
        date: track.date,
        thing: track,
        album: track.album,
        duration: track.duration,
        rerelease: track.originalReleaseTrack !== null,
        trackLink: relation('linkTrack', track),
        ...getContributionDescriptions(track.contributorContribs),
        ...getOtherArtistLinks(track.contributorContribs),
      })),
    ];

    sortContributionEntries(trackContributionEntries, sortAlbumsTracksChronologically);

    const trackContributionChunks =
      chunkByProperties(trackContributionEntries, ['album', 'date'])
        .map(({album, date, chunk}) => ({
          albumLink: relation('linkAlbum', album),
          date: +date,
          duration: getTotalDuration(chunk),
          entries: chunk
            .map(entry =>
              filterProperties(entry, [
                'contributionDescriptions',
                'duration',
                'otherArtistLinks',
                'rerelease',
                'trackLink',
              ])),
        }));

    const trackGroupInfo = getGroupInfo(trackContributionEntries, 'duration');

    if (!empty(trackContributionChunks)) {
      const tracks = sections.tracks = {};
      tracks.heading = relation('generateContentHeading');
      tracks.chunks = trackContributionChunks;

      if (!empty(trackGroupInfo)) {
        tracks.groupInfo = trackGroupInfo;
      }
    }

    // TODO: Add and integrate wallpaper and banner date fields (#90)
    const artContributionEntries = [
      ...artist.albumsAsCoverArtist.map(album => ({
        kind: 'albumCover',
        date: album.coverArtDate,
        thing: album,
        album: album,
        ...getContributionDescriptions(album.coverArtistContribs),
        ...getOtherArtistLinks(album.coverArtistContribs),
      })),

      ...artist.albumsAsWallpaperArtist.map(album => ({
        kind: 'albumWallpaper',
        date: album.coverArtDate,
        thing: album,
        album: album,
        ...getContributionDescriptions(album.wallpaperArtistContribs),
        ...getOtherArtistLinks(album.wallpaperArtistContribs),
      })),

      ...artist.albumsAsBannerArtist.map(album => ({
        kind: 'albumBanner',
        date: album.coverArtDate,
        thing: album,
        album: album,
        ...getContributionDescriptions(album.bannerArtistContribs),
        ...getOtherArtistLinks(album.bannerArtistContribs),
      })),

      ...artist.tracksAsCoverArtist.map(track => ({
        kind: 'trackCover',
        date: track.coverArtDate,
        thing: track,
        album: track.album,
        rerelease: track.originalReleaseTrack !== null,
        trackLink: relation('linkTrack', track),
        ...getContributionDescriptions(track.coverArtistContribs),
        ...getOtherArtistLinks(track.coverArtistContribs),
      })),
    ];

    sortContributionEntries(artContributionEntries, sortAlbumsTracksChronologically);

    const artContributionChunks =
      chunkByProperties(artContributionEntries, ['album', 'date'])
        .map(({album, date, chunk}) => ({
          albumLink: relation('linkAlbum', album),
          date: +date,
          entries:
            chunk.map(entry =>
              filterProperties(entry, [
                'contributionDescriptions',
                'kind',
                'otherArtistLinks',
                'rerelease',
                'trackLink',
              ])),
        }));

    const artGroupInfo = getGroupInfo(artContributionEntries, 'count');

    if (!empty(artContributionChunks)) {
      const artworks = sections.artworks = {};
      artworks.heading = relation('generateContentHeading');
      artworks.chunks = artContributionChunks;

      if (
        !empty(artist.albumsAsCoverArtist) ||
        !empty(artist.tracksAsCoverArtist)
      ) {
        artworks.artistGalleryLink =
          relation('linkArtistGallery', artist);
      }

      if (!empty(artGroupInfo)) {
        artworks.groupInfo = artGroupInfo;
      }
    }

    // Flashes and games can list multiple contributors as collaborative
    // credits, but we don't display these on the artist page, since they
    // usually involve many artists crediting a larger team where collaboration
    // isn't as relevant (without more particular details that aren't tracked
    // on the wiki).

    if (sprawl.enableFlashesAndGames) {
      const flashEntries = [
        ...artist.flashesAsContributor.map(flash => ({
          date: +flash.date,
          thing: flash,
          act: flash.act,
          flashLink: relation('linkFlash', flash),
          ...getContributionDescriptions(flash.contributorContribs),
        })),
      ];

      sortContributionEntries(flashEntries, sortFlashesChronologically);

      const flashChunks =
        chunkByProperties(flashEntries, ['act'])
          .map(({act, chunk}) => ({
            actName: act.name,
            actLink: relation('linkFlash', chunk[0].thing),
            dateFirst: +chunk[0].date,
            dateLast: +chunk[chunk.length - 1].date,
            entries:
              chunk.map(entry =>
                filterProperties(entry, [
                  'contributionDescriptions',
                  'flashLink',
                ])),
          }));

      if (!empty(flashChunks)) {
        const flashes = sections.flashes = {};
        flashes.heading = relation('generateContentHeading');
        flashes.chunks = flashChunks;
      }
    }

    // Commentary doesn't use the detailed contribution system where multiple
    // artists are collaboratively credited for the same piece, so there isn't
    // really anything special to do for processing or presenting it.

    const commentaryEntries = [
      ...artist.albumsAsCommentator.map(album => ({
        kind: 'albumCommentary',
        date: album.date,
        thing: album,
        album: album,
      })),

      ...artist.tracksAsCommentator.map(track => ({
        kind: 'trackCommentary',
        date: track.date,
        thing: track,
        album: track.album,
        trackLink: relation('linkTrack', track),
      })),
    ];

    sortContributionEntries(commentaryEntries, sortAlbumsTracksChronologically);

    // We still pass through (and chunk by) date here, even though it doesn't
    // actually get displayed on the album page. See issue #193.
    const commentaryChunks =
      chunkByProperties(commentaryEntries, ['album', 'date'])
        .map(({album, date, chunk}) => ({
          albumLink: relation('linkAlbum', album),
          date: +date,
          entries:
            chunk.map(entry =>
              filterProperties(entry, [
                'kind',
                'trackLink',
              ])),
        }));

    if (!empty(commentaryChunks)) {
      const commentary = sections.commentary = {};
      commentary.heading = relation('generateContentHeading');
      commentary.chunks = commentaryChunks;
    }

    return relations;
  },

  data(sprawl, artist) {
    const data = {};

    data.name = artist.name;
    data.directory = artist.directory;

    if (artist.hasAvatar) {
      data.avatarFileExtension = artist.avatarFileExtension;
    }

    const allTracks = unique([...artist.tracksAsArtist, ...artist.tracksAsContributor]);
    data.totalTrackCount = allTracks.length;
    data.totalDuration = getTotalDuration(allTracks, {originalReleasesOnly: true});

    return data;
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

    function addAccentsToEntry({
      rerelease,
      entry,
      otherArtistLinks,
      contributionDescriptions,
    }) {
      if (rerelease) {
        return language.$('artistPage.creditList.entry.rerelease', {entry});
      }

      const options = {entry};
      const parts = ['artistPage.creditList.entry'];

      if (otherArtistLinks) {
        parts.push('withArtists');
        options.artists = language.formatConjunctionList(otherArtistLinks);
      }

      if (contributionDescriptions) {
        parts.push('withContribution');
        options.contribution = language.formatUnitList(contributionDescriptions);
      }

      if (parts.length === 1) {
        return entry;
      }

      return language.formatString(parts.join('.'), options);
    }

    function addAccentsToAlbumLink({
      albumLink,
      date,
      duration,
      entries,
    }) {
      const options = {album: albumLink};
      const parts = ['artistPage.creditList.album'];

      if (date) {
        parts.push('withDate');
        options.date = language.formatDate(new Date(date));
      }

      if (duration) {
        parts.push('withDuration');
        options.duration = language.formatDuration(duration, {
          approximate: entries.length > 1,
        });
      }

      return language.formatString(parts.join('.'), options);
    }

    return relations.layout
      .slots({
        title: data.name,
        headingMode: 'sticky',

        cover:
          (relations.cover
            ? relations.cover.slots({
                path: [
                  'media.artistAvatar',
                  data.directory,
                  data.avatarFileExtension,
                ],
              })
            : null),

        mainClasses: ['long-content'],
        mainContent: [
          sec.contextNotes && [
            html.tag('p', language.$('releaseInfo.note')),
            html.tag('blockquote',
              sec.contextNotes.content),
          ],

          sec.visit &&
            html.tag('p',
              language.$('releaseInfo.visitOn', {
                links: language.formatDisjunctionList(sec.visit.externalLinks),
              })),

          sec.artworks?.artistGalleryLink &&
            html.tag('p',
              language.$('artistPage.viewArtGallery', {
                link: sec.artworks.artistGalleryLink.slots({
                  content: language.$('artistPage.viewArtGallery.link'),
                }),
              })),

          (sec.tracks || sec.artworsk || sec.flashes || sec.commentary) &&
            html.tag('p',
              language.$('misc.jumpTo.withLinks', {
                links: language.formatUnitList(
                  [
                    sec.tracks &&
                      html.tag('a',
                        {href: '#tracks'},
                        language.$('artistPage.trackList.title')),

                    sec.artworks &&
                      html.tag('a',
                        {href: '#art'},
                        language.$('artistPage.artList.title')),

                    sec.flashes &&
                      html.tag('a',
                        {href: '#flashes'},
                        language.$('artistPage.flashList.title')),

                    sec.commentary &&
                      html.tag('a',
                        {href: '#commentary'},
                        language.$('artistPage.commentaryList.title')),
                  ].filter(Boolean)),
              })),

          sec.tracks && [
            sec.tracks.heading
              .slots({
                tag: 'h2',
                id: 'tracks',
                title: language.$('artistPage.trackList.title'),
              }),

            data.totalDuration > 0 &&
              html.tag('p',
                language.$('artistPage.contributedDurationLine', {
                  artist: data.name,
                  duration:
                    language.formatDuration(data.totalDuration, {
                      approximate: data.totalTrackCount > 1,
                      unit: true,
                    }),
                })),

            sec.tracks.groupInfo &&
              html.tag('p',
                language.$('artistPage.musicGroupsLine', {
                  groups:
                    language.formatUnitList(
                      sec.tracks.groupInfo.map(({groupLink, count, duration}) =>
                        (duration
                          ? language.$('artistPage.groupsLine.item.withDuration', {
                              group: groupLink,
                              duration: language.formatDuration(duration, {approximate: count > 1}),
                            })
                          : language.$('artistPage.groupsLine.item.withCount', {
                              group: groupLink,
                              count: language.countContributions(count),
                            })))),
                })),

            html.tag('dl',
              sec.tracks.chunks.map(({albumLink, date, duration, entries}) => [
                html.tag('dt',
                  addAccentsToAlbumLink({albumLink, date, duration, entries})),

                html.tag('dd',
                  html.tag('ul',
                    entries
                      .map(({trackLink, duration, ...properties}) => ({
                        entry:
                          (duration
                            ? language.$('artistPage.creditList.entry.track.withDuration', {
                                track: trackLink,
                                duration: language.formatDuration(duration),
                              })
                            : language.$('artistPage.creditList.entry.track', {
                                track: trackLink,
                              })),
                        ...properties,
                      }))
                      .map(addAccentsToEntry)
                      .map(entry => html.tag('li', entry)))),
              ])),
          ],

          sec.artworks && [
            sec.artworks.heading
              .slots({
                tag: 'h2',
                id: 'art',
                title: language.$('artistPage.artList.title'),
              }),

            sec.artworks.artistGalleryLink &&
              html.tag('p',
                language.$('artistPage.viewArtGallery.orBrowseList', {
                  link: sec.artworks.artistGalleryLink.slots({
                    content: language.$('artistPage.viewArtGallery.link'),
                  }),
                })),

            sec.artworks.groupInfo &&
              html.tag('p',
                language.$('artistPage.artGroupsLine', {
                  groups:
                    language.formatUnitList(
                      sec.artworks.groupInfo.map(({groupLink, count}) =>
                        language.$('artistPage.groupsLine.item.withCount', {
                          group: groupLink,
                          count:
                            language.countContributions(count),
                        }))),
                })),

            html.tag('dl',
              sec.artworks.chunks.map(({albumLink, date, entries}) => [
                html.tag('dt',
                  addAccentsToAlbumLink({albumLink, date, entries})),

                html.tag('dd',
                  html.tag('ul',
                    entries
                      .map(({kind, trackLink, ...properties}) => ({
                        entry:
                          (kind === 'trackCover'
                            ? language.$('artistPage.creditList.entry.track', {
                                track: trackLink,
                              })
                            : html.tag('i',
                                language.$('artistPage.creditList.entry.album.' + {
                                  albumWallpaper: 'wallpaperArt',
                                  albumBanner: 'bannerArt',
                                  albumCover: 'coverArt',
                                }[kind]))),
                        ...properties,
                      }))
                      .map(addAccentsToEntry)
                      .map(entry => html.tag('li', entry)))),
              ])),
          ],

          sec.flashes && [
            sec.flashes.heading
              .slots({
                tag: 'h2',
                id: 'flashes',
                title: language.$('artistPage.flashList.title'),
              }),

            html.tag('dl',
              sec.flashes.chunks.map(({
                actName,
                actLink,
                entries,
                dateFirst,
                dateLast,
              }) => [
                html.tag('dt',
                  language.$('artistPage.creditList.flashAct.withDateRange', {
                    act: actLink.slot('content', actName),
                    dateRange: language.formatDateRange(dateFirst, dateLast),
                  })),

                html.tag('dd',
                  html.tag('ul',
                    entries
                      .map(({flashLink, ...properties}) => ({
                        ...properties,
                        entry: language.$('artistPage.creditList.entry.flash', {
                          flash: flashLink,
                        }),
                      }))
                      .map(addAccentsToEntry)
                      .map(row => html.tag('li', row)))),
              ])),
          ],

          sec.commentary && [
            sec.commentary.heading
              .slots({
                tag: 'h2',
                id: 'commentary',
                title: language.$('artistPage.commentaryList.title'),
              }),

            html.tag('dl',
              sec.commentary.chunks.map(({albumLink, entries}) => [
                html.tag('dt',
                  language.$('artistPage.creditList.album', {
                    album: albumLink,
                  })),

                html.tag('dd',
                  html.tag('ul',
                    entries
                      .map(({kind, trackLink}) =>
                        (kind === 'trackCommentary'
                          ? language.$('artistPage.creditList.entry.track', {
                              track: trackLink,
                            })
                          : html.tag('i',
                              language.$('artistPage.creditList.entry.album.commentary'))))
                      .map(entry => html.tag('li', entry)))),
              ])),
          ],
        ],

        navLinkStyle: 'hierarchical',
        navLinks:
          relations.artistNavLinks
            .slots({
              showExtraLinks: true,
            })
            .content,
      });
  },
};

/*
  const unbound_serializeArtistsAndContrib =
    (key, {serializeContribs, serializeLink}) =>
    (thing) => {
      const {artists, contrib} = getArtistsAndContrib(thing, key);
      const ret = {};
      ret.link = serializeLink(thing);
      if (contrib.what) ret.contribution = contrib.what;
      if (!empty(artists)) ret.otherArtists = serializeContribs(artists);
      return ret;
    };

  const unbound_serializeTrackListChunks = (chunks, {serializeLink}) =>
    chunks.map(({date, album, chunk, duration}) => ({
      album: serializeLink(album),
      date,
      duration,
      tracks: chunk.map(({track}) => ({
        link: serializeLink(track),
        duration: track.duration,
      })),
    }));

  const data = {
    type: 'data',
    path: ['artist', artist.directory],
    data: ({serializeContribs, serializeLink}) => {
      const serializeArtistsAndContrib = bindOpts(unbound_serializeArtistsAndContrib, {
        serializeContribs,
        serializeLink,
      });

      const serializeTrackListChunks = bindOpts(unbound_serializeTrackListChunks, {
        serializeLink,
      });

      return {
        albums: {
          asCoverArtist: artist.albumsAsCoverArtist
            .map(serializeArtistsAndContrib('coverArtistContribs')),
          asWallpaperArtist: artist.albumsAsWallpaperArtist
            .map(serializeArtistsAndContrib('wallpaperArtistContribs')),
          asBannerArtist: artist.albumsAsBannerArtis
            .map(serializeArtistsAndContrib('bannerArtistContribs')),
        },
        flashes: wikiInfo.enableFlashesAndGames
          ? {
              asContributor: artist.flashesAsContributor
                .map(flash => getArtistsAndContrib(flash, 'contributorContribs'))
                .map(({contrib, thing: flash}) => ({
                  link: serializeLink(flash),
                  contribution: contrib.what,
                })),
            }
          : null,
        tracks: {
          asArtist: artist.tracksAsArtist
            .map(serializeArtistsAndContrib('artistContribs')),
          asContributor: artist.tracksAsContributo
            .map(serializeArtistsAndContrib('contributorContribs')),
          chunked: serializeTrackListChunks(trackListChunks),
        },
      };
    },
  };

  const artThingsGallery = sortAlbumsTracksChronologically(
    [
      ...(artist.albumsAsCoverArtist ?? []),
      ...(artist.tracksAsCoverArtist ?? []),
    ],
    {latestFirst: true, getDate: (o) => o.coverArtDate});

  const galleryPage = hasGallery && {
    type: 'page',
    path: ['artistGallery', artist.directory],
    page: ({
      generateInfoGalleryLinks,
      getAlbumCover,
      getGridHTML,
      getTrackCover,
      html,
      link,
      language,
    }) => ({
      title: language.$('artistGalleryPage.title', {artist: name}),

      main: {
        classes: ['top-index'],
        headingMode: 'static',

        content: [
          html.tag('p',
            {class: 'quick-info'},
            language.$('artistGalleryPage.infoLine', {
              coverArts: language.countCoverArts(artThingsGallery.length, {
                unit: true,
              }),
            })),

          html.tag('div',
            {class: 'grid-listing'},
            getGridHTML({
              entries: artThingsGallery.map((item) => ({item})),
              srcFn: (thing) =>
                thing.album
                  ? getTrackCover(thing)
                  : getAlbumCover(thing),
              linkFn: (thing, opts) =>
                thing.album
                  ? link.track(thing, opts)
                  : link.album(thing, opts),
            })),
        ],
      },
    }),
  };
*/
