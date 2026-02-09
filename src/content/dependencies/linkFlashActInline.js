// junk component which only exists because you can't
// "extend" the slots of underlying linkThing.

export default {
  relations: (relation, flashAct) => ({
    link:
      relation('linkThing', 'localized.flashActGallery', flashAct),
  }),

  data: (flashAct) => ({
    name:
      flashAct.name,

    nameHTML:
      flashAct.nameHTML,
  }),

  generate: (data, relations, {html, language}) =>
    relations.link.slot('content',
      html.ifelse([
        html.permit(data.nameHTML, {inline: true}),
        language.sanitize(data.name),
      ])),
};
