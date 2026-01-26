import Thing from '#thing';

export default ({
  documentModes: {allInOne},
  thingConstructors: {Group, GroupCategory},
}) => ({
  title: `Process groups file`,
  file: 'groups.yaml',

  documentMode: allInOne,
  documentThing: document =>
    ('Category' in document
      ? GroupCategory
      : Group),

  connect(results) {
    let groupCategory;
    let groupRefs = [];

    if (results[0] && !(results[0] instanceof GroupCategory)) {
      throw new Error(`Expected a category at top of group data file`);
    }

    for (const thing of results) {
      if (thing instanceof GroupCategory) {
        if (groupCategory) {
          Object.assign(groupCategory, {groups: groupRefs});
        }

        groupCategory = thing;
        groupRefs = [];
      } else {
        groupRefs.push(Thing.getReference(thing));
      }
    }

    if (groupCategory) {
      Object.assign(groupCategory, {groups: groupRefs});
    }
  },

  // Groups aren't sorted at all, always preserving the order in the data
  // file as-is.
  sort: null,
});
