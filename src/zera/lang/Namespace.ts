import {
    str, list, Var, atom, Atom, swap, arrayMap, reduce, MapEntry, key, val,
    Symbol, IMap, assoc, dissoc, IMeta, AReference, zeraNameToJS
} from "../runtime";

import { zeraType } from "../types";

type JSModule = { [key: string]: any };

@zeraType('zera.lang.Namespace', AReference)
export class Namespace extends AReference implements IMeta {
    private $zera$name: Symbol;
    private $zera$mappings: Atom;
    private $zera$aliases: Atom;

    constructor(name: Symbol) {
        super(null); // NOTE: we may want to take meta data here
        this.$zera$name = name;
        this.$zera$mappings = atom(arrayMap());
        this.$zera$aliases = atom(arrayMap());
    }

    static namespaces: { [keys: string]: Namespace } = {};

    static all() {
        return list.apply(null, Object.values(Namespace.namespaces));
    }

    static findOrCreate(name: Symbol): Namespace {
        var ns = Namespace.namespaces[name.toString()];
        if (ns != null) return ns;
        else {
            ns = new Namespace(name);
            Namespace.namespaces[name.toString()] = ns;
        }
        return ns;
    }

    static findOrDie(name: Symbol | string | null): Namespace {
        if (name == null)
            throw new Error("nil is not a valid namespace");

        var ns = Namespace.namespaces[name.toString()];
        if (ns != null) return ns;

        throw new Error("Can't find the namespace: " + name);
    }

    name() {
        return this.$zera$name;
    }

    mappings(): IMap {
        return this.$zera$mappings.deref();
    }

    mapping(sym: Symbol): any {
        return this.mappings().find(sym);
    }

    refer(sym: Symbol, value: any): Namespace {
        swap(this.$zera$mappings, assoc, sym, value);

        return this;
    }

    intern(sym: Symbol) {
        if (sym.namespace() != null)
            throw new Error("Cannot intern namespace-qualified symbol");

        var v = new Var(null, this, sym);
        this.refer(sym, v);

        return v;
    }

    // NOTE: This duplicates mapping
    findInternedVar(sym: Symbol): any {
        return this.mappings().find(sym);
    }

    toString() {
        return str("#<Namespace name: ", this.$zera$name, ">");
    }

    getAliases(): IMap {
        return this.$zera$aliases.deref();
    }

    addAlias(sym: Symbol, ns: Namespace): Namespace {
        swap(this.$zera$aliases, assoc, sym, ns);

        return this;
    }

    lookupAlias(sym: Symbol): Namespace {
        return this.getAliases().find(sym);
    }

    removeAlias(alias: Symbol): Namespace {
        swap(this.$zera$aliases, dissoc, alias);

        return this;
    }

    toJSModule() {
        let mod: JSModule = {};
        return reduce((mod: JSModule, entry: MapEntry) => {
            mod[zeraNameToJS(key(entry))] = val(entry)
            return mod
        }, this.mappings(), mod);
    }
}

export function theNS(ns: any): Namespace {
    if (isNamespace(ns)) return ns;
    else return Namespace.findOrDie(ns);
}

export function nsName(ns: any): Symbol {
    var ns_ = theNS(ns);
    return ns_.name();
}

export function isNamespace(x: any): boolean {
    return x instanceof Namespace;
}

export function createNS(sym: Symbol): Namespace {
    return Namespace.findOrCreate(sym);
}

export function findNS(sym: Symbol): Namespace {
    return Namespace.namespaces[sym.toString()];
}

export function nsMap(sym: Symbol): IMap {
    var ns = theNS(sym);
    return ns.mappings();
}

export const ZERA_NS = Namespace.findOrCreate(Symbol.intern("zera.core"));
export const CURRENT_NS = Var.intern(ZERA_NS, Symbol.intern("*ns*"), ZERA_NS).setDynamic();

export function initNamespace(sym: Symbol) {
    var ns = Namespace.findOrCreate(sym);
    CURRENT_NS.set(ns);
    return ns;
}

export function alias(sym: Symbol, ns: Namespace): Namespace {
    return CURRENT_NS.get().addAlias(sym, ns);
}

export function nsAliases(ns: Namespace): IMap {
    return theNS(ns).getAliases();
}

export function nsUnalias(ns: Namespace, sym: Symbol): Namespace {
    return theNS(ns).removeAlias(sym);
}
