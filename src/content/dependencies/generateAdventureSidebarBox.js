export default {
  relations: (relation, adventure, flash) => ({
    box:
      relation('generatePageSidebarBox'),

    adventureLink:
      relation('linkAdventure', adventure),

    acts:
      adventure.acts.map(act =>
        relation('generateAdventureSidebarAct', adventure, flash, act)),
  }),

  generate: (relations, {html}) =>
    relations.box.slots({
      attributes: {class: 'adventure-sidebar-box'},

      content: [
        html.tag('h1', relations.adventureLink),

        relations.acts,
      ],
    }),
};