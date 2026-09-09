export default {
  generate: ({html}) =>
    html.tag('li', {class: 'divider'},
      html.tag('hr')),
};
