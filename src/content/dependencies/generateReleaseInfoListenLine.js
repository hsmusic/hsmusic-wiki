import {isExternalLinkContext} from '#external-links';
import {empty, stitchArrays, unique} from '#sugar';

function getReleaseContext(urlString, {
  _artistURLs,
  albumArtistURLs,
}) {
  const composerBandcampDomains =
    albumArtistURLs
      .filter(url => url.hostname.endsWith('.bandcamp.com'))
      .map(url => url.hostname);

  const url = new URL(urlString);

  if (url.hostname === 'homestuck.bandcamp.com') {
    return 'officialRelease';
  }

  if (composerBandcampDomains.includes(url.hostname)) {
    return 'composerRelease';
  }

  return null;
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
    links:
      query.urls.map(url => relation('linkExternal', url)),
  }),

  data(query, thing) {
    const data = {};

    data.name = thing.name;

    const artistURLs =
      unique([
        ...query.artists.flatMap(artist => artist.urls),
        ...query.artistGroups.flatMap(group => group.urls),
      ]).map(url => new URL(url));

    const albumArtistURLs =
      unique([
        ...query.albumArtists.flatMap(artist => artist.urls),
        ...query.albumArtistGroups.flatMap(group => group.urls),
      ]).map(url => new URL(url));

    const boundGetReleaseContext = urlString =>
      getReleaseContext(urlString, {
        artistURLs,
        albumArtistURLs,
      });

    let releaseContexts =
      query.urls.map(boundGetReleaseContext);

    const albumReleaseContexts =
      query.album.urls.map(boundGetReleaseContext);

    const presentReleaseContexts =
      unique(releaseContexts.filter(Boolean));

    const presentAlbumReleaseContexts =
      unique(albumReleaseContexts.filter(Boolean));

    if (
      presentReleaseContexts.length <= 1 &&
      presentAlbumReleaseContexts.length <= 1
    ) {
      releaseContexts =
        query.urls.map(() => null);
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
      (empty(relations.links) && slots.visibleWithoutLinks
        ? language.$(capsule, 'noLinks', {
            name:
              html.tag('i', data.name),
          })

        : language.$('releaseInfo.listenOn', {
            [language.onlyIfOptions]: ['links'],

            links:
              language.formatDisjunctionList(
                stitchArrays({
                  link: relations.links,
                  releaseContext: data.releaseContexts,
                }).map(({link, releaseContext}) =>
                    link.slot('context', [
                      ...
                      (Array.isArray(slots.context)
                        ? slots.context
                        : [slots.context]),

                      releaseContext,
                    ]))),
          }))),
};
