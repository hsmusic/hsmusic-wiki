import {stitchArrays} from '#sugar';

export default {
  query(_artist, contribs) {
    const query = {};

    query.additionalFile = contribs[0].thing;

    query.albumOrTrack = query.additionalFile.thing;

    query.album =
      (query.albumOrTrack.isAlbum
        ? query.albumOrTrack
        : query.albumOrTrack.album);

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
        query.additionalFile.artistContribs,
        [artist.mockSimpleContribution]),

    fileLinks:
      query.additionalFile.filenames
        .map(filename =>
          relation('linkAdditionalFile', query.additionalFile, filename)),
  }),

  data: (query, _artist, contribs) => ({
    for:
      (query.albumOrTrack.isAlbum
        ? 'album'
        : 'track'),

    title:
      query.additionalFile.title,

    filenames:
      query.additionalFile.filenames,

    contribAnnotationParts:
      contribs.flatMap(contrib => contrib.annotationParts),
  }),

  slots: {
    string: {
      type: 'string',
      default: 'additionalFile',
    },

    disableStandaloneWithFiles: {
      type: 'boolean',
      default: false,
    },
  },

  generate(data, relations, slots, {html, language}) {
    const numFiles = data.filenames.length;
    const capsule =
      language.encapsulate(
        'artistPage.creditList.entry', data.for, slots.string);

    const titleLine =
      language.encapsulate(capsule, workingCapsule => {
        const workingOptions = {};

        const titlePart =
          (data.title
            ? language.sanitize(data.title)
            : language.$(capsule, 'placeholderTitle'));

        workingOptions.title =
          (numFiles <= 1
            ? relations.fileLinks[0].slot('content', titlePart)
            : html.tag('b', titlePart));

        if (data.for === 'track') {
          workingOptions.track = relations.trackLink;
        }

        relations.artistCredit.setSlots({
          normalStringKey: capsule + '.credit',
        });

        if (!html.isBlank(relations.artistCredit)) {
          workingCapsule += '.withCredit';
          workingOptions.credit = relations.artistCredit;
        }

        if (numFiles === 0) {
          workingCapsule += '.withNoFiles';
        } else if (numFiles >= 2) {
          workingCapsule += '.withMultipleFiles';
          workingOptions.files =
            language.countFiles(numFiles, {unit: true});
        }

        const annotation =
          language.formatUnitList(data.contribAnnotationParts);

        if (!html.isBlank(annotation)) {
          workingCapsule += '.withAnnotation';
          workingOptions.annotation = annotation;
        }

        return language.$(workingCapsule, workingOptions);
      });

    if (relations.fileLinks.length <= 1) {
      relations.template.setSlot('content', titleLine);
    } else {
      const summary =
        html.tag('summary',
          html.tag('span', titleLine));

      const list =
        html.tag('ul',
          stitchArrays({
            link: relations.fileLinks,
            filename: data.filenames,
          }).map(({link, filename}) =>
              html.tag('li',
                link.slot('content', language.sanitize(filename)))));

      const details = html.tag('details', [summary, list]);
      relations.template.setSlot('content', details);
    }

    return relations.template;
  },
};
