import {empty, filterMultipleArrays, stitchArrays} from '#sugar';

export default {
  extraDependencies: ['html'],

  slots: {
    // Content is a flat HTML array. It'll generate one sidebar section
    // if specified.
    content: {
      type: 'html',
      mutable: false,
    },

    // Attributes to apply to the whole sidebar. If specifying multiple
    // sections, this be added to the containing sidebar-column, arr - specify
    // attributes on each section if that's more suitable.
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    // Chunks of content to be split into separate sections or "boxes" in the
    // sidebar. Each of these can also be associated with HTML attributes.
    multipleContents: {
      validate: v => v.strictArrayOf(v.isHTML),
    },

    multipleAttributes: {
      validate: v => v.strictArrayOf(v.isAttributes),
    },

    // Sticky mode controls which sidebar sections, if any, follow the
    // scroll position, "sticking" to the top of the browser viewport.
    //
    // 'last' - last or only sidebar box is sticky
    // 'column' - entire column, incl. multiple boxes from top, is sticky
    // 'static' - sidebar not sticky at all, stays at top of page
    //
    // Note: This doesn't affect the content of any sidebar section, only
    // the whole section's containing box (or the sidebar column as a whole).
    stickyMode: {
      validate: v => v.is('last', 'column', 'static'),
      default: 'static',
    },

    // Collapsing sidebars disappear when the viewport is sufficiently
    // thin. (This is the default.) Override as false to make the sidebar
    // stay visible in thinner viewports, where the page layout will be
    // reflowed so the sidebar is as wide as the screen and appears below
    // nav, above the main content.
    collapse: {
      type: 'boolean',
      default: true,
    },

    // Wide sidebars generally take up more horizontal space in the normal
    // page layout, and should be used if the content of the sidebar has
    // a greater than typical focus compared to main content.
    wide: {
      type: 'boolean',
      default: false,
    },
  },

  generate(slots, {html}) {
    const attributes =
      html.attributes({class: 'sidebar-column'});

    attributes.add(slots.attributes);

    if (slots.class) {
      attributes.add('class', slots.class);
    }

    if (slots.wide) {
      attributes.add('class', 'wide');
    }

    if (!slots.collapse) {
      attributes.add('class', 'no-hide');
    }

    if (slots.stickyMode !== 'static') {
      attributes.add('class', `sticky-${slots.stickyMode}`);
    }

    let content = slots.content;

    if (html.isBlank(content)) {
      if (!slots.multipleContents) {
        return html.blank();
      }

      const multipleContents = slots.multipleContents.slice();
      const multipleAttributes = slots.multipleAttributes?.slice() ?? [];

      filterMultipleArrays(
        multipleContents,
        multipleAttributes,
        content => !html.isBlank(content));

      if (empty(multipleContents)) {
        return html.blank();
      }

      attributes.add('class', 'sidebar-multiple');
      content =
        stitchArrays({
          content: multipleContents,
          attributes: multipleAttributes,
        }).map(({content, attributes}) =>
            html.tag('div', {class: 'sidebar'},
              attributes,
              content));
    } else {
      attributes.add('class', 'sidebar');
    }

    return html.tag('div', attributes, content);
  },
};
