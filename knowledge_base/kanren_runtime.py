"""Minimal Kanren runtime primitives."""

import uuid

class Var:
    def __init__(self, name=None):
        self.name = name or f"v_{uuid.uuid4().hex[:6]}"

    def __repr__(self):
        return f"~{self.name}"

    def __eq__(self, other):
        return isinstance(other, Var) and self.name == other.name

    def __hash__(self):
        return hash(self.name)

def var(name=None):
    return Var(name)

def is_var(x):
    return isinstance(x, Var)

def walk(v, s):
    while is_var(v) and v in s:
        v = s[v]
    return v

def unify(u, v, s):
    u = walk(u, s)
    v = walk(v, s)
    if u == v:
        return s
    if is_var(u):
        s = dict(s)
        s[u] = v
        return s
    if is_var(v):
        s = dict(s)
        s[v] = u
        return s
    if isinstance(u, (list, tuple)) and isinstance(v, (list, tuple)) and len(u) == len(v):
        for u_elem, v_elem in zip(u, v):
            s = unify(u_elem, v_elem, s)
            if s is None:
                return None
        return s
    return None

class Relation:
    def __init__(self, name=None):
        self.name = name
        self.tuples = set()

    def add_fact(self, *args):
        if len(args) == 1 and isinstance(args[0], (tuple, list)):
            self.tuples.add(tuple(args[0]))
        else:
            self.tuples.add(tuple(args))

    def __call__(self, *args):
        def goal(s):
            for t in self.tuples:
                s_new = unify(args, t, s)
                if s_new is not None:
                    yield s_new
        return goal

def facts(rel, *fact_list):
    for f in fact_list:
        rel.add_fact(f)

def eq(u, v):
    def goal(s):
        s_new = unify(u, v, s)
        if s_new is not None:
            yield s_new
    return goal

def lall(*goals):
    def goal(s):
        def recurse(g_list, current_s):
            if not g_list:
                yield current_s
                return
            first, rest = g_list[0], g_list[1:]
            for s_next in first(current_s):
                yield from recurse(rest, s_next)
        yield from recurse(goals, s)
    return goal

def conde(*clause_groups):
    def goal(s):
        for clause in clause_groups:
            if callable(clause):
                yield from clause(s)
            elif isinstance(clause, (list, tuple)):
                g = lall(*clause)
                yield from g(s)
    return goal

def reify(v, s):
    v = walk(v, s)
    if is_var(v):
        return v
    if isinstance(v, tuple):
        return tuple(reify(elem, s) for elem in v)
    if isinstance(v, list):
        return [reify(elem, s) for elem in v]
    return v

def run(n, v, *goals):
    g = lall(*goals)
    results = []
    seen = set()
    for s in g({}):
        val = reify(v, s)
        val_str = str(val)
        if val_str not in seen:
            seen.add(val_str)
            results.append(val)
            if n > 0 and len(results) >= n:
                break
    return results

