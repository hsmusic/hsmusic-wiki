export default {
  relations: (relation, track) => ({
    connectionsContentHeading:
      relation('generateConnectionsContentHeading', track),
  }),

  generate: (relations) =>
    relations.connectionsContentHeading.slots({
      nameSlot: 'track',
      italicize: true,
    }),
};
