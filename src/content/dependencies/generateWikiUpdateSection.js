export default {
  relations: (relation, section) => ({
    contentHeading:
      relation('generateContentHeading'),

    changes:
      relation('transformContent', section.changes),

    link:
      relation('linkWikiUpdateSectionPage', section),
  }),

  data: (section) => ({
    name:
      section.name,

    hash:
      section.hash,
  }),

  slots: {
    showHashPageLinks: {type: 'boolean', default: false},
  },

  generate: (data, relations, slots, {html, language}) =>
    language.encapsulate('wikiUpdatePage.section', capsule =>
      html.tags([
        relations.contentHeading.slots({
          tag: 'h2',
          attributes: {id: data.hash},

          title:
            language.encapsulate(capsule, workingCapsule => {
              const workingOptions = {section: data.name};

              if (slots.showHashPageLinks) {
                workingCapsule += '.withLinks';
                workingOptions.links =
                  html.tag('span', {class: 'hover-links'},
                    language.$(capsule, 'links', {
                      hash:
                        html.tag('a', {href: '#' + data.hash},
                          language.$(capsule, 'links.hash')),

                      page:
                        relations.link
                          .slot('content', language.$(capsule, 'links.page')),
                    }));
              }

              return language.$(workingCapsule, workingOptions);
            }),

          stickyTitle:
            language.$(capsule, {section: data.name}),
        }),

        relations.changes,
      ])),
};
