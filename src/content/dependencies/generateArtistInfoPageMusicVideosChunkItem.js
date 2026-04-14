import {empty} from '#sugar';
import {selectRepresentativeArtistContributorContribs} from '#wiki-data';

export default {
  query(_artist, contribs) {
    const query = {};

    query.musicVideo = contribs[0].thing;

    query.albumOrTrack = query.musicVideo.thing;

    query.album =
      (query.albumOrTrack.isAlbum
        ? query.albumOrTrack
        : query.albumOrTrack.album);

    query.displayedContributions =
      selectRepresentativeArtistContributorContribs(contribs);

    return query;
  },

  relations: (relation, query, artist, _contribs) => ({
    template:
      relation('generateArtistInfoPageChunkItem'),

    trackLink:
      (query.albumOrTrack.isTrack
        ? relation('linkTrack', query.albumOrTrack)
        : null),

    artistCredit:
      relation('generateArtistCredit',
        query.musicVideo.artistContribs,
        (empty(query.album.artistContribs)
          ? [artist.mockSimpleContribution]
          : query.album.artistContribs)),

    externalLinks:
      query.musicVideo.urls
        .map(url => relation('linkExternal', url)),
  }),

  data: (query, _artist, contribs) => ({
    date: contribs[0].date,

    for:
      (query.albumOrTrack.isAlbum
        ? 'album'
        : 'track'),

    title: query.musicVideo.title,
    label: query.musicVideo.label,

    contribAnnotationParts:
      (query.displayedContributions
        ? query.displayedContributions
            .flatMap(contrib => contrib.annotationParts)
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    relations.template.slots({
      annotation:
        (data.contribAnnotationParts
          ? language.formatUnitList(data.contribAnnotationParts)
          : html.blank()),

      content:
        language.encapsulate('artistPage.creditList.entry', entryCapsule => {
          let workingCapsule = entryCapsule;
          let workingOptions = {};

          workingCapsule += '.' + data.for + '.musicVideo';

          const musicVideoCapsule = workingCapsule;

          if (data.for === 'track') {
            workingOptions.track =
              relations.trackLink;
          }

          if (data.date) {
            workingCapsule += '.withDate';
            workingOptions.date = language.formatDate(data.date);
          }

          relations.artistCredit.setSlots({
            normalStringKey:
              musicVideoCapsule + '.credit' +
                (data.title ? '.alongsideTitle'
               : data.label ? '.alongsideLabel'
                            : ''),
          });

          if (!html.isBlank(relations.artistCredit)) {
            workingCapsule += '.withCredit';
            workingOptions.credit = relations.artistCredit;
          }

          if (data.title) {
            workingCapsule += '.withTitle';
            workingOptions.title = language.sanitize(data.title);
          } else if (data.label) {
            workingCapsule += '.withLabel';
            workingOptions.label = language.sanitize(data.label);
          }

          if (!empty(relations.externalLinks)) {
            workingCapsule += '.withLinks';
            workingOptions.links =
              language.formatUnitList(relations.externalLinks);
          }

          return language.$(workingCapsule, workingOptions);
        }),
    }),
};
