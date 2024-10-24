/* eslint-env browser */

export const info = {
  id: 'artTagGalleryFilterInfo',

  featuredAllLine: null,
  showingAllLine: null,
  showingAllLink: null,

  featuredDirectLine: null,
  showingDirectLine: null,
  showingDirectLink: null,

  featuredIndirectLine: null,
  showingIndirectLine: null,
  showingIndirectLink: null,
};

export function getPageReferences() {
  if (document.documentElement.dataset.urlKey !== 'localized.artTagGallery') {
    return;
  }

  info.featuredAllLine =
    document.getElementById('featured-all-line');

  info.featuredDirectLine =
    document.getElementById('featured-direct-line');

  info.featuredIndirectLine =
    document.getElementById('featured-indirect-line');

  info.showingAllLine =
    document.getElementById('showing-all-line');

  info.showingDirectLine =
    document.getElementById('showing-direct-line');

  info.showingIndirectLine =
    document.getElementById('showing-indirect-line');

  info.showingAllLink =
    info.showingAllLine?.querySelector('a') ?? null;

  info.showingDirectLink =
    info.showingDirectLine?.querySelector('a') ?? null;

  info.showingIndirectLink =
    info.showingIndirectLine?.querySelector('a') ?? null;

  info.gridItems =
    Array.from(
      document.querySelectorAll('#content .grid-listing .grid-item'));

  info.gridItemsOnlyFeaturedIndirectly =
    info.gridItems
      .filter(gridItem => gridItem.classList.contains('featured-indirectly'));

  info.gridItemsFeaturedDirectly =
    info.gridItems
      .filter(gridItem => !gridItem.classList.contains('featured-indirectly'));
}

function filterArtTagGallery(showing) {
  let gridItemsToShow;

  switch (showing) {
    case 'all':
      gridItemsToShow = info.gridItems;
      break;

    case 'direct':
      gridItemsToShow = info.gridItemsFeaturedDirectly;
      break;

    case 'indirect':
      gridItemsToShow = info.gridItemsOnlyFeaturedIndirectly;
      break;
  }

  for (const gridItem of info.gridItems) {
    if (gridItemsToShow.includes(gridItem)) {
      gridItem.style.removeProperty('display');
    } else {
      gridItem.style.display = 'none';
    }
  }
}

export function addPageListeners() {
  const orderShowing = [
    'all',
    'direct',
    'indirect',
  ];

  const orderFeaturedLines = [
    info.featuredAllLine,
    info.featuredDirectLine,
    info.featuredIndirectLine,
  ];

  const orderShowingLines = [
    info.showingAllLine,
    info.showingDirectLine,
    info.showingIndirectLine,
  ];

  const orderShowingLinks = [
    info.showingAllLink,
    info.showingDirectLink,
    info.showingIndirectLink,
  ];

  for (let index = 0; index < orderShowing.length; index++) {
    if (!orderShowingLines[index]) continue;

    let nextIndex = index;
    do {
      if (nextIndex === orderShowing.length) {
        nextIndex = 0;
      } else {
        nextIndex++;
      }
    } while (!orderShowingLinks[nextIndex]);

    const currentFeaturedLine = orderFeaturedLines[index];
    const currentShowingLine = orderShowingLines[index];
    const currentShowingLink = orderShowingLinks[index];

    const nextFeaturedLine = orderFeaturedLines[nextIndex];
    const nextShowingLine = orderShowingLines[nextIndex];
    const nextShowing = orderShowing[nextIndex];

    currentShowingLink.addEventListener('click', event => {
      event.preventDefault();

      currentFeaturedLine.style.display = 'none';
      currentShowingLine.style.display = 'none';

      nextFeaturedLine.style.display = 'block';
      nextShowingLine.style.display = 'block';

      filterArtTagGallery(nextShowing);
    });
  }
}
