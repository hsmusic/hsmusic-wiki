/* eslint-env browser */

export const info = {
  id: 'abcRender',

  status: "unloaded"
};

const abcjs = window.ABCJS;

var visualParams = {
  add_classes: true,
  responsive: "resize",
  selectTypes: false
};

var visualParamsTip = {
  selectTypes: false,
  staffwidth: 300,
  scale: 0.8
};

var audioParams = {
  displayLoop: false,
  displayRestart: false,
  displayPlay: true,
  displayProgress: true,
  displayWarp: true
};

var audioParamsTip = {
  displayLoop: false,
  displayRestart: false,
  displayPlay: true,
  displayProgress: true,
  displayWarp: false
};

function CursorControl(el_visual, el_control) {
  var self = this;

  self.onReady = function() { };
  self.onStart = function() {
    var svg = el_visual.querySelector("svg");
    var cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
    cursor.setAttribute("class", "abcjs-cursor");
    cursor.setAttributeNS(null, 'x1', 0);
    cursor.setAttributeNS(null, 'y1', 0);
    cursor.setAttributeNS(null, 'x2', 0);
    cursor.setAttributeNS(null, 'y2', 0);
    svg.appendChild(cursor);

  };
  self.beatSubdivisions = 2;
  self.onBeat = function(beatNumber, totalBeats, totalTime) { };
  self.onEvent = function(ev) {
    if (ev.measureStart && ev.left === null)
      return; // this was the second part of a tie across a measure line. Just ignore it.

    var lastSelection = document.querySelectorAll("#paper svg .highlight");
    for (var k = 0; k < lastSelection.length; k++)
      lastSelection[k].classList.remove("highlight");

    for (var i = 0; i < ev.elements.length; i++ ) {
      var note = ev.elements[i];
      for (var j = 0; j < note.length; j++) {
        note[j].classList.add("highlight");
      }
    }

    var cursor = el_visual.querySelector("svg .abcjs-cursor");
    if (cursor) {
      cursor.setAttribute("x1", ev.left - 2);
      cursor.setAttribute("x2", ev.left - 2);
      cursor.setAttribute("y1", ev.top);
      cursor.setAttribute("y2", ev.top + ev.height);
    }
  };
  self.onFinished = function() {
    var els = el_visual.querySelectorAll("svg .highlight");
    for (var i = 0; i < els.length; i++ ) {
      els[i].classList.remove("highlight");
    }
    var cursor = el_visual.querySelector("svg .abcjs-cursor");
    if (cursor) {
      cursor.setAttribute("x1", 0);
      cursor.setAttribute("x2", 0);
      cursor.setAttribute("y1", 0);
      cursor.setAttribute("y2", 0);
    }
  };
}

function buildPlayer(tune, el_visual, el_control, params, audioParams) {
  // Render sheet music
  var [visualObj] = abcjs.renderAbc(el_visual, tune, params);

  if (el_control && abcjs.synth.supportsAudio()) {
    var cursorControl = new CursorControl(el_visual, el_control);
    var synthControl = new abcjs.synth.SynthController();

    synthControl.load(el_control, cursorControl, audioParams);
    synthControl.disable(true);

    var midiBuffer = new abcjs.synth.CreateSynth();
    midiBuffer.init({
      visualObj: visualObj,
    }).then(function (response) {
      if (synthControl) {
        synthControl.setTune(visualObj).then(function (response) {
          console.log("Audio successfully loaded.")
        }).catch(function (error) {
          console.warn("Audio problem:", error);
        });
      }
    }).catch(function (error) {
      console.warn("Audio problem:", error);
    });
  }
}

export function mutatePageContent() {
  if (!abcjs) return;

  for (const abcwrapper of document.querySelectorAll(".abc-full[data-notation]")) {
    let tune = JSON.parse(abcwrapper.dataset.notation);
    let el_visual = abcwrapper.querySelector(".motif-sheet");
    let el_control = abcwrapper.querySelector(".motif-control");
    buildPlayer(tune, el_visual, el_control, visualParams, audioParams);
  }

  for (const abcwrapper of document.querySelectorAll(".abc-tip[data-notation]")) {
    let tune = JSON.parse(abcwrapper.dataset.notation);
    let el_visual = abcwrapper.querySelector(".motif-sheet");
    let el_control = abcwrapper.querySelector(".motif-control");
    buildPlayer(tune, el_visual, el_control, visualParamsTip);
  }
}
