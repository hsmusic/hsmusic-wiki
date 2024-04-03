export default {
  contentDependencies: [
    'generateFlashActSidebarCurrentActBox',
    'generateFlashActSidebarSideMapBox',
    'generatePageSidebar',
  ],

  relations: (relation, act, flash) => ({
    sidebar:
      relation('generatePageSidebar'),

    currentActBox:
      relation('generateFlashActSidebarCurrentActBox', act, flash),

    sideMapBox:
      relation('generateFlashActSidebarSideMapBox', act, flash),
  }),

  data: (_act, flash) => ({
    isFlashActPage: !flash,
  }),

  generate: (data, relations) =>
    relations.sidebar.slots({
      boxes:
        (data.isFlashActPage
          ? [relations.sideMapBox, relations.currentActBox]
          : [relations.currentActBox, relations.sideMapBox]),
    }),
};
