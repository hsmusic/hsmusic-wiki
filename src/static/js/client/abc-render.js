/* eslint-env browser */

import {readyPreparedTextWithTooltip} from './text-with-tooltip.js';
import {info as hoverableTooltipInfo} from './hoverable-tooltip.js';

export const info = {
  id: 'abcRenderModule',

  state: {
    preparedWrappers: new WeakSet(),

    prepareTooltipsNearWrapper: null,
    prepareTooltipsWhenTooltipShows: null,
  },

  settings: {
    selectorFull: '.abc-full[data-notation]',
    selectorTip: '.abc-tip[data-notation]',

    visualParamsFull: {
      add_classes: true,
      responsive: 'resize',
      selectTypes: false,
    },

    visualParamsTip: {
      selectTypes: false,
      staffwidth: 300,
      scale: 0.8,
    },

    audioParamsFull: {
      displayLoop: false,
      displayRestart: false,
      displayPlay: true,
      displayProgress: true,
      displayWarp: true,
    },

    audioParamsTip: {
      displayLoop: false,
      displayRestart: false,
      displayPlay: true,
      displayProgress: true,
      displayWarp: false,
    },

    // Earlier strings are of greater precedence.
    // Selectors in each string are of equal precedence.
    nearbyTooltipSelectors: [
      'ul, ol, dl',
      'p, blockquote',
      '#content, .sidebar',
      '#page-container > *',
      ':root',
    ],
  },

  session: {
    renderAllTooltipsImmediately: {
      type: 'boolean',
      default: false,
    },
  },
};

const abcjs = window.ABCJS;

class CursorControl {
  #visualTarget;
  #controlsTarget;

  #cursor = null;

  beatSubdivisions = 2;

  constructor(visualTarget, controlsTarget) {
    this.#visualTarget = visualTarget;
    this.#controlsTarget = controlsTarget;
  }

  onReady() {}

  onStart() {
    if (!this.#cursor) this.#initializeCursor();
  }

  #initializeCursor() {
    const svg = this.#visualTarget.querySelector('svg');
    this.#cursor = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.#cursor.classList.add('abcjs-cursor');
    this.#cursor.setAttributeNS(null, 'x1', 0);
    this.#cursor.setAttributeNS(null, 'y1', 0);
    this.#cursor.setAttributeNS(null, 'x2', 0);
    this.#cursor.setAttributeNS(null, 'y2', 0);
    svg.appendChild(this.#cursor);
  }

  onBeat(_beatNumber, _totalBeats, _totalTime) {}

  onEvent(event) {
    if (event.measureStart && event.left === null) {
      // this was the second part of a tie across a measure line. Just ignore it.
      return;
    }

    for (const g of document.querySelectorAll('#paper svg g.highlight')) {
      g.classList.remove('highlight');
    }

    for (const g of event.elements.flat()) {
      g.classList.add('highlight');
    }

    if (this.#cursor) {
      this.#cursor.setAttribute('x1', event.left - 2);
      this.#cursor.setAttribute('x2', event.left - 2);
      this.#cursor.setAttribute('y1', event.top);
      this.#cursor.setAttribute('y2', event.top + event.height);
    }
  }

  onFinished() {
    for (const g of this.#visualTarget.querySelectorAll('svg g.highlight')) {
      g.classList.remove('highlight');
    }

    if (this.#cursor) {
      this.#cursor.setAttribute('x1', 0);
      this.#cursor.setAttribute('x2', 0);
      this.#cursor.setAttribute('y1', 0);
      this.#cursor.setAttribute('y2', 0);
    }
  }
}

async function buildPlayer(abcwrapper, tune, {
  visualParams,
  audioParams,
}) {
  const {state} = info;

  if (state.preparedWrappers.has(abcwrapper)) {
    return;
  } else {
    state.preparedWrappers.add(abcwrapper);
  }

  const visualTarget = abcwrapper.querySelector('.motif-sheet');
  const controlsTarget = abcwrapper.querySelector('.motif-control');

  const [visualObj] = abcjs.renderAbc(visualTarget, tune, visualParams);

  if (controlsTarget && abcjs.synth.supportsAudio()) {
    const cursorControl = new CursorControl(visualTarget, controlsTarget);
    const synthControl = new abcjs.synth.SynthController();

    synthControl.load(controlsTarget, cursorControl, audioParams);
    synthControl.disable(true);

    try {
      await synthControl.setTune(visualObj);
    } catch (error) {
      console.warn('Audio problem:', error);
      console.warn('...for tune:\n' + tune);
    }
  }
}

export function addInternalListeners() {
  hoverableTooltipInfo.event.whenTooltipShows.push(({tooltip}) => {
    const {state} = info;

    if (tooltip === state.prepareTooltipsWhenTooltipShows) {
      setTimeout(() => {
        prepareNearbyMotifTooltips(state.prepareTooltipsNearWrapper);
      });
    }
  });
}

export function mutatePageContent() {
  if (!abcjs) {
    const abcs = document.querySelectorAll('.abc-full, .abc-tip');
    if (abcs.length) {
      console.warn(
        `page has abcjs elements but the library isn't loaded, ` +
        `so these are left not visible or interactive`);
    }

    return;
  }

  const {session, settings} = info;

  for (const abcwrapper of document.querySelectorAll(settings.selectorFull)) {
    const tune = JSON.parse(abcwrapper.dataset.notation);
    buildPlayer(abcwrapper, tune, {
      visualParams: settings.visualParamsFull,
      audioParams: settings.audioParamsFull,
    });
  }

  if (session.renderAllTooltipsImmediately) {
    const wrappers = document.querySelectorAll(settings.selectorTip)
    const start = Date.now();
    for (const abcwrapper of wrappers) {
      prepareMotifTooltip(abcwrapper);
      readyPreparedTextWithTooltip(abcwrapper);
    }
    if (wrappers.length) {
      console.info(
        `rendered all ${wrappers.length} motif tooltips ` +
        `in ${((Date.now() - start) / 1000).toFixed(3)}s`);
    }
  } else {
    for (const abcwrapper of document.querySelectorAll(settings.selectorTip)) {
      // lie and announce the text-with-tooltip as "prepared" already
      // it'll be filled in before a tooltip is actually requested for it...
      // HOPEFULLY...
      readyPreparedTextWithTooltip(abcwrapper);
    }
  }
}

export function addPageListeners() {
  if (!abcjs) return;

  const {settings, state} = info;

  for (const abcwrapper of document.querySelectorAll(settings.selectorTip)) {
    const twt = abcwrapper.closest('.text-with-tooltip');
    const hoverable = twt.querySelector('.hoverable');
    const tooltip = twt.querySelector('.tooltip');

    const handle = () => {
      prepareMotifTooltip(abcwrapper, true);
      state.prepareTooltipsNearWrapper = abcwrapper;
      state.prepareTooltipsWhenTooltipShows = tooltip;
    };

    hoverable.addEventListener('mouseover', handle);
    hoverable.addEventListener('focusin', handle);
  }
}

function prepareMotifTooltip(abcwrapper) {
  const {settings} = info;

  const tune = JSON.parse(abcwrapper.dataset.notation);
  buildPlayer(abcwrapper, tune, {
    visualParams: settings.visualParamsTip,
    audioParams: settings.audioParamsTip,
  });
}

function prepareNearbyMotifTooltips(abcwrapper) {
  const {settings} = info;

  const timeout = Date.now() + 200;

  let parent, rest = settings.nearbyTooltipSelectors;
  do parent = abcwrapper.closest(rest.shift());
  while (rest.length && !parent);
  if (!parent) return;

  const nearby = Array.from(parent.querySelectorAll(settings.selectorTip));
  if (nearby.includes(abcwrapper)) {
    const index = nearby.indexOf(abcwrapper);
    for (let i = 1; i <= 5; i++) {
      if (nearby[index + i]) prepareMotifTooltip(nearby[index + i]);
      if (nearby[index - i]) prepareMotifTooltip(nearby[index - i]);
      if (Date.now() > timeout) return;
    }
  } else if (nearby.length < 24) {
    while (nearby.length) {
      const pluck = Math.floor(Math.random() * nearby.length);
      const [abcwrapper] = nearby.splice(pluck, 1);
      prepareMotifTooltip(abcwrapper);
      if (Date.now() > timeout) return;
    }
  }
}
