import {empty} from '#sugar';

export const description = `per-artist info & artwork gallery pages`;

// NB: See artist-alias.js for artist alias redirect pages.
export function targets({wikiData}) {
  return wikiData.artistData;
}

export function pathsForTarget(artist) {
  const hasGalleryPage =
    !empty(artist.tracksAsCoverArtist) ||
    !empty(artist.albumsAsCoverArtist);

  return [
    {
      type: 'page',
      path: ['artist', artist.directory],

      contentFunction: {
        name: 'generateArtistInfoPage',
        args: [artist],
      },
    },

    hasGalleryPage && {
      type: 'page',
      path: ['artistGallery', artist.directory],

      contentFunction: {
        name: 'generateArtistGalleryPage',
        args: [artist],
      },
    },
  ];
}

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
