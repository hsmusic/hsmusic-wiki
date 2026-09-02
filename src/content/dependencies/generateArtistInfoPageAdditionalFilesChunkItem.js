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

        const titleText =
          (data.title
            ? language.sanitize(data.title)
            : language.$(capsule, 'placeholderTitle'));

        workingOptions.title =
          (numFiles >= 2
            ? html.tag('b', titleText)
            : relations.fileLinks[0].slot('content', titleText));

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

        if (numFiles >= 2) {
          workingCapsule += '.withMultipleFiles';
          workingOptions.files =
            language.countFiles(numFiles, {unit: true});
        } else if (numFiles === 0) {
          workingCapsule += '.withNoFiles';
        }

        const annotation =
          language.formatUnitList(data.contribAnnotationParts);

        if (!html.isBlank(annotation)) {
          workingCapsule += '.withAnnotation';
          workingOptions.annotation = annotation;
        }

        return language.$(workingCapsule, workingOptions);
      });

    if (numFiles >= 2) {
      relations.template.setSlot('content',
        html.tag('details',
          html.tag('summary',
            html.tag('span', titleLine)),

          html.tag('ul',
            stitchArrays({
              link: relations.fileLinks,
              filename: data.filenames,
            }).map(({link, filename}) =>
                html.tag('li',
                  link.slot('content', language.sanitize(filename)))))));
    } else {
      relations.template.setSlot('content', titleLine);
    }

    return relations.template;
  },
};
