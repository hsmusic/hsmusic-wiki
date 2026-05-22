import {compareArrays, stitchArrays} from '#sugar';

export default {
  query: (file) => ({
    contextContribs:
      ((file.thing.isTrack &&
        compareArrays(
          file.thing.artistContribs.map(contrib => contrib.artist),
          file.thing.album.artistContribs.map(contrib => contrib.artist),
          {checkOrder: false}))

        ? file.thing.artistContribs

     : file.thing.isAlbum
        ? file.thing.artistContribs

        : []),
  }),

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
