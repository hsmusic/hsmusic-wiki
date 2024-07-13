import {inspect} from 'node:util';

import {decorateErrorWithIndex, openAggregate, withAggregate}
  from '#aggregate';
import {colors} from '#cli';
import {a} from '#validators';
import {TupleMap} from '#wiki-data';

import {
  annotateFunction,
  empty,
  filterProperties,
  stitchArrays,
  typeAppearance,
  unique,
} from '#sugar';

const globalCompositeCache = {};

const _valueIntoToken = shape =>
  (value = null) =>
    (value === null
      ? Symbol.for(`hsmusic.composite.${shape}`)
   : typeof value === 'string'
      ? Symbol.for(`hsmusic.composite.${shape}:${value}`)
      : {
          symbol: Symbol.for(`hsmusic.composite.input`),
          shape,
          value,
        });

const _valuesIntoToken = shape =>
  (...values) => ({
    symbol: Symbol.for('hsmusic.composite.input'),
    shape,
    value: values,
  });

export const input = _valueIntoToken('input');
input.symbol = Symbol.for('hsmusic.composite.input');

input.value = _valueIntoToken('input.value');
input.dependency = _valueIntoToken('input.dependency');
input.subroutine = _valuesIntoToken('input.subroutine');
input.subroutine.from = subroutineFrom;

input.myself = () => Symbol.for(`hsmusic.composite.input.myself`);
input.thisProperty = () => Symbol.for('hsmusic.composite.input.thisProperty');

input.updateValue = _valueIntoToken('input.updateValue');

input.staticDependency = _valueIntoToken('input.staticDependency');
input.staticValue = _valueIntoToken('input.staticValue');

function isInputToken(token) {
  if (token === null) {
    return false;
  } else if (typeof token === 'object') {
    return token.symbol === Symbol.for('hsmusic.composite.input');
  } else if (typeof token === 'symbol') {
    return token.description.startsWith('hsmusic.composite.input');
  } else {
    return false;
  }
}

function getInputTokenShape(token) {
  if (!isInputToken(token)) {
    throw new TypeError(`Expected an input token, got ${typeAppearance(token)}`);
  }

  if (typeof token === 'object') {
    return token.shape;
  } else {
    return token.description.match(/hsmusic\.composite\.(input.*?)(:|$)/)[1];
  }
}

function getInputTokenValue(token) {
  if (!isInputToken(token)) {
    throw new TypeError(`Expected an input token, got ${typeAppearance(token)}`);
  }

  if (typeof token === 'object') {
    return token.value;
  } else {
    return token.description.match(/hsmusic\.composite\.input.*?:(.*)/)?.[1] ?? null;
  }
}

function getStaticInputMetadata(inputOptions) {
  const metadata = {};

  for (const [name, token] of Object.entries(inputOptions)) {
    if (typeof token === 'string') {
      metadata[input.staticDependency(name)] = token;
      metadata[input.staticValue(name)] = null;
    } else if (isInputToken(token)) {
      const tokenShape = getInputTokenShape(token);
      const tokenValue = getInputTokenValue(token);

      metadata[input.staticDependency(name)] =
        (tokenShape === 'input.dependency'
          ? tokenValue
          : null);

      metadata[input.staticValue(name)] =
        (tokenShape === 'input.value'
          ? tokenValue
          : null);
    } else {
      metadata[input.staticDependency(name)] = null;
      metadata[input.staticValue(name)] = null;
    }
  }

  return metadata;
}

function getCompositionName(description) {
  return (
    (description.annotation
      ? description.annotation
      : `unnamed composite`));
}

function validateSubroutineDescription(providedDescription, expectedDescription) {
  const expectedInputNames = expectedDescription.inputs ?? [];
  const providedInputNames =
    (Array.isArray(providedDescription.inputs)
      ? providedDescription.inputs
   : typeof providedDescription.inputs === 'object'
      ? Object.keys(providedDescription.inputs)
      : []);

  const expectedOutputNames = expectedDescription.outputs ?? [];
  const providedOutputNames =
    (Array.isArray(providedDescription.outputs)
      ? providedDescription.outputs
   : typeof providedDescription.outputs === 'object'
      ? Object.values(providedDescription.outputs)
      : []);

  const misplacedInputNames =
    providedInputNames
      .filter(name => !expectedInputNames.includes(name));

  const missingInputNames =
    expectedInputNames
      .filter(name => !providedInputNames.includes(name));

  const misplacedOutputNames =
    providedInputNames
      .filter(name => !expectedInputNames.includes(name));

  const missingOutputNames =
    expectedInputNames
      .filter(name => !providedInputNames.includes(name));

  withAggregate({message: `Subroutine doesn't match expected description`}, ({push}) => {
    if (!empty(misplacedInputNames)) {
      push(new Error(`Unexpected input names: ${misplacedInputNames.join(', ')}`));
    }

    if (!empty(misplacedOutputNames)) {
      push(new Error(`Unexpected output names: ${misplacedOutputNames.join(', ')}`));
    }

    if (!empty(missingInputNames)) {
      push(new Error(`Required these inputs: ${missingInputNames.join(', ')}`));
    }

    if (!empty(missingOutputNames)) {
      push(new Error(`Required these outputs: ${missingOutputNames.join(', ')}`));
    }
  });

  return true;
}

function validateInputValue(value, description) {
  const tokenShape = getInputTokenShape(description);
  const tokenValue = getInputTokenValue(description);

  if (tokenShape === 'input.subroutine') {
    if (value === null || value === undefined) {
      if (tokenValue[0].defaultTemplate) {
        return true;
      } else {
        throw new TypeError(`Expected a subroutine, got ${typeAppearance(value)}`);
      }
    } else if (!isInputToken(value)) {
      throw new TypeError(`Expected a subroutine, got ${typeAppearance(value)}`);
    } else if (getInputTokenShape(value) !== 'input.subroutine') {
      throw new TypeError(`Expected a subroutine, got ${getInputTokenShape(value)}`);
    }

    const expectedDescription = tokenValue[0];
    const providedDescription = getInputTokenValue(value)[0];

    validateSubroutineDescription(providedDescription, expectedDescription);

    return true;
  }

  const {acceptsNull, defaultValue, type, validate} = tokenValue || {};

  if (value === null || value === undefined) {
    if (acceptsNull || defaultValue === null) {
      return true;
    } else {
      throw new TypeError(
        (type
          ? `Expected ${a(type)}, got ${typeAppearance(value)}`
          : `Expected a value, got ${typeAppearance(value)}`));
    }
  }

  if (type) {
    // Note: null is already handled earlier in this function, so it won't
    // cause any trouble here.
    const typeofValue =
      (typeof value === 'object'
        ? Array.isArray(value) ? 'array' : 'object'
        : typeof value);

    if (typeofValue !== type) {
      throw new TypeError(`Expected ${a(type)}, got ${typeAppearance(value)}`);
    }
  }

  if (validate) {
    validate(value);
  }

  return true;
}

export function templateCompositeFrom(description) {
  const compositionName = getCompositionName(description);

  withAggregate({message: `Errors in description for ${compositionName}`}, ({map, nest, push}) => {
    if ('steps' in description) {
      if (Array.isArray(description.steps)) {
        push(new TypeError(`Wrap steps array in a function`));
      } else if (typeof description.steps !== 'function') {
        push(new TypeError(`Expected steps to be a function (returning an array)`));
      }
    }

    validateInputs:
    if ('inputs' in description) {
      if (
        Array.isArray(description.inputs) ||
        typeof description.inputs !== 'object'
      ) {
        push(new Error(`Expected inputs to be object, got ${typeAppearance(description.inputs)}`));
        break validateInputs;
      }

      nest({message: `Errors in static input descriptions for ${compositionName}`}, ({push}) => {
        const missingCallsToInput = [];
        const wrongCallsToInput = [];

        const validCallsToInput = new Set([
          'input',
          'input.staticDependency',
          'input.staticValue',
          'input.subroutine',
        ]);

        for (const [name, value] of Object.entries(description.inputs)) {
          if (!isInputToken(value)) {
            missingCallsToInput.push(name);
            continue;
          }

          if (!validCallsToInput.has(getInputTokenShape(value))) {
            wrongCallsToInput.push(name);
          }
        }

        for (const name of missingCallsToInput) {
          push(new Error(`${name}: Missing call to input()`));
        }

        for (const name of wrongCallsToInput) {
          const shape = getInputTokenShape(description.inputs[name]);
          push(new Error(`${name}: Expected call to input, input.staticDependency, or input.staticValue, got ${shape}`));
        }
      });
    }

    validateOutputs:
    if ('outputs' in description) {
      if (
        !Array.isArray(description.outputs) &&
        typeof description.outputs !== 'function'
      ) {
        push(new Error(`Expected outputs to be array or function, got ${typeAppearance(description.outputs)}`));
        break validateOutputs;
      }

      if (Array.isArray(description.outputs)) {
        map(
          description.outputs,
          decorateErrorWithIndex(value => {
            if (typeof value !== 'string') {
              throw new Error(`${value}: Expected string, got ${typeAppearance(value)}`)
            } else if (!value.startsWith('#')) {
              throw new Error(`${value}: Expected "#" at start`);
            }
          }),
          {message: `Errors in output descriptions for ${compositionName}`});
      }
    }
  });

  const expectedInputNames =
    (description.inputs
      ? Object.keys(description.inputs)
      : []);

  const instantiate = (inputOptions = {}) => {
    withAggregate({message: `Errors in input options passed to ${compositionName}`}, ({push}) => {
      const providedInputNames = Object.keys(inputOptions);

      const misplacedInputNames =
        providedInputNames
          .filter(name => !expectedInputNames.includes(name));

      const missingInputNames =
        expectedInputNames
          .filter(name => !providedInputNames.includes(name))
          .filter(name => {
            const inputShape = getInputTokenShape(description.inputs[name]);
            const inputDescription = getInputTokenValue(description.inputs[name]);
            if (!inputDescription) return true;

            switch (inputShape) {
              case 'input':
                if ('defaultValue' in inputDescription) return false;
                if ('defaultDependency' in inputDescription) return false;
                return true;

              case 'input.staticValue':
                if ('defaultValue' in inputDescription) return false;
                return true;

              case 'input.staticDependency':
                if ('defaultDependency' in inputDescription) return false;
                return true;

              case 'input.subroutine':
                if ('defaultTemplate' in inputDescription[0]) return false;
                return true;

              default:
                return true;
            }
          });

      const wrongTypeInputNames = [];

      const expectedStaticValueInputNames = [];
      const expectedStaticDependencyInputNames = [];
      const expectedValueProvidingTokenInputNames = [];

      const validateFailedErrors = [];

      for (const [name, value] of Object.entries(inputOptions)) {
        if (misplacedInputNames.includes(name)) {
          continue;
        }

        if (typeof value !== 'string' && !isInputToken(value)) {
          wrongTypeInputNames.push(name);
          continue;
        }

        const descriptionShape = getInputTokenShape(description.inputs[name]);

        const tokenShape = (isInputToken(value) ? getInputTokenShape(value) : null);
        const tokenValue = (isInputToken(value) ? getInputTokenValue(value) : null);

        switch (descriptionShape) {
          case'input.staticValue':
            if (tokenShape !== 'input.value') {
              expectedStaticValueInputNames.push(name);
              continue;
            }
            break;

          case 'input.staticDependency':
            if (typeof value !== 'string' && tokenShape !== 'input.dependency') {
              expectedStaticDependencyInputNames.push(name);
              continue;
            }
            break;

          case 'input':
            if (typeof value !== 'string' && ![
              'input',
              'input.value',
              'input.dependency',
              'input.myself',
              'input.thisProperty',
              'input.updateValue',
            ].includes(tokenShape)) {
              expectedValueProvidingTokenInputNames.push(name);
              continue;
            }
            break;
        }

        if (tokenShape === 'input.value') {
          try {
            validateInputValue(tokenValue, description.inputs[name]);
          } catch (error) {
            error.message = `${name}: ${error.message}`;
            validateFailedErrors.push(error);
          }
        }
      }

      if (!empty(misplacedInputNames)) {
        push(new Error(`Unexpected input names: ${misplacedInputNames.join(', ')}`));
      }

      if (!empty(missingInputNames)) {
        push(new Error(`Required these inputs: ${missingInputNames.join(', ')}`));
      }

      const inputAppearance = name =>
        (isInputToken(inputOptions[name])
          ? `${getInputTokenShape(inputOptions[name])}() call`
          : `dependency name`);

      for (const name of expectedStaticDependencyInputNames) {
        const appearance = inputAppearance(name);
        push(new Error(`${name}: Expected dependency name, got ${appearance}`));
      }

      for (const name of expectedStaticValueInputNames) {
        const appearance = inputAppearance(name)
        push(new Error(`${name}: Expected input.value() call, got ${appearance}`));
      }

      for (const name of expectedValueProvidingTokenInputNames) {
        const appearance = getInputTokenShape(inputOptions[name]);
        push(new Error(`${name}: Expected dependency name or value-providing input() call, got ${appearance}`));
      }

      for (const name of wrongTypeInputNames) {
        const type = typeAppearance(inputOptions[name]);
        push(new Error(`${name}: Expected dependency name or input() call, got ${type}`));
      }

      for (const error of validateFailedErrors) {
        push(error);
      }
    });

    const inputMetadata = getStaticInputMetadata(inputOptions);

    const expectedOutputNames =
      (Array.isArray(description.outputs)
        ? description.outputs
     : typeof description.outputs === 'function'
        ? description.outputs(inputMetadata)
            .map(name =>
              (name.startsWith('#')
                ? name
                : '#' + name))
        : []);

    const ownUpdateDescription =
      (typeof description.update === 'object'
        ? description.update
     : typeof description.update === 'function'
        ? description.update(inputMetadata)
        : null);

    const outputOptions = {};

    const instantiatedTemplate = {
      symbol: templateCompositeFrom.symbol,

      outputs(providedOptions) {
        withAggregate({message: `Errors in output options passed to ${compositionName}`}, ({push}) => {
          const misplacedOutputNames = [];
          const wrongTypeOutputNames = [];

          for (const [name, value] of Object.entries(providedOptions)) {
            if (!expectedOutputNames.includes(name)) {
              misplacedOutputNames.push(name);
              continue;
            }

            if (typeof value !== 'string') {
              wrongTypeOutputNames.push(name);
              continue;
            }
          }

          if (!empty(misplacedOutputNames)) {
            push(new Error(`Unexpected output names: ${misplacedOutputNames.join(', ')}`));
          }

          for (const name of wrongTypeOutputNames) {
            const appearance = typeAppearance(providedOptions[name]);
            push(new Error(`${name}: Expected string, got ${appearance}`));
          }
        });

        Object.assign(outputOptions, providedOptions);
        return instantiatedTemplate;
      },

      toDescription() {
        const finalDescription = {};

        if ('annotation' in description) {
          finalDescription.annotation = description.annotation;
        }

        if ('compose' in description) {
          finalDescription.compose = description.compose;
        }

        if (ownUpdateDescription) {
          finalDescription.update = ownUpdateDescription;
        }

        function parseDefaultMappingFromInputDescription(inputDescription) {
          const tokenShape = getInputTokenShape(inputDescription);
          const tokenValue = getInputTokenValue(inputDescription);

          switch (tokenShape) {
            case 'input': {
              const {defaultValue, defaultDependency} = tokenValue;

              if (defaultValue)
                return input.value(defaultValue);

              if (defaultDependency)
                return input.dependency(defaultDependency);

              return input.value(null);
            }

            case 'input.staticValue': {
              const {defaultValue} = tokenValue;

              if (defaultValue)
                return input.value(defaultValue);

              return input.value(null);
            }

            case 'input.staticDependency': {
              const {defaultDependency} = tokenValue;

              if (defaultDependency)
                return input.value(defaultDependency);

              return input.value(null);
            }

            case 'input.subroutine': {
              const {defaultTemplate, inputs, outputs} = tokenValue[0];
              const description = {};

              if (defaultTemplate) description.template = defaultTemplate;
              if (inputs) description.inputs = inputs;
              if (outputs) description.outputs = outputs;

              return input.subroutine(description);
            }

            default:
              return input.value(null);
          }
        }

        if ('inputs' in description) {
          const inputMapping = {};

          for (const [name, token] of Object.entries(description.inputs)) {
            if (name in inputOptions) {
              if (typeof inputOptions[name] === 'string') {
                inputMapping[name] = input.dependency(inputOptions[name]);
              } else {
                inputMapping[name] = inputOptions[name];
              }
            } else {
              inputMapping[name] = parseDefaultMappingFromInputDescription(token);
            }
          }

          finalDescription.inputMapping = inputMapping;
          finalDescription.inputDescriptions = description.inputs;
        }

        if ('outputs' in description) {
          const finalOutputs = {};

          for (const name of expectedOutputNames) {
            if (name in outputOptions) {
              finalOutputs[name] = outputOptions[name];
            } else {
              finalOutputs[name] = name;
            }
          }

          finalDescription.outputs = finalOutputs;
        }

        if ('steps' in description) {
          finalDescription.steps = description.steps;
        }

        return finalDescription;
      },

      toResolvedComposition() {
        const ownDescription = instantiatedTemplate.toDescription();

        const finalDescription = {...ownDescription};

        const aggregate = openAggregate({message: `Errors resolving ${compositionName}`});

        const steps = ownDescription.steps();

        const resolvedSteps =
          aggregate.map(
            steps,
            decorateErrorWithIndex(step =>
              (step.symbol === templateCompositeFrom.symbol
                ? compositeFrom(step.toResolvedComposition())
                : step)),
            {message: `Errors resolving steps`});

        aggregate.close();

        finalDescription.steps = resolvedSteps;

        return finalDescription;
      },
    };

    return instantiatedTemplate;
  };

  annotateFunction(instantiate, {description: compositionName});

  instantiate.inputs = instantiate;
  instantiate.description = description;

  return instantiate;
}

templateCompositeFrom.symbol = Symbol();

export function subroutineFrom(template) {
  const inputs =
    Object.keys(template.description.inputs);

  const outputs =
    template.description.outputs;

  return input.subroutine({template, inputs, outputs});
}

export const continuationSymbol = Symbol.for('compositeFrom: continuation symbol');
export const noTransformSymbol = Symbol.for('compositeFrom: no-transform symbol');

export function compositeFrom(description) {
  const {annotation} = description;
  const compositionName = getCompositionName(description);

  const debug = fn => {
    if (compositeFrom.debug === true) {
      const label =
        (annotation
          ? colors.dim(`[composite: ${annotation}]`)
          : colors.dim(`[composite]`));
      const result = fn();
      if (Array.isArray(result)) {
        console.log(label, ...result.map(value =>
          (typeof value === 'object'
            ? inspect(value, {depth: 1, colors: true, compact: true, breakLength: Infinity})
            : value)));
      } else {
        console.log(label, result);
      }
    }
  };

  if (!Array.isArray(description.steps)) {
    throw new TypeError(
      `Expected steps to be array, got ${typeAppearance(description.steps)}` +
      (annotation ? ` (${annotation})` : ''));
  }

  const composition =
    description.steps.map(step =>
      ('toResolvedComposition' in step
        ? compositeFrom(step.toResolvedComposition())
        : step));

  const inputMetadata = getStaticInputMetadata(description.inputMapping ?? {});

  function _mapDependenciesToOutputs(providedDependencies) {
    if (!description.outputs) {
      return {};
    }

    if (!providedDependencies) {
      return {};
    }

    return (
      Object.fromEntries(
        Object.entries(description.outputs)
          .map(([continuationName, outputName]) => [
            outputName,
            (continuationName in providedDependencies
              ? providedDependencies[continuationName]
              : providedDependencies[continuationName.replace(/^#/, '')]),
          ])));
  }

  // These dependencies were all provided by the composition which this one is
  // nested inside, so input('name')-shaped tokens are going to be evaluated
  // in the context of the containing composition.
  const dependenciesFromInputs =
    Object.values(description.inputMapping ?? {})
      .map(token => {
        const tokenShape = getInputTokenShape(token);
        const tokenValue = getInputTokenValue(token);
        switch (tokenShape) {
          case 'input.dependency':
            return tokenValue;
          case 'input':
          case 'input.updateValue':
            return token;
          case 'input.myself':
            return 'this';
          case 'input.thisProperty':
            return 'thisProperty';
          default:
            return null;
        }
      })
      .filter(Boolean);

  const anyInputsUseUpdateValue =
    dependenciesFromInputs
      .filter(dependency => isInputToken(dependency))
      .some(token => getInputTokenShape(token) === 'input.updateValue');

  const inputNames =
    Object.keys(description.inputMapping ?? {});

  const inputSymbols =
    inputNames.map(name => input(name));

  const inputsMayBeDynamicValue =
    stitchArrays({
      mappingToken: Object.values(description.inputMapping ?? {}),
      descriptionToken: Object.values(description.inputDescriptions ?? {}),
    }).map(({mappingToken, descriptionToken}) => {
        if (getInputTokenShape(descriptionToken) === 'input.staticValue') return false;
        if (getInputTokenShape(mappingToken) === 'input.value') return false;
        if (getInputTokenShape(mappingToken) === 'input.subroutine') return false;
        return true;
      });

  const inputDescriptions =
    Object.values(description.inputDescriptions ?? {});

  /*
  const inputsAcceptNull =
    Object.values(description.inputDescriptions ?? {})
      .map(token => {
        const tokenValue = getInputTokenValue(token);
        if (!tokenValue) return false;
        if ('acceptsNull' in tokenValue) return tokenValue.acceptsNull;
        if ('defaultValue' in tokenValue) return tokenValue.defaultValue === null;
        return false;
      });
  */

  // Update descriptions passed as the value in an input.updateValue() token,
  // as provided as inputs for this composition.
  const inputUpdateDescriptions =
    Object.values(description.inputMapping ?? {})
      .map(token =>
        (getInputTokenShape(token) === 'input.updateValue'
          ? getInputTokenValue(token)
          : null))
      .filter(Boolean);

  const base = composition.at(-1);
  const steps = composition.slice();

  const aggregate = openAggregate({
    message:
      `Errors preparing composition` +
      (annotation ? ` (${annotation})` : ''),
  });

  const compositionNests = description.compose ?? true;

  if (compositionNests && empty(steps)) {
    aggregate.push(new TypeError(`Expected at least one step`));
  }

  // Steps default to exposing if using a shorthand syntax where flags aren't
  // specified at all.
  const stepsExpose =
    steps
      .map(step =>
        (step.flags
          ? step.flags.expose ?? false
          : true));

  // Steps default to composing if using a shorthand syntax where flags aren't
  // specified at all - *and* aren't the base (final step), unless the whole
  // composition is nestable.
  const stepsCompose =
    steps
      .map((step, index, {length}) =>
        (step.flags
          ? step.flags.compose ?? false
          : (index === length - 1
              ? compositionNests
              : true)));

  // Steps update if the corresponding flag is explicitly set, if a transform
  // function is provided, or if the dependencies include an input.updateValue
  // token.
  const stepsUpdate =
    steps
      .map(step =>
        (step.flags
          ? step.flags.update ?? false
          : !!step.transform ||
            !!step.dependencies?.some(dependency =>
                isInputToken(dependency) &&
                getInputTokenShape(dependency) === 'input.updateValue')));

  // Steps reflect a subroutine if they're represented in-place by a call to
  // input.subroutine.
  const stepsReflectSubroutine =
    steps
      .map(step =>
        isInputToken(step) &&
        getInputTokenShape(step) === 'input.subroutine');

  // The expose description for a step is just the entire step object, when
  // using the shorthand syntax where {flags: {expose: true}} is left implied.
  const stepExposeDescriptions =
    steps
      .map((step, index) =>
        (stepsExpose[index]
          ? (step.flags
              ? step.expose ?? null
              : step)
          : null));

  // The update description for a step, if present at all, is always set
  // explicitly. There may be multiple per step - namely that step's own
  // {update} description, and any descriptions passed as the value in an
  // input.updateValue({...}) token.
  const stepUpdateDescriptions =
    steps
      .map((step, index) =>
        (stepsUpdate[index]
          ? [
              step.update ?? null,
              ...(stepExposeDescriptions[index]?.dependencies ?? [])
                .filter(dependency => isInputToken(dependency))
                .filter(token => getInputTokenShape(token) === 'input.updateValue')
                .map(token => getInputTokenValue(token)),
            ].filter(Boolean)
          : []));

  // Indicates presence of a {compute} function on the expose description.
  const stepsCompute =
    stepExposeDescriptions
      .map(expose => !!expose?.compute);

  // Indicates presence of a {transform} function on the expose description.
  const stepsTransform =
    stepExposeDescriptions
      .map(expose => !!expose?.transform);

  function parseDependenciesFromInputToken(inputToken) {
    if (typeof inputToken === 'string') {
      if (inputToken.startsWith('#')) {
        return [];
      } else {
        return [inputToken];
      }
    }

    const tokenShape = getInputTokenShape(inputToken);
    const tokenValue = getInputTokenValue(inputToken);

    switch (tokenShape) {
      case 'input.dependency':
        if (tokenValue.startsWith('#')) {
          return [];
        } else {
          return [tokenValue];
        }

      case 'input.myself':
        return ['this'];

      case 'input.subroutine':
        if ('inputs' in tokenValue[0]) {
          const inputTokens = Object.values(tokenValue[0].inputs);
          return inputTokens.flatMap(parseDependenciesFromInputToken);
        } else {
          return [];
        }

      case 'input.thisProperty':
        return ['thisProperty'];

      default:
        return [];
    }
  }

  const dependenciesFromSteps =
    unique(
      stepExposeDescriptions
        .flatMap(expose => expose?.dependencies ?? [])
        .flatMap(parseDependenciesFromInputToken));

  const anyStepsUseUpdateValue =
    stepExposeDescriptions
      .some(expose =>
        (expose?.dependencies
          ? expose.dependencies.includes(input.updateValue())
          : false));

  const anyStepsExpose =
    stepsExpose.includes(true);

  const anyStepsUpdate =
    stepsUpdate.includes(true);

  const anyStepsCompute =
    stepsCompute.includes(true);

  const compositionExposes =
    anyStepsExpose;

  const compositionUpdates =
    'update' in description ||
    anyInputsUseUpdateValue ||
    anyStepsUseUpdateValue ||
    anyStepsUpdate;

  const stepsFirstTimeCalling =
    Array.from({length: steps.length}).fill(true);

  const stepEntries = stitchArrays({
    step: steps,
    stepComposes: stepsCompose,
    stepComputes: stepsCompute,
    stepTransforms: stepsTransform,
  });

  for (let i = 0; i < stepEntries.length; i++) {
    const {
      step,
      stepComposes,
      stepComputes,
      stepTransforms,
    } = stepEntries[i];

    const isBase = i === stepEntries.length - 1;
    const message =
      `Errors in step #${i + 1}` +
      (isBase ? ` (base)` : ``) +
      (step.annotation ? ` (${step.annotation})` : ``);

    aggregate.nest({message}, ({push}) => {
      if (!isBase && !stepComposes) {
        return push(new TypeError(
          `All steps leading up to base must compose`));
      }

      if (
        !compositionNests && !compositionUpdates &&
        stepTransforms && !stepComputes
      ) {
        return push(new TypeError(
          `Steps which only transform can't be used in a composition that doesn't update`));
      }
    });
  }

  if (!compositionNests && !compositionUpdates && !anyStepsCompute) {
    aggregate.push(new TypeError(`Expected at least one step to compute`));
  }

  aggregate.close();

  function _prepareContinuation(callingTransformForThisStep) {
    const continuationStorage = {
      returnedWith: null,
      providedDependencies: undefined,
      providedValue: undefined,
    };

    const continuation =
      (callingTransformForThisStep
        ? (providedValue, providedDependencies = null) => {
            continuationStorage.returnedWith = 'continuation';
            continuationStorage.providedDependencies = providedDependencies;
            continuationStorage.providedValue = providedValue;
            return continuationSymbol;
          }
        : (providedDependencies = null) => {
            continuationStorage.returnedWith = 'continuation';
            continuationStorage.providedDependencies = providedDependencies;
            return continuationSymbol;
          });

    continuation.exit = (providedValue) => {
      continuationStorage.returnedWith = 'exit';
      continuationStorage.providedValue = providedValue;
      return continuationSymbol;
    };

    if (compositionNests) {
      const makeRaiseLike = returnWith =>
        (callingTransformForThisStep
          ? (providedValue, providedDependencies = null) => {
              continuationStorage.returnedWith = returnWith;
              continuationStorage.providedDependencies = providedDependencies;
              continuationStorage.providedValue = providedValue;
              return continuationSymbol;
            }
          : (providedDependencies = null) => {
              continuationStorage.returnedWith = returnWith;
              continuationStorage.providedDependencies = providedDependencies;
              return continuationSymbol;
            });

      continuation.raiseOutput = makeRaiseLike('raiseOutput');
      continuation.raiseOutputAbove = makeRaiseLike('raiseOutputAbove');
    }

    return {continuation, continuationStorage};
  }

  function _computeOrTransform(initialValue, continuationIfApplicable, initialDependencies) {
    const expectingTransform = initialValue !== noTransformSymbol;

    let valueSoFar =
      (expectingTransform
        ? initialValue
        : undefined);

    const availableDependencies = {...initialDependencies};

    const inputValues =
      Object.values(description.inputMapping ?? {})
        .map(token => {
          const tokenShape = getInputTokenShape(token);
          const tokenValue = getInputTokenValue(token);
          switch (tokenShape) {
            case 'input.dependency':
              return initialDependencies[tokenValue];
            case 'input.value':
              return tokenValue;
            case 'input.subroutine':
              return token;
            case 'input.updateValue':
              if (!expectingTransform)
                throw new Error(`Unexpected input.updateValue() accessed on non-transform call`);
              return valueSoFar;
            case 'input.myself':
              return initialDependencies['this'];
            case 'input.thisProperty':
              return initialDependencies['thisProperty'];
            case 'input':
              return initialDependencies[token];
            default:
              throw new TypeError(`Unexpected input shape ${tokenShape}`);
          }
        });

    const inputDictionary =
      Object.fromEntries(
        stitchArrays({symbol: inputSymbols, value: inputValues})
          .map(({symbol, value}) => [symbol, value]));

    withAggregate({message: `Errors in input values provided to ${compositionName}`}, ({push}) => {
      for (const {dynamic, name, value, description} of stitchArrays({
        dynamic: inputsMayBeDynamicValue,
        name: inputNames,
        value: inputValues,
        description: inputDescriptions,
      })) {
        if (!dynamic) continue;
        try {
          validateInputValue(value, description);
        } catch (error) {
          error.message = `${name}: ${error.message}`;
          push(error);
        }
      }
    });

    if (expectingTransform) {
      debug(() => [colors.bright(`begin composition - transforming from:`), initialValue]);
    } else {
      debug(() => colors.bright(`begin composition - not transforming`));
    }

    function getDependenciesForSelection(dependencies) {
      return dependencies.map(dependency => {
        if (!isInputToken(dependency)) return dependency;
        const tokenShape = getInputTokenShape(dependency);
        const tokenValue = getInputTokenValue(dependency);
        switch (tokenShape) {
          case 'input':
          case 'input.staticDependency':
          case 'input.staticValue':
            return dependency;
          case 'input.myself':
            return input.myself();
          case 'input.thisProperty':
            return input.thisProperty();
          case 'input.dependency':
            return tokenValue;
          case 'input.updateValue':
            return input.updateValue();
          default:
            throw new Error(`Unexpected token ${tokenShape} as dependency`);
        }
      });
    }

    for (
      let [i, {
        step,
        stepComposes,
      }] of
        stitchArrays({
          step: steps,
          stepComposes: stepsCompose,
        }).entries()
    ) {
      const isBase = i === steps.length - 1;

      debug(() => [
        `step #${i+1}` +
        (isBase
          ? ` (base):`
          : ` of ${steps.length}:`),
        (step.flags?.compose
          ? getCompositionName(step)
          : step)]);

      const filterableDependencies = {
        ...availableDependencies,
        ...inputMetadata,
        ...inputDictionary,
        ...
          (expectingTransform
            ? {[input.updateValue()]: valueSoFar}
            : {}),

        [input.myself()]:
          (initialDependencies && Object.hasOwn(initialDependencies, 'this')
            ? initialDependencies.this
            : null),

        [input.thisProperty()]:
          (initialDependencies && Object.hasOwn(initialDependencies, 'thisProperty')
            ? initialDependencies.thisProperty
            : null),
      };

      const callingSubroutineForThisStep =
        stepsReflectSubroutine[i];

      if (callingSubroutineForThisStep) {
        const tokenValue = getInputTokenValue(step);
        const fauxInputToken = input(tokenValue[0]);
        const stepDescription = tokenValue[1] ?? {};

        const subroutineDescription =
          getInputTokenValue(filterableDependencies[fauxInputToken])[0];

        const inputMapping =
          (Array.isArray(subroutineDescription.inputs)
            ? Object.fromEntries(
                subroutineDescription.inputs
                  .map(name => [name, name]))
         : typeof subroutineDescription.inputs === 'object'
            ? subroutineDescription.inputs
            : {});

        const outputMapping =
          (Array.isArray(subroutineDescription.outputs)
            ? Object.fromEntries(
                subroutineDescription.outputs
                  .map(name => [name, name]))
         : typeof subroutineDescription.outputs === 'object'
            ? subroutineDescription.outputs
            : {});

        const expectedInputNames = Object.keys(inputMapping);
        const providedInputNames = Object.keys(stepDescription.inputs ?? {});

        const unexpectedInputNames =
          providedInputNames
            .filter(name => !expectedInputNames.includes(name));

        if (!empty(unexpectedInputNames)) {
          throw new TypeError(`Unexpected input names: ${unexpectedInputNames.join(', ')}`);
        }

        const mappedInputs =
          Object.fromEntries(
            Object.entries(inputMapping)
              .map(([stepInputName, subroutineInputName]) => [
                subroutineInputName,
                stepDescription.inputs[stepInputName],
              ]));

        const mappedOutputs =
          Object.fromEntries(
            Object.entries(outputMapping)
              .map(([subroutineOutputName, stepOutputName]) => [
                subroutineOutputName,
                stepDescription.outputs[stepOutputName],
              ]));

        const instantiatedTemplate =
          subroutineDescription.template
            .inputs(mappedInputs)
            .outputs(mappedOutputs);

        const composition =
          compositeFrom(instantiatedTemplate.toResolvedComposition());

        step = composition;

        debug(() => [`step #${i+1} - replaced with subroutine "${getCompositionName(composition)}"`]);
      }

      const expose =
        (step.flags
          ? step.expose
          : step);

      if (!expose) {
        if (!isBase) {
          debug(() => `step #${i+1} - no expose description, nothing to do for this step`);
          continue;
        }

        if (expectingTransform) {
          debug(() => `step #${i+1} (base) - no expose description, returning so-far update value:`, valueSoFar);
          if (continuationIfApplicable) {
            debug(() => colors.bright(`end composition - raise (inferred - composing)`));
            return continuationIfApplicable(valueSoFar);
          } else {
            debug(() => colors.bright(`end composition - exit (inferred - not composing)`));
            return valueSoFar;
          }
        } else {
          debug(() => `step #${i+1} (base) - no expose description, nothing to continue with`);
          if (continuationIfApplicable) {
            debug(() => colors.bright(`end composition - raise (inferred - composing)`));
            return continuationIfApplicable();
          } else {
            debug(() => colors.bright(`end composition - exit (inferred - not composing)`));
            return null;
          }
        }
      }

      const callingTransformForThisStep =
        expectingTransform && expose.transform;

      let continuationStorage;

      const selectDependencies =
        getDependenciesForSelection(expose.dependencies ?? []);

      const filteredDependencies =
        filterProperties(filterableDependencies, selectDependencies);

      debug(() => [
        `step #${i+1} - ${callingTransformForThisStep ? 'transform' : 'compute'}`,
        `with dependencies:`, filteredDependencies,
        ...callingTransformForThisStep ? [`from value:`, valueSoFar] : []]);

      let result;

      const getExpectedEvaluation = () =>
        (callingTransformForThisStep
          ? (filteredDependencies
              ? ['transform', valueSoFar, continuationSymbol, filteredDependencies]
              : ['transform', valueSoFar, continuationSymbol])
          : (filteredDependencies
              ? ['compute', continuationSymbol, filteredDependencies]
              : ['compute', continuationSymbol]));

      const naturalEvaluate = () => {
        const [name, ...argsLayout] = getExpectedEvaluation();

        let args = argsLayout;

        let effectiveDependencies;
        let reviewAccessedDependencies;

        if (stepsFirstTimeCalling[i]) {
          const expressedDependencies =
            selectDependencies;

          const remainingDependencies =
            new Set(expressedDependencies);

          const unavailableDependencies = [];
          const accessedDependencies = [];

          effectiveDependencies =
            new Proxy(filteredDependencies, {
              get(target, key) {
                accessedDependencies.push(key);
                remainingDependencies.delete(key);

                const value = target[key];

                if (value === undefined) {
                  unavailableDependencies.push(key);
                }

                return value;
              },
            });

          reviewAccessedDependencies = () => {
            const topAggregate =
              openAggregate({
                message: `Errors in accessed dependencies`,
              });

            const showDependency = dependency =>
              (isInputToken(dependency)
                ? getInputTokenShape(dependency) +
                  `(` +
                  inspect(getInputTokenValue(dependency), {compact: true}) +
                  ')'
                : dependency.toString());

            let anyErrors = false;

            for (const dependency of remainingDependencies) {
              topAggregate.push(new Error(
                `Expected to access ${showDependency(dependency)}`));

              anyErrors = true;
            }

            for (const dependency of unavailableDependencies) {
              const subAggregate =
                openAggregate({
                  message:
                    `Accessed ${showDependency(dependency)}, which is unavailable`,
                });

              let reason = false;

              if (!expressedDependencies.includes(dependency)) {
                subAggregate.push(new Error(
                  `Missing from step's expressed dependencies`));
                reason = true;
              }

              if (filterableDependencies[dependency] === undefined) {
                subAggregate.push(
                  new Error(
                    `Not available` +
                    (isInputToken(dependency)
                      ? ` in input()-type dependencies`
                   : dependency.startsWith('#')
                      ? ` in local dependencies`
                      : ` on object dependencies`)));
                reason = true;
              }

              if (!reason) {
                subAggregate.push(new Error(
                  `Not sure why this is unavailable, sorry!`));
              }

              topAggregate.call(subAggregate.close);

              anyErrors = true;
            }

            if (anyErrors) {
              topAggregate.push(new Error(
                `These dependencies, in total, were accessed:` +
                (empty(accessedDependencies)
                  ? ` (none)`
               : accessedDependencies.length === 1
                  ? showDependency(accessedDependencies[0])
                  : `\n` +
                    accessedDependencies
                      .map(showDependency)
                      .map(line => `  - ${line}`)
                      .join('\n'))));
            }

            topAggregate.close();
          };
        } else {
          effectiveDependencies = filteredDependencies;
          reviewAccessedDependencies = null;
        }

        args =
          args.map(arg =>
            (arg === filteredDependencies
              ? effectiveDependencies
              : arg));

        if (stepComposes) {
          let continuation;

          ({continuation, continuationStorage} =
            _prepareContinuation(callingTransformForThisStep));

          args =
            args.map(arg =>
              (arg === continuationSymbol
                ? continuation
                : arg));
        } else {
          args =
            args.filter(arg => arg !== continuationSymbol);
        }

        let stepError;
        try {
          return expose[name](...args);
        } catch (error) {
          stepError = error;
        } finally {
          stepsFirstTimeCalling[i] = false;

          let reviewError;
          if (reviewAccessedDependencies) {
            try {
              reviewAccessedDependencies();
            } catch (error) {
              reviewError = error;
            }
          }

          const stepPart =
            `step ${i+1}` +
            (isBase
              ? ` (base)`
              : ` of ${steps.length}`) +
            (step.annotation ? `, ${step.annotation}` : ``);

          if (stepError && reviewError) {
            throw new AggregateError(
              [stepError, reviewError],
              `Errors in ${stepPart}`);
          } else if (stepError || reviewError) {
            throw new Error(
              `Error in ${stepPart}`,
              {cause: stepError || reviewError});
          }
        }
      };

      switch (step.cache) {
        // Warning! Highly WIP!
        case 'aggressive': {
          const hrnow = () => {
            const hrTime = process.hrtime();
            return hrTime[0] * 1000000000 + hrTime[1];
          };

          const [name, ...args] = getExpectedEvaluation();

          let cache = globalCompositeCache[step.annotation];
          if (!cache) {
            cache = globalCompositeCache[step.annotation] = {
              transform: new TupleMap(),
              compute: new TupleMap(),
              times: {
                read: [],
                evaluate: [],
              },
            };
          }

          const tuplefied = args
            .flatMap(arg => [
              Symbol.for('compositeFrom: tuplefied arg divider'),
              ...(typeof arg !== 'object' || Array.isArray(arg)
                ? [arg]
                : Object.entries(arg).flat()),
            ]);

          const readTime = hrnow();
          const cacheContents = cache[name].get(tuplefied);
          cache.times.read.push(hrnow() - readTime);

          if (cacheContents) {
            ({result, continuationStorage} = cacheContents);
          } else {
            const evaluateTime = hrnow();
            result = naturalEvaluate();
            cache.times.evaluate.push(hrnow() - evaluateTime);
            cache[name].set(tuplefied, {result, continuationStorage});
          }

          break;
        }

        default: {
          result = naturalEvaluate();
          break;
        }
      }

      if (result !== continuationSymbol) {
        debug(() => [`step #${i+1} - result: exit (inferred) ->`, result]);
        debug(() => colors.bright(`end composition - exit (inferred)`));

        return result;
      }

      const {returnedWith} = continuationStorage;

      if (returnedWith === 'exit') {
        const {providedValue} = continuationStorage;

        debug(() => [`step #${i+1} - result: exit (explicit) ->`, providedValue]);
        debug(() => colors.bright(`end composition - exit (explicit)`));

        if (compositionNests) {
          return continuationIfApplicable.exit(providedValue);
        } else {
          return providedValue;
        }
      }

      const {providedValue, providedDependencies} = continuationStorage;

      const continuationArgs = [];
      if (expectingTransform) {
        continuationArgs.push(
          (callingTransformForThisStep
            ? providedValue ?? null
            : valueSoFar ?? null));
      }

      debug(() => {
        const base = `step #${i+1} - result: ` + returnedWith;
        const parts = [];

        if (callingTransformForThisStep) {
          parts.push('value:', providedValue);
        }

        if (providedDependencies !== null) {
          parts.push(`deps:`, providedDependencies);
        } else {
          parts.push(`(no deps)`);
        }

        if (empty(parts)) {
          return base;
        } else {
          return [base + ' ->', ...parts];
        }
      });

      switch (returnedWith) {
        case 'raiseOutput':
          debug(() =>
            (isBase
              ? colors.bright(`end composition - raiseOutput (base: explicit)`)
              : colors.bright(`end composition - raiseOutput`)));
          continuationArgs.push(_mapDependenciesToOutputs(providedDependencies));
          return continuationIfApplicable(...continuationArgs);

        case 'raiseOutputAbove':
          debug(() => colors.bright(`end composition - raiseOutputAbove`));
          continuationArgs.push(_mapDependenciesToOutputs(providedDependencies));
          return continuationIfApplicable.raiseOutput(...continuationArgs);

        case 'continuation':
          if (isBase) {
            debug(() => colors.bright(`end composition - raiseOutput (inferred)`));
            continuationArgs.push(_mapDependenciesToOutputs(providedDependencies));
            return continuationIfApplicable(...continuationArgs);
          } else {
            Object.assign(availableDependencies, providedDependencies);
            if (callingTransformForThisStep && providedValue !== null) {
              valueSoFar = providedValue;
            }
            break;
          }
      }
    }
  }

  const constructedDescriptor = {};

  if (annotation) {
    constructedDescriptor.annotation = annotation;
  }

  constructedDescriptor.flags = {
    update: compositionUpdates,
    expose: compositionExposes,
    compose: compositionNests,
  };

  if (compositionUpdates) {
    // TODO: This is a dumb assign statement, and it could probably do more
    // interesting things, like combining validation functions.
    constructedDescriptor.update =
      Object.assign(
        {...description.update ?? {}},
        ...inputUpdateDescriptions,
        ...stepUpdateDescriptions.flat());
  }

  if (compositionExposes) {
    const expose = constructedDescriptor.expose = {};

    expose.dependencies =
      unique([
        ...dependenciesFromInputs,
        ...dependenciesFromSteps,
      ]);

    const _wrapper = (...args) => {
      try {
        return _computeOrTransform(...args);
      } catch (thrownError) {
        const error = new Error(
          `Error computing composition` +
          (annotation ? ` ${annotation}` : ''));
        error.cause = thrownError;
        error[Symbol.for('hsmusic.aggregate.translucent')] = true;
        throw error;
      }
    };

    if (compositionNests) {
      if (compositionUpdates) {
        expose.transform = (value, continuation, dependencies) =>
          _wrapper(value, continuation, dependencies);
      }

      if (anyStepsCompute && !anyStepsUseUpdateValue && !anyInputsUseUpdateValue) {
        expose.compute = (continuation, dependencies) =>
          _wrapper(noTransformSymbol, continuation, dependencies);
      }

      if (base.cacheComposition) {
        expose.cache = base.cacheComposition;
      }
    } else if (compositionUpdates) {
      if (!empty(steps)) {
        expose.transform = (value, dependencies) =>
          _wrapper(value, null, dependencies);
      }
    } else {
      expose.compute = (dependencies) =>
        _wrapper(noTransformSymbol, null, dependencies);
    }
  }

  return constructedDescriptor;
}

export function displayCompositeCacheAnalysis() {
  const showTimes = (cache, key) => {
    const times = cache.times[key].slice().sort();

    const all = times;
    const worst10pc = times.slice(-times.length / 10);
    const best10pc = times.slice(0, times.length / 10);
    const middle50pc = times.slice(times.length / 4, -times.length / 4);
    const middle80pc = times.slice(times.length / 10, -times.length / 10);

    const fmt = val => `${(val / 1000).toFixed(2)}ms`.padStart(9);
    const avg = times => times.reduce((a, b) => a + b, 0) / times.length;

    const left = ` - ${key}: `;
    const indn = ' '.repeat(left.length);
    console.log(left + `${fmt(avg(all))} (all ${all.length})`);
    console.log(indn + `${fmt(avg(worst10pc))} (worst 10%)`);
    console.log(indn + `${fmt(avg(best10pc))} (best 10%)`);
    console.log(indn + `${fmt(avg(middle80pc))} (middle 80%)`);
    console.log(indn + `${fmt(avg(middle50pc))} (middle 50%)`);
  };

  for (const [annotation, cache] of Object.entries(globalCompositeCache)) {
    console.log(`Cached ${annotation}:`);
    showTimes(cache, 'evaluate');
    showTimes(cache, 'read');
  }
}

// Evaluates a function with composite debugging enabled, turns debugging
// off again, and returns the result of the function. This is mostly syntax
// sugar, but also helps avoid unit tests avoid accidentally printing debug
// info for a bunch of unrelated composites (due to property enumeration
// when displaying an unexpected result). Use as so:
//
//   Without debugging:
//     t.same(thing.someProp, value)
//
//   With debugging:
//     t.same(debugComposite(() => thing.someProp), value)
//
export function debugComposite(fn) {
  compositeFrom.debug = true;
  const value = fn();
  compositeFrom.debug = false;
  return value;
}
