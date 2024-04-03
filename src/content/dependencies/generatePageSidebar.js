export default {
  contentDependencies: ['generatePageSidebarBox'],
  extraDependencies: ['html'],

  relations: (relation) => ({
    box:
      relation('generatePageSidebarBox'),
  }),

  slots: {
    // Content is a flat HTML array. It'll all be placed into one sidebar box
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

    // Chunks of content to be split into separate boxes in the sidebar.
    boxes: {
      type: 'html',
      mutable: false,
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

  generate(relations, slots, {html}) {
    const attributes =
      html.attributes({class: [
        'sidebar-column',
        'sidebar-multiple',
      ]});

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

    const boxes =
      (!html.isBlank(slots.boxes)
        ? slots.boxes
     : !html.isBlank(slots.content)
        ? relations.box.slot('content', slots.content)
        : html.blank());

    if (html.isBlank(boxes)) {
      return html.blank();
    } else {
      return html.tag('div', attributes, boxes);
    }
  },
};
