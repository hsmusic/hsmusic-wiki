import {stitchArrays} from '#sugar';

export default {
  relations: (relation, additionalFiles) => ({
    links:
      additionalFiles
        .map(file => file.filenames
          .map(filename => relation('linkAdditionalFile', file, filename))),

    artistCredits:
      additionalFiles
        .map(file =>
          relation('generateArtistCredit', file.artistContribs, [])),
  }),

  data: (additionalFiles) => ({
    titles:
      additionalFiles
        .map(file => file.title),

    filenames:
      additionalFiles
        .map(file => file.filenames),
  }),

  slots: {
    title: {
      type: 'html',
      mutable: false,
    },

    stringsKey: {type: 'string'},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('listingPage', slots.stringsKey, pageCapsule =>
      html.tags([
        html.tag('dt',
          {[html.onlyIfSiblings]: true},
          slots.title),

        html.tag('dd',
          {[html.onlyIfContent]: true},

          html.tag('ul',
          {[html.onlyIfContent]: true},

            stitchArrays({
              title: data.titles,
              artistCredit: relations.artistCredits,
              links: relations.links,
              filenames: data.filenames,
            }).map(({
                title,
                artistCredit,
                links,
                filenames,
              }) =>
                language.encapsulate(pageCapsule, 'file', capsule => {
                  const titleLine =
                    language.encapsulate(capsule, workingCapsule => {
                      const workingOptions = {};

                      const titlePart =
                        (title
                          ? language.sanitize(title)
                          : language.$(capsule, 'placeholderTitle'));

                      workingOptions.title =
                        (links.length <= 1
                          ? links[0].slot('content', titlePart)
                          : html.tag('b', titlePart));

                      artistCredit.setSlots({
                        normalStringKey: capsule + '.credit',
                      });

                      if (!html.isBlank(artistCredit)) {
                        workingCapsule += '.withCredit';
                        workingOptions.credit = artistCredit;
                      }

                      if (links.length === 0) {
                        workingCapsule += '.withNoFiles';
                      } else if (links.length >= 2) {
                        workingCapsule += '.withMultipleFiles';
                        workingOptions.files =
                          language.countFiles(links.length, {unit: true});
                      }

                      return language.$(workingCapsule, workingOptions);
                    });

                  if (links.length <= 1) {
                    return html.tag('li', titleLine);
                  }

                  const summary =
                    html.tag('summary',
                      html.tag('span', titleLine));

                  const list =
                    html.tag('ul',
                      stitchArrays({
                        link: links,
                        filename: filenames,
                      }).map(({link, filename}) =>
                          html.tag('li',
                            link.slots({
                              content:
                                language.$(capsule, {
                                  title: filename,
                                }),
                            }))));

                    return (
                      html.tag('li',
                        html.tag('details', [summary, list]))
                    );
                  })))),
      ])),
};
