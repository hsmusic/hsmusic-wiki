import {getColors} from '../../shared-util/colors.js';

import {cssProp} from '../client-util.js';
import {fetchWithProgress} from '../xhr-util.js';

export const info = {
  id: 'imageOverlayInfo',

  container: null,
  actionContainer: null,

  viewOriginalLinks: null,
  mainImage: null,
  thumbImage: null,

  actionContentWithoutSize: null,
  actionContentWithSize: null,

  megabytesContainer: null,
  kilobytesContainer: null,
  megabytesContent: null,
  kilobytesContent: null,
  fileSizeWarning: null,

  links: null,
};

export function getPageReferences() {
  info.container =
    document.getElementById('image-overlay-container');

  if (!info.container) return;

  info.actionContainer =
    document.getElementById('image-overlay-action-container');

  info.viewOriginalLinks =
    document.getElementsByClassName('image-overlay-view-original');

  info.mainImage =
    document.getElementById('image-overlay-image');

  info.thumbImage =
    document.getElementById('image-overlay-image-thumb');

  info.actionContentWithoutSize =
    document.getElementById('image-overlay-action-content-without-size');

  info.actionContentWithSize =
    document.getElementById('image-overlay-action-content-with-size');

  info.megabytesContainer =
    document.getElementById('image-overlay-file-size-megabytes');

  info.kilobytesContainer =
    document.getElementById('image-overlay-file-size-kilobytes');

  info.megabytesContent =
    info.megabytesContainer.querySelector('.image-overlay-file-size-count');

  info.kilobytesContent =
    info.kilobytesContainer.querySelector('.image-overlay-file-size-count');

  info.fileSizeWarning =
    document.getElementById('image-overlay-file-size-warning');

  const linkQuery = [
    '.image-link',
    '.image-media-link',
  ].join(', ');

  info.links =
    Array.from(document.querySelectorAll(linkQuery))
      .filter(link => !link.closest('.no-image-preview'));
}

export function addPageListeners() {
  if (!info.container) return;

  for (const link of info.links) {
    link.addEventListener('click', handleImageLinkClicked);
  }

  info.container.addEventListener('click', handleContainerClicked);
  document.body.addEventListener('keydown', handleKeyDown);
}

function handleContainerClicked(evt) {
  // Only hide the image overlay if actually clicking the background.
  if (evt.target !== info.container) {
    return;
  }

  // If you clicked anything near the action bar, don't hide the
  // image overlay.
  const rect = info.actionContainer.getBoundingClientRect();
  if (
    evt.clientY >= rect.top - 40 && evt.clientY <= rect.bottom + 40 &&
    evt.clientX >= rect.left + 20 && evt.clientX <= rect.right - 20
  ) {
    return;
  }

  info.container.classList.remove('visible');
}

function handleKeyDown(evt) {
  if (evt.key === 'Escape' || evt.key === 'Esc' || evt.keyCode === 27) {
    info.container.classList.remove('visible');
  }
}

async function handleImageLinkClicked(evt) {
  if (evt.metaKey || evt.shiftKey || evt.altKey) {
    return;
  }

  evt.preventDefault();

  // Don't show the overlay if the image still needs to be revealed.
  if (evt.target.closest('.reveal:not(.revealed)')) {
    return;
  }

  info.container.classList.add('visible');
  info.container.classList.remove('loaded');
  info.container.classList.remove('errored');

  const details = getImageLinkDetails(evt.target);

  updateImageOverlayColors(details);
  updateFileSizeInformation(details.originalFileSize);

  for (const link of info.viewOriginalLinks) {
    link.href = details.originalSrc;
  }

  await loadOverlayImage(details);
}

function getImageLinkDetails(imageLink) {
  const a = imageLink.closest('a');
  const img = a.querySelector('img');

  const details = {
    originalSrc:
      a.href,

    embeddedSrc:
      img?.src ||
      img?.currentSrc ||
      a.dataset.embedSrc,

    originalFileSize:
      img?.dataset.originalSize ??
      a.dataset.originalSize ??
      null,

    availableThumbList:
      img?.dataset.thumbs ??
      a.dataset.thumbs ??
      null,

    dimensions:
      img?.dataset.dimensions?.split('x') ??
      a.dataset.dimensions?.split('x') ??
      null,

    color:
      cssProp(imageLink, '--primary-color'),
  };

  Object.assign(details, getImageSources(details));

  return details;
}

function getImageSources(details) {
  if (details.availableThumbList) {
    const {thumb: mainThumb, length: mainLength} = getPreferredThumbSize(details.availableThumbList);
    const {thumb: smallThumb, length: smallLength} = getSmallestThumbSize(details.availableThumbList);
    return {
      mainSrc: details.embeddedSrc.replace(/\.[a-z]+\.(jpg|png)$/, `.${mainThumb}.jpg`),
      thumbSrc: details.embeddedSrc.replace(/\.[a-z]+\.(jpg|png)$/, `.${smallThumb}.jpg`),
      mainThumb: `${mainThumb}:${mainLength}`,
      thumbThumb: `${smallThumb}:${smallLength}`,
    };
  } else {
    return {
      mainSrc: details.originalSrc,
      thumbSrc: null,
      mainThumb: '',
      thumbThumb: '',
    };
  }
}

function updateImageOverlayColors(details) {
  if (details.color) {
    let colors;
    try {
      colors =
        getColors(details.color, {
          chroma: window.chroma,
        });
    } catch (error) {
      console.warn(error);
      return;
    }

    cssProp(info.container, {
      '--primary-color': colors.primary,
      '--deep-color': colors.deep,
      '--deep-ghost-color': colors.deepGhost,
      '--bg-black-color': colors.bgBlack,
    });
  } else {
    cssProp(info.container, {
      '--primary-color': null,
      '--deep-color': null,
      '--deep-ghost-color': null,
      '--bg-black-color': null,
    });
  }
}

async function loadOverlayImage(details) {
  if (details.thumbSrc) {
    info.thumbImage.src = details.thumbSrc;
    info.thumbImage.style.display = null;
    info.container.classList.remove('no-thumb');
  } else {
    info.thumbImage.src = '';
    info.thumbImage.style.display = 'none';
    info.container.classList.add('no-thumb');
  }

  // Show the thumbnail size on each <img> element's data attributes.
  // Y'know, just for debugging convenience.
  info.mainImage.dataset.displayingThumb = details.mainThumb;
  info.thumbImage.dataset.displayingThumb = details.thumbThumb;

  if (details.dimensions) {
    info.mainImage.width = details.dimensions[0];
    info.mainImage.height = details.dimensions[1];
    info.thumbImage.width = details.dimensions[0];
    info.thumbImage.height = details.dimensions[1];
    cssProp(info.thumbImage, 'aspect-ratio', details.dimensions.join('/'));
  } else {
    info.mainImage.removeAttribute('width');
    info.mainImage.removeAttribute('height');
    info.thumbImage.removeAttribute('width');
    info.thumbImage.removeAttribute('height');
    cssProp(info.thumbImage, 'aspect-ratio', null);
  }

  info.mainImage.addEventListener('load', handleMainImageLoaded);
  info.mainImage.addEventListener('error', handleMainImageErrored);

  const showProgress = amount => {
    cssProp(info.container, '--download-progress', `${amount * 100}%`);
  };

  showProgress(0.00);

  const response =
    await fetchWithProgress(details.mainSrc, progress => {
      if (progress === -1) {
        // TODO: Indeterminate response progress cue
        showProgress(0.00);
      } else {
        showProgress(0.20 + 0.80 * progress);
      }
    });

  if (!response.status.toString().startsWith('2')) {
    handleMainImageErrored();
    return;
  }

  const blob = await response.blob();
  const blobSrc = URL.createObjectURL(blob);

  info.mainImage.src = blobSrc;
  showProgress(1.00);

  function handleMainImageLoaded() {
    info.container.classList.add('loaded');
    removeEventListeners();
  }

  function handleMainImageErrored() {
    info.container.classList.add('errored');
    removeEventListeners();
  }

  function removeEventListeners() {
    info.mainImage.removeEventListener('load', handleMainImageLoaded);
    info.mainImage.removeEventListener('error', handleMainImageErrored);
  }
}

function parseThumbList(availableThumbList) {
  // Parse all the available thumbnail sizes! These are provided by the actual
  // content generation on each image.
  const defaultThumbList = 'huge:1400 semihuge:1200 large:800 medium:400 small:250'
  const availableSizes =
    (availableThumbList || defaultThumbList)
      .split(' ')
      .map(part => part.split(':'))
      .map(([thumb, length]) => ({thumb, length: parseInt(length)}))
      .sort((a, b) => a.length - b.length);

  return availableSizes;
}

function getPreferredThumbSize(availableThumbList) {
  // Assuming a square, the image will be constrained to the lesser window
  // dimension. Coefficient here matches CSS dimensions for image overlay.
  const constrainedLength = Math.floor(Math.min(
    0.80 * window.innerWidth,
    0.80 * window.innerHeight));

  // Match device pixel ratio, which is 2x for "retina" displays and certain
  // device configurations.
  const visualLength = window.devicePixelRatio * constrainedLength;

  const availableSizes = parseThumbList(availableThumbList);

  // Starting from the smallest dimensions, find (and return) the first
  // available length which hits a "good enough" threshold - it's got to be
  // at least that percent of the way to the actual displayed dimensions.
  const goodEnoughThreshold = 0.90;

  // (The last item is skipped since we'd be falling back to it anyway.)
  for (const {thumb, length} of availableSizes.slice(0, -1)) {
    if (Math.floor(visualLength * goodEnoughThreshold) <= length) {
      return {thumb, length};
    }
  }

  // If none of the items in the list were big enough to hit the "good enough"
  // threshold, just use the largest size available.
  return availableSizes[availableSizes.length - 1];
}

function getSmallestThumbSize(availableThumbList) {
  // Just snag the smallest size. This'll be used for displaying the "preview"
  // as the bigger one is loading.
  const availableSizes = parseThumbList(availableThumbList);
  return availableSizes[0];
}

function updateFileSizeInformation(fileSize) {
  const fileSizeWarningThreshold = 8 * 10 ** 6;

  if (!fileSize) {
    info.actionContentWithSize.classList.remove('visible');
    info.actionContentWithoutSize.classList.add('visible');
    return;
  }

  info.actionContentWithoutSize.classList.remove('visible');
  info.actionContentWithSize.classList.add('visible');

  fileSize = parseInt(fileSize);
  const round = (exp) => Math.round(fileSize / 10 ** (exp - 1)) / 10;

  if (fileSize > fileSizeWarningThreshold) {
    info.fileSizeWarning.classList.add('visible');
  } else {
    info.fileSizeWarning.classList.remove('visible');
  }

  if (fileSize > 10 ** 6) {
    info.megabytesContainer.classList.add('visible');
    info.kilobytesContainer.classList.remove('visible');
    info.megabytesContent.innerText = round(6);
  } else {
    info.megabytesContainer.classList.remove('visible');
    info.kilobytesContainer.classList.add('visible');
    info.kilobytesContent.innerText = round(3);
  }
}
