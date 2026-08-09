export default {
  relations: (relation, _thing) => ({
    contentHeading:
      relation('generateContentHeading'),
  }),

  data: (thing) => ({
    name: thing.name,
    nameStyle: thing.nameStyle,
  }),

  slots: {
    attributes: {type: 'attributes', mutable: false},
    string: {type: 'string'},
    nameSlot: {type: 'string'},

    italicize: {type: 'boolean', default: false},
  },

  generate(data, relations, slots, {html, language}) {
    const namePart =
      (data.nameStyle === 'utility' ||
       data.nameStyle === 'unofficial' ||
       data.nameStyle === 'unofficial localization'
        ? null
     : slots.italicize
        ? html.tag('i', language.sanitize(data.name))
        : language.sanitize(data.name));

    const title =
      (namePart
        ? language.$(slots.string, {[slots.nameSlot]: namePart})
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
