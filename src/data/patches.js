// --> Patch

export class Patch {
  static INPUT_NONE = 0;
  static INPUT_CONSTANT = 1;
  static INPUT_DIRECT_CONNECTION = 2;
  static INPUT_MANAGED_CONNECTION = 3;

  static INPUT_UNAVAILABLE = 0;
  static INPUT_AVAILABLE = 1;

  static OUTPUT_UNAVAILABLE = 0;
  static OUTPUT_AVAILABLE = 1;

  static inputNames = [];
  inputNames = null;
  static outputNames = [];
  outputNames = null;

  manager = null;
  inputs = Object.create(null);

  constructor({
    manager,

    inputNames,
    outputNames,

    inputs,
  } = {}) {
    this.inputNames = inputNames ?? this.constructor.inputNames;
    this.outputNames = outputNames ?? this.constructor.outputNames;

    manager?.addManagedPatch(this);

    if (inputs) {
      Object.assign(this.inputs, inputs);
    }

    this.initializeInputs();
  }

  initializeInputs() {
    for (const inputName of this.inputNames) {
      if (!this.inputs[inputName]) {
        this.inputs[inputName] = [Patch.INPUT_NONE];
      }
    }
  }

  computeInputs() {
    const inputs = Object.create(null);

    for (const inputName of this.inputNames) {
      const input = this.inputs[inputName];
      switch (input[0]) {
        case Patch.INPUT_NONE:
          inputs[inputName] = [Patch.INPUT_UNAVAILABLE];
          break;

        case Patch.INPUT_CONSTANT:
          inputs[inputName] = [Patch.INPUT_AVAILABLE, input[1]];
          break;

        case Patch.INPUT_DIRECT_CONNECTION: {
          const patch = input[1];
          const outputName = input[2];
          const output = patch.computeOutputs()[outputName];
          switch (output[0]) {
            case Patch.OUTPUT_UNAVAILABLE:
              inputs[inputName] = [Patch.INPUT_UNAVAILABLE];
              break;
            case Patch.OUTPUT_AVAILABLE:
              inputs[inputName] = [Patch.INPUT_AVAILABLE, output[1]];
              break;
          }
          throw new Error("Unreachable");
        }

        case Patch.INPUT_MANAGED_CONNECTION: {
          if (!this.manager) {
            inputs[inputName] = [Patch.INPUT_UNAVAILABLE];
            break;
          }

          inputs[inputName] = this.manager.getManagedInput(input[1]);
          break;
        }
      }
    }

    return inputs;
  }

  computeOutputs() {
    const inputs = this.computeInputs();
    const outputs = Object.create(null);
    console.log(`Compute: ${this.constructor.name}`);
    this.compute(inputs, outputs);
    return outputs;
  }

  compute(inputs, outputs) {
    // No-op. Return all outputs as unavailable. This should be overridden
    // in subclasses.

    for (const outputName of this.constructor.outputNames) {
      outputs[outputName] = [Patch.OUTPUT_UNAVAILABLE];
    }
  }

  attachToManager(manager) {
    manager.addManagedPatch(this);
  }

  detachFromManager() {
    if (this.manager) {
      this.manager.removeManagedPatch(this);
    }
  }
}

// --> PatchManager

export class PatchManager extends Patch {
  managedPatches = [];
  managedInputs = {};

  #externalInputPatch = null;
  #externalOutputPatch = null;

  constructor(...args) {
    super(...args);

    this.#externalInputPatch = new PatchManagerExternalInputPatch({
      manager: this,
    });
    this.#externalOutputPatch = new PatchManagerExternalOutputPatch({
      manager: this,
    });
  }

  addManagedPatch(patch) {
    if (patch.manager === this) {
      return false;
    }

    patch.detachFromManager();
    patch.manager = this;

    if (patch.manager === this) {
      this.managedPatches.push(patch);
      return true;
    } else {
      return false;
    }
  }

  removeManagedPatch(patch) {
    if (patch.manager !== this) {
      return false;
    }

    patch.manager = null;

    if (patch.manager === this) {
      return false;
    }

    for (const inputNames of patch.inputNames) {
      const input = patch.inputs[inputName];
      if (input[0] === Patch.INPUT_MANAGED_CONNECTION) {
        this.dropManagedInput(input[1]);
        patch.inputs[inputName] = [Patch.INPUT_NONE];
      }
    }

    this.managedPatches.splice(this.managedPatches.indexOf(patch), 1);

    return true;
  }

  addManagedInput(patchWithInput, inputName, patchWithOutput, outputName) {
    if (patchWithInput.manager !== this || patchWithOutput.manager !== this) {
      throw new Error(
        `Input and output patches must belong to same manager (this)`
      );
    }

    const input = patchWithInput.inputs[inputName];
    if (input[0] === Patch.INPUT_MANAGED_CONNECTION) {
      this.managedInputs[input[1]] = [patchWithOutput, outputName, {}];
    } else {
      const key = this.getManagedConnectionIdentifier();
      this.managedInputs[key] = [patchWithOutput, outputName, {}];
      patchWithInput.inputs[inputName] = [Patch.INPUT_MANAGED_CONNECTION, key];
    }

    return true;
  }

  dropManagedInput(identifier) {
    return delete this.managedInputs[key];
  }

  getManagedInput(identifier) {
    const connection = this.managedInputs[identifier];
    const patch = connection[0];
    const outputName = connection[1];
    const memory = connection[2];
    return this.computeManagedInput(patch, outputName, memory);
  }

  computeManagedInput(patch, outputName, memory) {
    // Override this function in subclasses to alter behavior of the "wire"
    // used for connecting patches.

    const output = patch.computeOutputs()[outputName];
    switch (output[0]) {
      case Patch.OUTPUT_UNAVAILABLE:
        return [Patch.INPUT_UNAVAILABLE];
      case Patch.OUTPUT_AVAILABLE:
        return [Patch.INPUT_AVAILABLE, output[1]];
    }
  }

  #managedConnectionIdentifier = 0;
  getManagedConnectionIdentifier() {
    return this.#managedConnectionIdentifier++;
  }

  addExternalInput(patchWithInput, patchInputName, managerInputName) {
    return this.addManagedInput(
      patchWithInput,
      patchInputName,
      this.#externalInputPatch,
      managerInputName
    );
  }

  setExternalOutput(managerOutputName, patchWithOutput, patchOutputName) {
    return this.addManagedInput(
      this.#externalOutputPatch,
      managerOutputName,
      patchWithOutput,
      patchOutputName
    );
  }

  compute(inputs, outputs) {
    Object.assign(outputs, this.#externalOutputPatch.computeOutputs());
  }
}

class PatchManagerExternalInputPatch extends Patch {
  constructor({ manager, ...rest }) {
    super({
      manager,
      inputNames: manager.inputNames,
      outputNames: manager.inputNames,
      ...rest,
    });
  }

  computeInputs() {
    return this.manager.computeInputs();
  }

  compute(inputs, outputs) {
    for (const name of this.inputNames) {
      const input = inputs[name];
      switch (input[0]) {
        case Patch.INPUT_UNAVAILABLE:
          outputs[name] = [Patch.OUTPUT_UNAVAILABLE];
          break;
        case Patch.INPUT_AVAILABLE:
          outputs[name] = [Patch.INPUT_AVAILABLE, input[1]];
          break;
      }
    }
  }
}

class PatchManagerExternalOutputPatch extends Patch {
  constructor({ manager, ...rest }) {
    super({
      manager,
      inputNames: manager.outputNames,
      outputNames: manager.outputNames,
      ...rest,
    });
  }

  compute(inputs, outputs) {
    for (const name of this.inputNames) {
      const input = inputs[name];
      switch (input[0]) {
        case Patch.INPUT_UNAVAILABLE:
          outputs[name] = [Patch.OUTPUT_UNAVAILABLE];
          break;
        case Patch.INPUT_AVAILABLE:
          outputs[name] = [Patch.INPUT_AVAILABLE, input[1]];
          break;
      }
    }
  }
}

// --> demo

const caches = Symbol();
const common = Symbol();
const hsmusic = Symbol();

Patch[caches] = {
  WireCachedPatchManager: class extends PatchManager {
    // "Wire" caching for PatchManager: Remembers the last outputs to come
    // from each patch. As long as the inputs for a patch do not change, its
    // cached outputs are reused.

    // TODO: This has a unique cache for each managed input. It should
    // re-use a cache for the same patch and output name. How can we ensure
    // the cache is dropped when the patch is removed, though? (Spoilers:
    // probably just override removeManagedPatch)
    computeManagedInput(patch, outputName, memory) {
      let cache = true;

      const { previousInputs } = memory;
      const { inputs } = patch;
      if (memory.previousInputs) {
        for (const inputName of patch.inputNames) {
          // TODO: This doesn't account for connections whose values
          // have changed (analogous to bubbling cache invalidation).
          if (inputs[inputName] !== previousInputs[inputName]) {
            cache = false;
            break;
          }
        }
      } else {
        cache = false;
      }

      if (cache) {
        return memory.previousOutputs[outputName];
      }

      const outputs = patch.computeOutputs();
      memory.previousOutputs = outputs;
      memory.previousInputs = { ...inputs };
      return outputs[outputName];
    }
  },
};

Patch[common] = {
  Stringify: class extends Patch {
    static inputNames = ["value"];
    static outputNames = ["value"];

    compute(inputs, outputs) {
      if (inputs.value[0] === Patch.INPUT_AVAILABLE) {
        outputs.value = [Patch.OUTPUT_AVAILABLE, inputs.value[1].toString()];
      } else {
        outputs.value = [Patch.OUTPUT_UNAVAILABLE];
      }
    }
  },

  Echo: class extends Patch {
    static inputNames = ["value"];
    static outputNames = ["value"];

    compute(inputs, outputs) {
      if (inputs.value[0] === Patch.INPUT_AVAILABLE) {
        outputs.value = [Patch.OUTPUT_AVAILABLE, inputs.value[1]];
      } else {
        outputs.value = [Patch.OUTPUT_UNAVAILABLE];
      }
    }
  },
};

const PM = new Patch[caches].WireCachedPatchManager({
  inputNames: ["externalInput"],
  outputNames: ["externalOutput"],
});

const P1 = new Patch[common].Stringify({ manager: PM });
const P2 = new Patch[common].Echo({ manager: PM });

PM.addExternalInput(P1, "value", "externalInput");
PM.addManagedInput(P2, "value", P1, "value");
PM.setExternalOutput("externalOutput", P2, "value");

PM.inputs.externalInput = [Patch.INPUT_CONSTANT, 123];
console.log(PM.computeOutputs());
console.log(PM.computeOutputs());
