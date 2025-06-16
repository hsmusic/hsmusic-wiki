import {isExternalLinkContext} from '#external-links';
import {empty, stitchArrays, unique} from '#sugar';

export default {
  contentDependencies: ['linkExternal'],
  extraDependencies: ['html', 'language'],

  query: (thing) => ({
    album:
      (thing.album
        ? thing.album
        : thing),

    artists:
      thing.artistContribs
        .map(contrib => contrib.artist),

    artistGroups:
      thing.artistContribs
        .map(contrib => contrib.artist)
        .flatMap(artist => artist.closelyLinkedGroups)
        .map(({group}) => group),
  }),

  relations: (relation, _query, thing) => ({
    links:
      thing.urls.map(url => relation('linkExternal', url)),
  }),

  data(query, thing) {
    const data = {};

    data.name = thing.name;

    const artistURLs =
      unique([
        ...query.artists.flatMap(artist => artist.urls),
        ...query.artistGroups.flatMap(group => group.urls),
      ]).map(url => new URL(url));

    const artistBandcampDomains =
      artistURLs
        .filter(url => url.hostname.endsWith('.bandcamp.com'))
        .map(url => url.hostname);

    const getReleaseContext = urlString => {
      const url = new URL(urlString);

      if (url.hostname === 'homestuck.bandcamp.com') {
        return 'officialRelease';
      }

      if (artistBandcampDomains.includes(url.hostname)) {
        return 'artistRelease';
      }

      return null;
    };

    let releaseContexts =
      thing.urls.map(getReleaseContext);

    const albumReleaseContexts =
      query.album.urls.map(getReleaseContext);

    const presentReleaseContexts =
      unique(releaseContexts.filter(Boolean));

    const presentAlbumReleaseContexts =
      unique(albumReleaseContexts.filter(Boolean));

    if (
      presentReleaseContexts.length <= 1 &&
      presentAlbumReleaseContexts.length <= 1
    ) {
      releaseContexts =
        thing.urls.map(() => null);
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
