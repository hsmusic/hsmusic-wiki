export default {
  extraDependencies: ['html'],

  slots: {
    // Attributes to apply to the whole sidebar. This be added to the
    // containing sidebar-column, arr - specify attributes on each section if
    // that's more suitable.
    attributes: {
      type: 'attributes',
      mutable: false,
    },

    // Content boxes to line up vertically in the sidebar.
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
      html.attributes({class: [
        'sidebar-column',
        'sidebar-multiple',
      ]});

    attributes.add(slots.attributes);

    if (slots.wide) {
      attributes.add('class', 'wide');
    }

    if (slots.stickyMode !== 'static') {
      attributes.add('class', `sticky-${slots.stickyMode}`);
    }

    const {content: boxes} = html.smooth(slots.boxes);

    const allBoxesCollapsible =
      boxes.every(box =>
        html.resolve(box)
          .attributes
          .has('class', 'collapsible'));

    if (allBoxesCollapsible) {
      attributes.add('class', 'all-boxes-collapsible');
    }

    if (html.isBlank(slots.boxes)) {
      return html.blank();
    } else {
      return html.tag('div', attributes, slots.boxes);
    }
  },
};
