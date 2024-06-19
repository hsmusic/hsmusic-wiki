/* eslint-env browser */

export function rebase(href, rebaseKey = 'rebaseLocalized') {
  const relative = (document.documentElement.dataset[rebaseKey] || '.') + '/';
  if (relative) {
    return relative + href;
  } else {
    return href;
  }
}

export function cssProp(el, ...args) {
  if (typeof args[0] === 'string' && args.length === 1) {
    return getComputedStyle(el).getPropertyValue(args[0]).trim();
  }

  if (typeof args[0] === 'string' && args.length === 2) {
    if (args[1] === null) {
      el.style.removeProperty(args[0]);
    } else {
      el.style.setProperty(args[0], args[1]);
    }
    return;
  }

  if (typeof args[0] === 'object') {
    for (const [property, value] of Object.entries(args[0])) {
      cssProp(el, property, value);
    }
  }
}

export function templateContent(el) {
  if (el === null) {
    return null;
  }

  if (el?.nodeName !== 'TEMPLATE') {
    throw new Error(`Expected a <template> element`);
  }

  return el.content.cloneNode(true);
}

// Curry-style, so multiple points can more conveniently be tested at once.
export function pointIsOverAnyOf(elements) {
  return (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    return elements.some(el => el.contains(element));
  };
}

export function getVisuallyContainingElement(child) {
  let parent = child.parentElement;

  while (parent) {
    if (
      cssProp(parent, 'overflow') === 'hidden' ||
      cssProp(parent, 'contain') === 'paint'
    ) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return null;
}

// TODO: These should pro8a8ly access some shared urlSpec path. We'd need to
// separ8te the tooling around that into common-shared code too.

/*
const getLinkHref = (type, directory) => rebase(`${type}/${directory}`);
*/

export const openAlbum = d => rebase(`album/${d}`);
export const openArtTag = d => rebase(`tag/${d}`);
export const openArtist = d => rebase(`artist/${d}`);
export const openFlash = d => rebase(`flash/${d}`);
export const openGroup = d => rebase(`group/${d}`);
export const openTrack = d => rebase(`track/${d}`);

// TODO: This should also use urlSpec.

/*
export function fetchData(type, directory) {
  return fetch(rebase(`${type}/${directory}/data.json`, 'rebaseData')).then(
    (res) => res.json()
  );
}
*/

// TODO: This should probably be imported from another file.
export function dispatchInternalEvent(event, eventName, ...args) {
  const info = event[Symbol.for('hsmusic.clientInfo')];

  if (!info) {
    throw new Error(`Expected event to be stored on clientInfo`);
  }

  const infoName = info.id;

  const {[eventName]: listeners} = event;

  if (!listeners) {
    throw new Error(`Event name "${eventName}" isn't stored on ${infoName}.event`);
  }

  let results = [];
  for (const listener of listeners) {
    try {
      results.push(listener(...args));
    } catch (error) {
      console.error(`Uncaught error in listener for ${infoName}.${eventName}`);
      console.error(error);
      results.push(undefined);
    }
  }

  return results;
}
