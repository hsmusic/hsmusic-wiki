export default ({
  documentModes: {allInOne},
  thingConstructors: {DocumentSortingRule},
}) => ({
  title: `Process sorting rules file`,
  file: 'sorting-rules.yaml',

  documentMode: allInOne,
  documentThing: document =>
    (document['Sort Documents']
      ? DocumentSortingRule
      : null),
});
