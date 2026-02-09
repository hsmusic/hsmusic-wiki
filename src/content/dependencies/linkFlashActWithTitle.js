export default {
  relations: (relation, flashAct) => ({
    link:
      relation('linkThing', 'localized.flashActGallery', flashAct),

    titleColorStyle:
      (flashAct.titleColor && flashAct.titleColor !== flashAct.color
        ? relation('generateColorStyleAttribute', flashAct.titleColor)
        : null),
  }),

  data: (flashAct) => ({
    name: flashAct.name,
    title: flashAct.title,
  }),

  generate: (data, relations, {html, language}) =>
    (data.title
      ? relations.link.slot('content',
          language.$('misc.flashActWithTitle', {
            act: data.name,
            title:
              html.tag('span', {class: 'flash-act-title'},
                relations.titleColorStyle,
                language.sanitize(data.title)),
          }))
      : relations.link),
};
