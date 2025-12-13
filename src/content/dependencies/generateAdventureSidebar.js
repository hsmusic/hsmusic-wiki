export default {
  relations: (relation, adventure, flash) => ({
    sidebar:
      relation('generatePageSidebar'),

    box:
      relation('generateAdventureSidebarBox', adventure, flash),
  }),

  generate: (relations) =>
    relations.sidebar.slots({
      boxes: [
        relations.box,
      ],
    }),
};