import {empty, unique} from '../../util/sugar.js';
import {getTotalDuration} from '../../util/wiki-data.js';

export default {
  contentDependencies: [
    'generateArtistGroupContributionsInfo',
    'generateArtistInfoPageArtworksChunkedList',
    'generateArtistInfoPageFlashesChunkedList',
    'generateArtistInfoPageTracksChunkedList',
    'generateArtistNavLinks',
    'generateContentHeading',
    'generateCoverArtwork',
    'generatePageLayout',
    'linkAlbum',
    'linkArtistGallery',
    'linkExternal',
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

  query(sprawl, artist) {
    return {
      allTracks: unique([...artist.tracksAsArtist, ...artist.tracksAsContributor]),
    };
  },

  relations(relation, query, sprawl, artist) {
    const relations = {};
    const sections = relations.sections = {};

    relations.layout =
      relation('generatePageLayout');

    relations.artistNavLinks =
      relation('generateArtistNavLinks', artist);

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

    if (!empty(query.allTracks)) {
      const tracks = sections.tracks = {};
      tracks.heading = relation('generateContentHeading');
      tracks.list = relation('generateArtistInfoPageTracksChunkedList', artist);
      tracks.groupInfo = relation('generateArtistGroupContributionsInfo', query.allTracks);
    }

    if (
      !empty(artist.albumsAsCoverArtist) ||
      !empty(artist.albumsAsWallpaperArtist) ||
      !empty(artist.albumsAsBannerArtist) ||
      !empty(artist.tracksAsCoverArtist)
    ) {
      const artworks = sections.artworks = {};
      artworks.heading = relation('generateContentHeading');
      artworks.list = relation('generateArtistInfoPageArtworksChunkedList', artist);

      if (!empty(artist.albumsAsCoverArtist) || !empty(artist.tracksAsCoverArtist)) {
        artworks.artistGalleryLink =
          relation('linkArtistGallery', artist);
      }

      // We intentionally duplicate album data objects when the artist has contributed
      // at least two of cover art / wallpaper / banner! These each count as one.
      artworks.groupInfo =
        relation('generateArtistGroupContributionsInfo', [
          ...artist.albumsAsCoverArtist,
          ...artist.albumsAsWallpaperArtist,
          ...artist.albumsAsBannerArtist,
          ...artist.tracksAsCoverArtist,
        ]);
    }

    if (sprawl.enableFlashesAndGames && !empty(artist.flashesAsContributor)) {
      const flashes = sections.flashes = {};
      flashes.heading = relation('generateContentHeading');
      flashes.list = relation('generateArtistInfoPageFlashesChunkedList', artist);
    }

    /*
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
    */

    return relations;
  },

  data(query, sprawl, artist) {
    const data = {};

    data.name = artist.name;
    data.directory = artist.directory;

    if (artist.hasAvatar) {
      data.avatarFileExtension = artist.avatarFileExtension;
    }

    data.totalTrackCount = query.allTracks.length;
    data.totalDuration = getTotalDuration(query.allTracks, {originalReleasesOnly: true});

    return data;
  },

  generate(data, relations, {html, language}) {
    const {sections: sec} = relations;

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

            // TODO: How to check if a template is blank!?
            // !html.isBlank(sec.tracks.groupInfo.content) &&
              html.tag('p',
                language.$('artistPage.musicGroupsLine', {
                  groups: sec.tracks.groupInfo.slot('mode', 'duration'),
                })),

            sec.tracks.list,
          ],

          sec.artworks && [
            sec.artworks.heading
              .slots({
                tag: 'h2',
                id: 'art',
                title: language.$('artistPage.artList.title'),
              }),

            html.tag('p',
              language.$('artistPage.artGroupsLine', {
                groups: sec.artworks.groupInfo.slot('mode', 'count'),
              })),

            sec.artworks.artistGalleryLink &&
              html.tag('p',
                language.$('artistPage.viewArtGallery.orBrowseList', {
                  link: sec.artworks.artistGalleryLink.slots({
                    content: language.$('artistPage.viewArtGallery.link'),
                  }),
                })),

            sec.artworks.list,
          ],

          sec.flashes && [
            sec.flashes.heading
              .slots({
                tag: 'h2',
                id: 'flashes',
                title: language.$('artistPage.flashList.title'),
              }),

            sec.flashes.list,
          ],

          /*
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
          */
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
*/
