export default {
  relations: (relation, _thing) => ({
    contentHeading:
      relation('generateContentHeading'),
  }),

  data: (nameSlot, thing) => ({
    nameSlot,

    name: thing.name,
    nameStyle: thing.nameStyle,
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
    string: {type: 'string'},
  },

  generate(data, relations, slots, {html, language}) {
    const namePart =
      (data.nameStyle === 'utility' ||
       data.nameStyle === 'unofficial' ||
       data.nameStyle === 'unofficial localization'
        ? null
        : html.tag('i', data.name));

    const title =
      (namePart
        ? language.$(slots.string, {[data.nameSlot]: namePart})
        : language.$(slots.string, 'withoutName'));

    const stickyTitle =
      language.$(slots.string, 'sticky');

    return relations.contentHeading.slots({
      attributes: slots.attributes,
      title,
      stickyTitle,
    });
  },
};
