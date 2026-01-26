export default ({
  documentModes: {oneDocumentTotal},
  thingConstructors: {WikiInfo},
}) => ({
  title: `Process wiki info file`,
  file: 'wiki-info.yaml',

  documentMode: oneDocumentTotal,
  documentThing: WikiInfo,
});
