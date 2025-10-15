export const info = {
  id: `draggedLinkInfo`,

  state: {
    latestDraggedLink: null,
    observedLinks: new WeakSet(),
  },
};

export function getPageReferences() {
  // First start handling all the links that currently exist.

  for (const a of document.getElementsByTagName('a')) {
    observeLink(a);
    addDragListener(a);
  }

  // Then add a mutation observer to track new links.

  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeName !== 'A') continue;
        observeLink(node);
      }
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
  });
}

export function getLatestDraggedLink() {
  const {state} = info;

  if (state.latestDraggedLink) {
    return state.latestDraggedLink.deref() ?? null;
  } else {
    return null;
  }
}

function observeLink(link) {
  const {state} = info;

  if (state.observedLinks.has(link)) return;

  state.observedLinks.add(link);
  addDragListener(link);
}

function addDragListener(link) {
  const {state} = info;

  link.addEventListener('dragstart', _domEvent => {
    state.latestDraggedLink = new WeakRef(link);
  });
}
