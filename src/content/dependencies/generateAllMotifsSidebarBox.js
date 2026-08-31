export default {
  sprawl: ({motifSectionData}) =>
    ({motifSectionData}),

  relations: (relation, sprawl, motif) => ({
    box:
      relation('generatePageSidebarBox'),

    sections:
      sprawl.motifSectionData
        .map(section =>
          relation('generateMotifSidebarMotifSection', motif, section)),
  }),

  generate: (relations, {html, language}) =>
    language.encapsulate('motifSidebar', capsule =>
      relations.box.slots({
        attributes: {class: 'motif-list-sidebar-box'},

        content: [
          html.tag('h1',
            language.$(capsule, 'title')),

          relations.sections,
        ],
      })),
};
