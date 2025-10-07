import {onlyItem, stitchArrays} from '#sugar';

export default {
  query(track) {
    const query = {};

    query.singleSingle =
      onlyItem(
        track.otherReleases.filter(track => track.album.style === 'single'));

    query.regularReleases =
      (query.singleSingle
        ? track.otherReleases.filter(track => track !== query.singleSingle)
        : track.otherReleases);

    return query;
  },

  relations: (relation, query, _track) => ({
    singleLink:
      (query.singleSingle
        ? relation('linkTrack', query.singleSingle)
        : null),

    trackLinks:
      query.regularReleases
        .map(track => relation('linkTrack', track)),
  }),

  data: (query, _track) => ({
    albumNames:
      query.regularReleases
        .map(track => track.album.name),

    albumColors:
      query.regularReleases
        .map(track => track.album.color),
  }),

  generate: (data, relations, {html, language}) =>
    html.tag('p',
      {[html.onlyIfContent]: true},

      language.encapsulate('releaseInfo.alsoReleased', capsule =>
        language.encapsulate(capsule, workingCapsule => {
          const workingOptions = {};

          let any = false;

          const albumList =
            language.formatConjunctionList(
              stitchArrays({
                trackLink: relations.trackLinks,
                albumName: data.albumNames,
                albumColor: data.albumColors,
              }).map(({trackLink, albumName, albumColor}) =>
                  trackLink.slots({
                    content: language.sanitize(albumName),
                    color: albumColor,
                  })));

          if (!html.isBlank(albumList)) {
            any = true;
            workingCapsule += '.onAlbums';
            workingOptions.albums = albumList;
          }

          if (relations.singleLink) {
            any = true;
            workingCapsule += '.asSingle';
            workingOptions.single =
              relations.singleLink.slots({
                content: language.$(capsule, 'single'),
              });
          }

          if (any) {
            return language.$(workingCapsule, workingOptions);
          } else {
            return html.blank();
          }
        }))),
};
