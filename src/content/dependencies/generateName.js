export default {
  relations: (relation, thing) => ({
    customName:
      (thing.nameText
        ? relation('transformContent', thing.nameText)
        : null),
  }),

  data: (thing) => ({
    normalName:
      thing.name,

    shortName:
      thing.nameShort,
  }),

  slots: {
    preferShortName: {
      type: 'boolean',
      default: false,
    },
  },

  generate: (data, relations, slots, {language}) =>
    (relations.customName
      ? relations.customName.slot('mode', 'inline')
   : slots.preferShortName && data.shortName
      ? language.sanitize(data.shortName)
      : language.sanitize(data.normalName)),
};
