export class ContractManager {
  #registeredContracts = Object.create(null);

  registerContract(name, description) {
    ContractManager.validateContractDescription(description);
    this.#registeredContracts[name] = description;
  }

  getContractHooks(name) {
    return this.getContractInfo(name).hooks;
  }

  getContractInfo(name) {
    // todo: cache
    return this.#computeContractInfo(name);
  }

  #computeContractInfo(name) {
    const description = this.#registeredContracts[name];
    if (!description) {
      throw new Error(`Contract ${name} not registered`);
    }

    let numArguments = 0;
    const args = [];
    const argumentGenerator = (function*() {
      while (true) {
        const argument = {type: 'argument', index: numArguments++, of: name}
        args.push(argument);
        yield argument;
      }
    })();

    const hooks = [];
    const subcontracts = {};
    const structure = {};

    const contextualizeHook = (args, {type, ...hook}) => {
      switch (type) {
        case 'argument':
          return {type: 'argument', index: hook.index};
        case 'selectPropertyPath': {
          /*
          switch (hook.object.type) {
            case 'argument':
              console.log('select argument', hook.object.index, '=', args[hook.object.index]);
              return {type: 'selectPropertyPath', object: args[hook.object.index], path: hook.path};
            case 'selectPropertyPath':
              console.log('merge', hook.object.path, 'with', hook.path);
              return {type: 'selectPropertyPath', object: args[hook.object.object.index], path: [...hook.object.path, ...hook.path]};
            default:
              throw new Error(`Can't contextualize unknown hook type OF OBJECT ${hook.object.type}`);
          }
          */
          const contextualizedObject = contextualizeHook(args, hook.object);
          console.log(`contextualized property object:`, contextualizedObject);
          switch (contextualizedObject.type) {
            case 'argument':
              return {type: 'selectPropertyPath', object: args[contextualizedObject.index], path: hook.path};
            case 'selectPropertyPath':
              return {type: 'selectPropertyPath', object: contextualizedObject.object, path: [...contextualizedObject.path, ...hook.path]};
          }
        }
        default:
          throw new Error(`Can't contextualize unknown hook type ${type}`);
      }
    };

    const contractUtility = {
      subcontract: (name, ...args) => {
        const info = this.getContractInfo(name.startsWith('#') ? name.slice(1) : name);

        for (const hook of info.hooks) {
          hooks.push(contextualizeHook(args, hook));
        }

        return {type: 'subcontract', name, args};
      },

      provide: (properties) => {
        Object.assign(structure, properties);
      },

      selectProperty: (object, property) => {
        hooks.push(contextualizeHook(args, {type: 'selectPropertyPath', object, path: [property]}));
        return {type: 'selectPropertyPath', object, path: [property]};
      },
    };

    description.hook(contractUtility, argumentGenerator);

    return {hooks, subcontracts, structure};
  }

  static validateContractDescription(description) {
    // todo
  }
}

const {default: {contracts}} = await import('./content/dependencies/generateAlbumTrackList.js');
const util = await import('util');

const manager = new ContractManager();
for (const [name, description] of Object.entries(contracts)) {
  manager.registerContract(name, description);
}

const testContract = 'displayTrackSections';

for (const hook of manager.getContractHooks(testContract)) {
  if (hook.type === 'selectPropertyPath') {
    console.log(`- (${util.inspect(hook.object, {colors: true})}).${hook.path.join('.')}`);
  } else {
    console.log(`- ${hook}`);
  }
}

// console.log(util.inspect(manager.getContractInfo(testContract).structure, {colors: true, depth: Infinity}));
