import {compareArrays, empty, stitchArrays} from '#sugar';

export default {
  contentDependencies: ['linkAlbum', 'linkTrack'],
  extraDependencies: ['html', 'language'],

  query: (album, contextMedium) => ({
    trackRepresentations:
      album.tracks
        .filter(track =>
          track.representedMedia
            .some(({medium}) => medium === contextMedium))

        .flatMap(track =>
          track.representedMedia
            .filter(({medium}) => medium === contextMedium)
            .map(({annotation}) => ({track, annotation}))),
  }),

  relations: (relation, query, album, _contextMedium) => ({
    albumLink:
      relation('linkAlbum', album),

    trackLinks:
      query.trackRepresentations
        .map(({track}) => relation('linkTrack', track)),
  }),

  data: (query, album, contextMedium) => ({
    mediumName:
      contextMedium.name,

    albumRepresentsMedium:
      album.representedMedia
        .some(({medium}) => medium === contextMedium),

    allTracksRepresentMedium:
      compareArrays(
        query.trackRepresentations.map(({track}) => track),
        album.tracks),

    trackAnnotations:
      query.trackRepresentations
        .map(({annotation}) => annotation),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('mediumPage.musicThatRepresents', listCapsule => [
      html.tag('dt',
        language.encapsulate(listCapsule, 'item.album', workingCapsule => {
          const workingOptions = {album: relations.albumLink};

          if (!data.albumRepresentsMedium) {
            workingCapsule += '.tracksFrom';
          }

          return language.$(workingCapsule, workingOptions);
        })),

      html.tag('dd',
        (data.allTracksRepresentMedium
          ? language.$(listCapsule, 'item.album.allTracksRepresent', {
              medium: data.mediumName,
            })

          : html.tag('ul',
              stitchArrays({
                link: relations.trackLinks,
                annotation: data.trackAnnotations,
              }).map(({link, annotation}) =>
                  html.tag('li',
                    language.encapsulate(listCapsule, 'item', itemCapsule => {
                      let item = language.$(itemCapsule, 'track', {track: link});

                      let accentParts = [], accentOptions = {};

                      if (annotation) {
                        accentParts.push('withAnnotation');
                        accentOptions.annotation = annotation;
                      }

                      if (!empty(accentParts)) {
                        item = language.$(itemCapsule, 'withAccent', {
                          item,

                          accent:
                            language.$(
                              itemCapsule, 'accent', ...accentParts,
                              accentOptions),
                        });
                      }

                      return item;
                    })))))),
    ]),
};
