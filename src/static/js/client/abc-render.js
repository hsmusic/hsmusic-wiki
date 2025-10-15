/* eslint-env browser */

export const info = {
  id: 'abcRenderModule',

  settings: {
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
  },
};

const abcjs = window.ABCJS;

class CursorControl {
  #visualTarget;
  #controlsTarget;
  #cursor;

  beatSubdivisions = 2;

  constructor(visualTarget, controlsTarget) {
    this.#visualTarget = visualTarget;
    this.#controlsTarget = controlsTarget;
  }

  onReady() {}

  onStart() {
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

async function buildPlayer(tune, {
  visualTarget,
  controlsTarget,
  visualParams,
  audioParams,
}) {
  const [visualObj] = abcjs.renderAbc(visualTarget, tune, visualParams);

  if (controlsTarget && abcjs.synth.supportsAudio()) {
    const cursorControl = new CursorControl(visualTarget, controlsTarget);
    const synthControl = new abcjs.synth.SynthController();

    synthControl.load(controlsTarget, cursorControl, audioParams);
    synthControl.disable(true);

    const midiBuffer = new abcjs.synth.CreateSynth();

    try {
      await midiBuffer.init({visualObj});
      await synthControl.setTune(visualObj);
    } catch {
      console.warn('Audio problem:', error);
      console.warn('...for tune:\n' + tune);
    }
  }
}

export function mutatePageContent() {
  if (!abcjs) return;

  const {settings} = info;

  for (const abcwrapper of document.querySelectorAll('.abc-full[data-notation]')) {
    const tune = JSON.parse(abcwrapper.dataset.notation);
    buildPlayer(tune, {
      visualTarget: abcwrapper.querySelector('.motif-sheet'),
      controlsTarget: abcwrapper.querySelector('.motif-control'),
      visualParams: settings.visualParamsFull,
      audioParams: settings.audioParamsFull,
    });
  }

  for (const abcwrapper of document.querySelectorAll('.abc-tip[data-notation]')) {
    const tune = JSON.parse(abcwrapper.dataset.notation);
    buildPlayer(tune, {
      visualTarget: abcwrapper.querySelector('.motif-sheet'),
      controlsTarget: abcwrapper.querySelector('.motif-control'),
      visualParams: settings.visualParamsTip,
      audioParams: null, // settings.audioParamsTip
    });
  }
}
