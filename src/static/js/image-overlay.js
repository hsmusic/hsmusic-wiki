/* eslint-env browser */

import {cssProp} from './client-util.js';
import {fetchWithProgress} from './xhr-util.js';

// TODO: Update to clientSteps style.

function addImageOverlayClickHandlers() {
  const container = document.getElementById('image-overlay-container');

  if (!container) {
    console.warn(`#image-overlay-container missing, image overlay module disabled.`);
    return;
  }

  for (const link of document.querySelectorAll('.image-link')) {
    if (link.closest('.no-image-preview')) {
      continue;
    }

    link.addEventListener('click', handleImageLinkClicked);
  }

  const actionContainer = document.getElementById('image-overlay-action-container');

  container.addEventListener('click', handleContainerClicked);
  document.body.addEventListener('keydown', handleKeyDown);

  function handleContainerClicked(evt) {
    // Only hide the image overlay if actually clicking the background.
    if (evt.target !== container) {
      return;
    }

    // If you clicked anything close to or beneath the action bar, don't hide
    // the image overlay.
    const rect = actionContainer.getBoundingClientRect();
    if (evt.clientY >= rect.top - 40) {
      return;
    }

    container.classList.remove('visible');
  }

  function handleKeyDown(evt) {
    if (evt.key === 'Escape' || evt.key === 'Esc' || evt.keyCode === 27) {
      container.classList.remove('visible');
    }
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

  const container = document.getElementById('image-overlay-container');
  container.classList.add('visible');
  container.classList.remove('loaded');
  container.classList.remove('errored');

  const allViewOriginal = document.getElementsByClassName('image-overlay-view-original');
  const mainImage = document.getElementById('image-overlay-image');
  const thumbImage = document.getElementById('image-overlay-image-thumb');

  const {href: originalSrc} = evt.target.closest('a');

  const {
    src: embeddedSrc,
    dataset: {
      originalSize: originalFileSize,
      thumbs: availableThumbList,
    },
  } = evt.target.closest('a').querySelector('img');

  updateFileSizeInformation(originalFileSize);

  let mainSrc = null;
  let thumbSrc = null;

  if (availableThumbList) {
    const {thumb: mainThumb, length: mainLength} = getPreferredThumbSize(availableThumbList);
    const {thumb: smallThumb, length: smallLength} = getSmallestThumbSize(availableThumbList);
    mainSrc = embeddedSrc.replace(/\.[a-z]+\.(jpg|png)$/, `.${mainThumb}.jpg`);
    thumbSrc = embeddedSrc.replace(/\.[a-z]+\.(jpg|png)$/, `.${smallThumb}.jpg`);
    // Show the thumbnail size on each <img> element's data attributes.
    // Y'know, just for debugging convenience.
    mainImage.dataset.displayingThumb = `${mainThumb}:${mainLength}`;
    thumbImage.dataset.displayingThumb = `${smallThumb}:${smallLength}`;
  } else {
    mainSrc = originalSrc;
    thumbSrc = null;
    mainImage.dataset.displayingThumb = '';
    thumbImage.dataset.displayingThumb = '';
  }

  if (thumbSrc) {
    thumbImage.src = thumbSrc;
    thumbImage.style.display = null;
  } else {
    thumbImage.src = '';
    thumbImage.style.display = 'none';
  }

  for (const viewOriginal of allViewOriginal) {
    viewOriginal.href = originalSrc;
  }

  mainImage.addEventListener('load', handleMainImageLoaded);
  mainImage.addEventListener('error', handleMainImageErrored);

  const showProgress = amount => {
    cssProp(container, '--download-progress', `${amount * 100}%`);
  };

  showProgress(0.00);

  const response =
    await fetchWithProgress(mainSrc, progress => {
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

  mainImage.src = blobSrc;
  showProgress(1.00);

  function handleMainImageLoaded() {
    container.classList.add('loaded');
    removeEventListeners();
  }

  function handleMainImageErrored() {
    container.classList.add('errored');
    removeEventListeners();
  }

  function removeEventListeners() {
    mainImage.removeEventListener('load', handleMainImageLoaded);
    mainImage.removeEventListener('error', handleMainImageErrored);
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

  const actionContentWithoutSize = document.getElementById('image-overlay-action-content-without-size');
  const actionContentWithSize = document.getElementById('image-overlay-action-content-with-size');

  if (!fileSize) {
    actionContentWithSize.classList.remove('visible');
    actionContentWithoutSize.classList.add('visible');
    return;
  }

  actionContentWithoutSize.classList.remove('visible');
  actionContentWithSize.classList.add('visible');

  const megabytesContainer = document.getElementById('image-overlay-file-size-megabytes');
  const kilobytesContainer = document.getElementById('image-overlay-file-size-kilobytes');
  const megabytesContent = megabytesContainer.querySelector('.image-overlay-file-size-count');
  const kilobytesContent = kilobytesContainer.querySelector('.image-overlay-file-size-count');
  const fileSizeWarning = document.getElementById('image-overlay-file-size-warning');

  fileSize = parseInt(fileSize);
  const round = (exp) => Math.round(fileSize / 10 ** (exp - 1)) / 10;

  if (fileSize > fileSizeWarningThreshold) {
    fileSizeWarning.classList.add('visible');
  } else {
    fileSizeWarning.classList.remove('visible');
  }

  if (fileSize > 10 ** 6) {
    megabytesContainer.classList.add('visible');
    kilobytesContainer.classList.remove('visible');
    megabytesContent.innerText = round(6);
  } else {
    megabytesContainer.classList.remove('visible');
    kilobytesContainer.classList.add('visible');
    kilobytesContent.innerText = round(3);
  }

  void fileSizeWarning;
}

addImageOverlayClickHandlers();
