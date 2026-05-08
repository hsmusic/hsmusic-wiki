import {isExternalLinkContext} from '#external-links';
import {empty, unique} from '#sugar';

function getReleaseContext(urlString, {
  _artistURLs,
  albumArtistURLs,
}) {
  const artistBandcampDomains =
    albumArtistURLs
      .filter(url => url.hostname.endsWith('.bandcamp.com'))
      .map(url => url.hostname);

  const url = new URL(urlString);

  if (url.hostname === 'homestuck.bandcamp.com') {
    return ['officialRelease'];
  }

  if (artistBandcampDomains.includes(url.hostname)) {
    return ['artistRelease'];
  }

  return [];
}

export default {
  query(thing) {
    const query = {};

    query.album =
      (thing.album
        ? thing.album
        : thing);

    query.urls =
      (!empty(thing.urls)
        ? thing.urls
     : thing.album &&
       thing.album.style === 'single' &&
       thing.album.tracks[0] === thing
        ? thing.album.urls
        : []);

    query.artists =
      thing.artistContribs
        .map(contrib => contrib.artist);

    query.artistGroups =
      query.artists
        .flatMap(artist => artist.closelyLinkedGroups)
        .map(({group}) => group);

    query.albumArtists =
      query.album.artistContribs
        .map(contrib => contrib.artist);

    query.albumArtistGroups =
      query.albumArtists
        .flatMap(artist => artist.closelyLinkedGroups)
        .map(({group}) => group);

    return query;
  },

  relations: (relation, query, _thing) => ({
    externalLinksLineOrList:
      relation('generateExternalLinksLineOrList', query.urls),
  }),

  data(query, thing) {
    const data = {};

    data.name = thing.name;

    data.noLinks = empty(query.urls);

    const artistURLs =
      unique([
        ...query.artists.flatMap(artist => artist.urls),
        ...query.artistGroups.flatMap(group => group.urls),
      ]).map(entry => new URL(entry.url));

    const albumArtistURLs =
      unique([
        ...query.albumArtists.flatMap(artist => artist.urls),
        ...query.albumArtistGroups.flatMap(group => group.urls),
      ]).map(entry => new URL(entry.url));

    const boundGetReleaseContext = urlString =>
      getReleaseContext(urlString, {
        artistURLs,
        albumArtistURLs,
      });

    let releaseContexts =
      query.urls.map(({url}) => boundGetReleaseContext(url));

    const albumReleaseContexts =
      query.album.urls.map(({url}) => boundGetReleaseContext(url));

    const presentReleaseContexts =
      unique(releaseContexts.filter(context => !empty(context)));

    const presentAlbumReleaseContexts =
      unique(albumReleaseContexts.filter(context => !empty(context)));

    if (
      presentReleaseContexts.length <= 1 &&
      presentAlbumReleaseContexts.length <= 1
    ) {
      releaseContexts =
        query.urls.map(() => []);
    }

    data.releaseContexts = releaseContexts;

    return data;
  },

  slots: {
    visibleWithoutLinks: {
      type: 'boolean',
      default: false,
    },

    context: {
      validate: () => isExternalLinkContext,
      default: 'generic',
    },
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('releaseInfo.listenOn', capsule =>
      (data.noLinks && slots.visibleWithoutLinks
        ? language.$(capsule, 'noLinks', {
            name:
              html.tag('i', data.name),
          })

        : relations.externalLinksLineOrList.slots({
            string: capsule,
            context: slots.context,
            contexts: data.releaseContexts,
          }))),
};
