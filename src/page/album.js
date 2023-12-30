export const description = `per-album info, artwork gallery & commentary pages`;

export function targets({wikiData}) {
  return wikiData.albumData;
}

export function pathsForTarget(album) {
  const hasCommentaryPage = !!album.commentary || album.tracks.some(t => t.commentary);

  return [
    {
      type: 'page',
      path: ['album', album.directory],

      contentFunction: {
        name: 'generateAlbumInfoPage',
        args: [album],
      },
    },

    {
      type: 'page',
      path: ['albumGallery', album.directory],

      contentFunction: {
        name: 'generateAlbumGalleryPage',
        args: [album],
      },
    },

    hasCommentaryPage && {
      type: 'page',
      path: ['albumCommentary', album.directory],

      contentFunction: {
        name: 'generateAlbumCommentaryPage',
        args: [album],
      },
    },

    /*
    {
      type: 'data',
      path: ['album', album.directory],

      contentFunction: {
        name: 'generateAlbumDataFile',
        args: [album],
      },
    },
    */
  ];
}

export function pathsTargetless({wikiData: {wikiInfo}}) {
  return [
    {
      type: 'page',
      path: ['commentaryIndex'],
      contentFunction: {name: 'generateCommentaryIndexPage'},
    },

    wikiInfo.canonicalBase === 'https://hsmusic.wiki/' &&
      {
        type: 'redirect',
        fromPath: ['page', 'list/all-commentary'],
        toPath: ['commentaryIndex'],
        title: 'Album Commentary',
      },
  ];
}

/*
export function write(album, {wikiData}) {
  const data = {
    type: 'data',
    path: ['album', album.directory],
    data: ({
      serializeContribs,
      serializeCover,
      serializeGroupsForAlbum,
      serializeLink,
    }) => ({
      name: album.name,
      directory: album.directory,
      dates: {
        released: album.date,
        trackArtAdded: album.trackArtDate,
        coverArtAdded: album.coverArtDate,
        addedToWiki: album.dateAddedToWiki,
      },
      duration: albumDuration,
      color: album.color,
      cover: serializeCover(album, getAlbumCover),
      artistContribs: serializeContribs(album.artistContribs),
      coverArtistContribs: serializeContribs(album.coverArtistContribs),
      wallpaperArtistContribs: serializeContribs(album.wallpaperArtistContribs),
      bannerArtistContribs: serializeContribs(album.bannerArtistContribs),
      groups: serializeGroupsForAlbum(album),
      trackSections: album.trackSections?.map((section) => ({
        name: section.name,
        color: section.color,
        tracks: section.tracks.map((track) => track.directory),
      })),
      tracks: album.tracks.map((track) => ({
        link: serializeLink(track),
        duration: track.duration,
      })),
    }),
  };
}
*/
