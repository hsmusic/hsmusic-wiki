export default {
  extraDependencies: [
    'html',
  ],

  generate({html}) {
    return html.template(slot =>
      html.tag('p',
        {
          class: 'content-heading',
          id: slot('id'),
          tabindex: '0',
        },
        slot('title')));
  }
}
