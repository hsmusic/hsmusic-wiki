export default {
  relations: (relation, update, _section) => ({
    box:
      relation('generatePageSidebarBox'),

    updateLink:
      relation('linkWikiUpdate', update),

    // TODO: if this is used on the actual wiki update page, it'll have to be
    // one of either a link to the section page, or to the section's hash on
    // the current page
    sectionLinks:
      update.sections
        .map(section => relation('linkWikiUpdateSectionPage', section)),
  }),

  data: (update, section) => ({
    isSectionPage:
      !!section,

    currentSectionIndex:
      (section
        ? update.sections.indexOf(section)
        : null),
  }),

  generate: (data, relations, {html, language}) =>
    language.encapsulate('wikiUpdateSidebar', capsule =>
      relations.box.slots({
        attributes: {class: 'wiki-update-section-list-sidebar-box'},

        content: [
          html.tag('h1', {[html.onlyIfSiblings]: true},
            relations.updateLink),

          html.tag('details',
            data.isSectionPage && {open: true},

            html.tag('summary', {[html.onlyIfSiblings]: true},
              html.tag('span',
                html.tag('b',
                  language.$(capsule, 'sectionList')))),

            html.tag('ul', {[html.onlyIfContent]: true},
              relations.sectionLinks.map((link, index) =>
                html.tag('li',
                  (index === data.currentSectionIndex
                    ? link.slot('attributes', {class: 'current'})
                    : link))))),
        ],
      })),
};
