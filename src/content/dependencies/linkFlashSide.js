export default {
  relations: (relation, flashSide) => ({
    link:
      relation('linkFlashAct', flashSide.acts[0]),
  }),

  data: (flashSide) => ({
    name:
      flashSide.name,

    color:
      flashSide.color,
  }),

  generate: (data, relations) =>
    relations.link.slots({
      content: data.name,
      color: data.color,
    }),
};
