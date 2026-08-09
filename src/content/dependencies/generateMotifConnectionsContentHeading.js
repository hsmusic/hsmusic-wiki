export default {
  relations: (relation, motif) => ({
    connectionsContentHeading:
      relation('generateConnectionsContentHeading', motif),
  }),

  generate: (relations) =>
    relations.connectionsContentHeading.slots({
      nameSlot: 'motif',
      italicize: false,
    }),
};
