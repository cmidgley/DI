"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIContainer = void 0;
const constructor_arguments_identifier_1 = require("../constructor-arguments/constructor-arguments-identifier");
const registration_kind_1 = require("../registration-kind/registration-kind");
/**
 * A Dependency-Injection container that holds services and can produce instances of them as required.
 * It mimics reflection by parsing the app at compile-time and supporting the generic-reflection syntax.
 * @author Frederik Wessberg
 */
class DIContainer {
    constructor() {
        /**
         * A map between interface names and the services that should be dependency injected
         * @type {Map<string, ConstructorArgument[]>}
         */
        this.constructorArguments = new Map();
        /**
         * A Map between identifying names for services and their IRegistrationRecords.
         * @type {Map<string, RegistrationRecord<{}, {}>>}
         */
        this.serviceRegistry = new Map();
        /**
         * A map between identifying names for services and concrete instances of their implementation.
         * @type {Map<string, *>}
         */
        this.instances = new Map();
    }
    /**
     * Provides a global shared instance of a container (singleton).  This is
     * especially useful when creating libraries (such as in a monorepo) where
     * the library's imported file defines the dependencies that need to be
     * injected for the library to operate without exposing the full set of
     * injections necessary for each library.
     *
     * @returns Singleton container
     */
    static container() {
        if (!DIContainer.diContainer)
            DIContainer.diContainer = new DIContainer();
        return DIContainer.diContainer;
    }
    registerSingleton(newExpression, options) {
        if (options == null)
            throw new ReferenceError(`${this.constructor.name} could not get service: No arguments were given!`);
        if (newExpression == null) {
            return this.register(registration_kind_1.RegistrationKind.SINGLETON, newExpression, options);
        }
        else {
            return this.register(registration_kind_1.RegistrationKind.SINGLETON, newExpression, options);
        }
    }
    registerTransient(newExpression, options) {
        if (options == null)
            throw new ReferenceError(`${this.constructor.name} could not get service: No arguments were given!`);
        if (newExpression == null) {
            return this.register(registration_kind_1.RegistrationKind.TRANSIENT, newExpression, options);
        }
        else {
            return this.register(registration_kind_1.RegistrationKind.TRANSIENT, newExpression, options);
        }
    }
    /**
     * Gets an instance of the service matching the interface given as a generic type parameter.
     * For example, 'container.get<IFoo>()' returns a concrete instance of the implementation associated with the
     * generic interface name.
     *
     * You should not pass any options to the method if using the compiler. It will do that automatically.
     * @param {IGetOptions} [options]
     * @returns {T}
     */
    get(options) {
        if (options == null)
            throw new ReferenceError(`${this.constructor.name} could not get service: No options was given!`);
        return this.constructInstance(options);
    }
    /**
     * Returns true if a service has been registered matching the interface given as a generic type parameter.
     * For example, 'container.get<IFoo>()' returns a concrete instance of the implementation associated with the
     * generic interface name.
     *
     * You should not pass any options to the method if using the compiler. It will do that automatically.
     * @param {IGetOptions} [options]
     * @returns {boolean}
     */
    has(options) {
        if (options == null)
            throw new ReferenceError(`${this.constructor.name} could not get service: No options was given!`);
        return this.serviceRegistry.has(options.identifier);
    }
    register(kind, newExpression, options) {
        // Take all of the constructor arguments for the implementation
        const implementationArguments = "implementation" in options && options.implementation != null && options.implementation[constructor_arguments_identifier_1.CONSTRUCTOR_ARGUMENTS_SYMBOL] != null ? options.implementation[constructor_arguments_identifier_1.CONSTRUCTOR_ARGUMENTS_SYMBOL] : [];
        this.constructorArguments.set(options.identifier, implementationArguments);
        this.serviceRegistry.set(options.identifier, "implementation" in options && options.implementation != null
            ? Object.assign(Object.assign({}, options), { kind }) : Object.assign(Object.assign({}, options), { kind, newExpression: newExpression }));
    }
    /**
     * Returns true if an instance exists that matches the given identifier.
     * @param {string} identifier
     * @returns {boolean}
     */
    hasInstance(identifier) {
        return this.getInstance(identifier) != null;
    }
    /**
     * Gets the cached instance, if any, associated with the given identifier.
     * @param {string} identifier
     * @returns {T|null}
     */
    getInstance(identifier) {
        const instance = this.instances.get(identifier);
        return instance == null ? null : instance;
    }
    /**
     * Gets an IRegistrationRecord associated with the given identifier.
     * @param {string} identifier
     * @param {string} [parent]
     * @returns {RegistrationRecord<T>}
     */
    getRegistrationRecord({ identifier, parentChain }) {
        const record = this.serviceRegistry.get(identifier);
        if (record == null)
            throw new ReferenceError(`${this.constructor.name} could not find a service for identifier: "${identifier}". ${parentChain == null || parentChain.length < 1 ? "" : `It is required by the service: '${parentChain.map(parent => parent.identifier).join(" -> ")}'.`} Remember to register it as a service!`);
        return record;
    }
    /**
     * Caches the given instance so that it can be retrieved in the future.
     * @param {string} identifier
     * @param {T} instance
     * @returns {T}
     */
    setInstance(identifier, instance) {
        this.instances.set(identifier, instance);
        return instance;
    }
    /**
     * Gets a lazy reference to another service
     * @param lazyPointer
     */
    getLazyIdentifier(lazyPointer) {
        return new Proxy({}, { get: (_, key) => lazyPointer()[key] });
    }
    /**
     * Constructs a new instance of the given identifier and returns it.
     * It checks the constructor arguments and injects any services it might depend on recursively.
     * @param {IConstructInstanceOptions<T>} options
     * @returns {T}
     */
    constructInstance({ identifier, parentChain = [] }) {
        const registrationRecord = this.getRegistrationRecord({ identifier, parentChain });
        // If an instance already exists (and it is a singleton), return that one
        if (this.hasInstance(identifier) && registrationRecord.kind === registration_kind_1.RegistrationKind.SINGLETON) {
            return this.getInstance(identifier);
        }
        // Otherwise, instantiate a new one
        let instance;
        const me = {
            identifier,
            ref: this.getLazyIdentifier(() => instance)
        };
        // If a user-provided new-expression has been provided, invoke that to get an instance.
        if ("newExpression" in registrationRecord) {
            if (typeof registrationRecord.newExpression !== "function") {
                throw new TypeError(`Could not instantiate the service with the identifier: '${registrationRecord.identifier}': You provided a custom instantiation argument, but it wasn't of type function. It has to be a function that returns whatever should be used as an instance of the Service!`);
            }
            try {
                instance = registrationRecord.newExpression();
            }
            catch (ex) {
                throw new Error(`Could not instantiate the service with the identifier: '${registrationRecord.identifier}': When you registered the service, you provided a custom instantiation function, but it threw an exception when it was run!`);
            }
        }
        else {
            // Find the arguments for the identifier
            const mappedArgs = this.constructorArguments.get(identifier);
            if (mappedArgs == null)
                throw new ReferenceError(`${this.constructor.name} could not find constructor arguments for the service: '${identifier}'. Have you registered it as a service?`);
            // Instantiate all of the argument services (or re-use them if they were registered as singletons)
            const instanceArgs = mappedArgs.map((dep) => {
                if (dep === undefined)
                    return undefined;
                const matchedParent = parentChain.find(parent => parent.identifier === dep);
                if (matchedParent != null)
                    return matchedParent.ref;
                return this.constructInstance({ identifier: dep, parentChain: [...parentChain, me] });
            });
            try {
                // Try to construct an instance with 'new' and if it fails, call the implementation directly.
                const newable = registrationRecord.implementation;
                instance = new newable(...instanceArgs);
            }
            catch (ex) {
                if (registrationRecord.implementation == null)
                    throw new ReferenceError(`${this.constructor.name} could not construct a new service of kind: ${identifier}. Reason: No implementation was given!`);
                const constructable = registrationRecord.implementation;
                // Try without 'new' and call the implementation as a function.
                instance = constructable(...instanceArgs);
            }
        }
        return registrationRecord.kind === registration_kind_1.RegistrationKind.SINGLETON ? this.setInstance(identifier, instance) : instance;
    }
}
exports.DIContainer = DIContainer;
//# sourceMappingURL=di-container.js.map