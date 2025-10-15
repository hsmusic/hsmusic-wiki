import {stitchArrays} from '../../shared-util/sugar.js';

export const info = {
  id: 'memorableDetailsInfo',

  details: null,
  ids: null,

  session: {
    openDetails: {
      type: 'json',
      maxLength: settings => settings.maxOpenDetailsStorage,
    },
  },

  settings: {
    maxOpenDetailsStorage: 1000,
  },
};

export function getPageReferences() {
  info.details =
    Array.from(document.querySelectorAll('details.memorable'));

  info.ids =
    info.details.map(details => details.getAttribute('data-memorable-id'));
}

export function mutatePageContent() {
  stitchArrays({
    details: info.details,
    id: info.ids,
  }).forEach(({details, id}) => {
      if (info.session.openDetails?.includes(id)) {
        details.open = true;
      }
    });
}

export function addPageListeners() {
  for (const [index, details] of info.details.entries()) {
    details.addEventListener('toggle', () => {
      handleDetailsToggled(index);
    });
  }
}

function handleDetailsToggled(index) {
  const details = info.details[index];
  const id = info.ids[index];

  if (details.open) {
    if (info.session.openDetails) {
      info.session.openDetails = [...info.session.openDetails, id];
    } else {
      info.session.openDetails = [id];
    }
  } else if (info.session.openDetails?.includes(id)) {
    info.session.openDetails =
      info.session.openDetails.filter(item => item !== id);
  }
}
