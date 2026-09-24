export default {
  relations: (relation, section) => ({
    sidebar:
      relation('generatePageSidebar'),

    sectionListBox:
      relation('generateWikiUpdateSidebarSectionListBox',
        section.update,
        section),
  }),

  generate: (relations) =>
    relations.sidebar.slots({
      stickyMode: 'column',
      boxes: [relations.sectionListBox],
    }),
};
