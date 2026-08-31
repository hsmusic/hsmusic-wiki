export default {
  relations: (relation, motif) => ({
    sidebar:
      relation('generatePageSidebar'),

    allMotifsBox:
      relation('generateAllMotifsSidebarBox', motif),
  }),

  generate: (relations) =>
    relations.sidebar.slots({
      boxes: [relations.allMotifsBox],
    }),
};
