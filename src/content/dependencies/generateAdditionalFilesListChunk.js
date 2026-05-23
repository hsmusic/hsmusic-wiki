import {compareArrays, stitchArrays} from '#sugar';

export default {
  query(file) {
    const query = {};

    const album =
      (file.thing.isTrack
        ? file.thing.album
     : file.thing.isAlbum
        ? file.thing
        : []);

    // Consider all presented additional file lists, not just ones
    // of the same type as this chunk/list.
    const nearbyAdditionalFiles =
      (album
        ? [...album.additionalFiles,
           ...album.tracks.flatMap(track => [
              ...track.additionalFiles,
              ...track.sheetMusicFiles,
              ...track.midiProjectFiles,
            ])]
        : []);

    const contribsMatch = (a, b) =>
      compareArrays(
        a.artistContribs.map(contrib => contrib.artist),
        b.artistContribs.map(contrib => contrib.artist),
        {checkOrder: false});

    if (
      nearbyAdditionalFiles.every(x => contribsMatch(x, file)) &&
      nearbyAdditionalFiles.every(x => contribsMatch(x, x.thing)) &&
      nearbyAdditionalFiles.every(x => contribsMatch(x, album))
    ) {
      query.contextContribs = file.thing.artistContribs;
    } else {
      query.contextContribs = [];
    }

    return query;
  },

  relations: (relation, query, file) => ({
    description:
      relation('transformContent', file.description),

    links:
      file.filenames
        .map(filename => relation('linkAdditionalFile', file, filename)),

    artistCredit:
      relation('generateArtistCredit', file.artistContribs, query.contextContribs),
  }),

  data: (_query, file) => ({
    title:
      file.title,

    paths:
      file.paths,
  }),

  slots: {
    string: {
      type: 'string',
      default: 'miscellaneousAdditionalFiles',
    },

    showFileSizes: {
      type: 'boolean',
    },
  },

  generate: (data, relations, slots, {getSizeOfMediaFile, html, language, urls}) =>
    language.encapsulate('releaseInfo.additionalFiles', capsule =>
      html.tag('li',
        html.tag('details',
          html.isBlank(relations.links) &&
            {open: true},

          [
            html.tag('summary',
              html.tag('span',
                language.encapsulate(capsule, 'entry', workingCapsule => {
                  const workingOptions = {};
                  const entryCapsule = workingCapsule;

                  const titlePart =
                    (data.title
                      ? language.sanitize(data.title)
                      : language.$('releaseInfo', slots.string, 'entry.placeholderTitle'));

                  workingOptions.title =
                    html.tag('b', titlePart);

                  relations.artistCredit.setSlots({
                    normalStringKey:
                      entryCapsule + '.credit',

                    showAnnotation: true,
                    showExternalLinks: true,
                    showChronology: true,

                    chronologyKind:
                      // Sorry, lol
                      slots.string.replace(/s$/, ''),
                  });

                  if (!html.isBlank(relations.artistCredit)) {
                    workingCapsule += '.withCredit';
                    workingOptions.credit = relations.artistCredit;
                  }

                  return language.$(workingCapsule, workingOptions);
                }))),

            html.tag('ul', [
              html.tag('li', {class: 'entry-description'},
                {[html.onlyIfContent]: true},

                relations.description.slot('mode', 'inline')),

              (html.isBlank(relations.links)
                ? html.tag('li',
                    language.$(capsule, 'entry.noFilesAvailable'))

                : stitchArrays({
                    link: relations.links,
                    path: data.paths,
                  }).map(({link, path}) =>
                      html.tag('li',
                        language.encapsulate(capsule, 'file', workingCapsule => {
                          const workingOptions = {file: link};

                          if (slots.showFileSizes) {
                            const fileSize =
                              getSizeOfMediaFile(
                                urls
                                  .from('media.root')
                                  .to(...path));

                            if (fileSize) {
                              workingCapsule += '.withSize';
                              workingOptions.size =
                                language.formatFileSize(fileSize);
                            }
                          }

                          return language.$(workingCapsule, workingOptions);
                        })))),
            ]),
          ]))),
};
