define(["require", "exports", "./interface"], function (require, exports, Interface) {
    var Join = Interface.Join;
    var PropertyCondition = Interface.PropertyCondition;
    var Query = Interface.Query;
    var Direction = Interface.Direction;
    var ConditionalSpecification = Interface.ConditionalSpecification;
    var ExistentialCondition = Interface.ExistentialCondition;
    var Quantifier = Interface.Quantifier;
    var InverseSpecification = Interface.InverseSpecification;
    var ParserProxy = (function () {
        function ParserProxy(__parent, __role) {
            this.__parent = __parent;
            this.__role = __role;
        }
        ParserProxy.prototype.has = function (name) {
            var proxy = new ParserProxy(this, name);
            this[name] = proxy;
            return proxy;
        };
        ParserProxy.prototype.createQuery = function () {
            var currentSteps = [];
            for (var name in this) {
                if (name[0] != "_" && typeof this[name] !== "function" && !(this[name] instanceof ParserProxy)) {
                    var value = this[name];
                    currentSteps.push(new PropertyCondition(name, value));
                }
            }
            if (this.__parent) {
                var steps = this.__parent.createQuery();
                var step = new Join(Direction.Predecessor, this.__role);
                steps.push(step);
                return steps.concat(currentSteps);
            }
            else {
                return currentSteps;
            }
        };
        return ParserProxy;
    })();
    function findTarget(spec) {
        if (spec instanceof ParserProxy) {
            return spec.createQuery();
        }
        if (spec instanceof ConditionalSpecification) {
            var conditional = spec;
            var head = findTarget(spec.specification);
            var tail = parse(spec.conditions);
            if (tail.steps.length === 1 && tail.steps[0] instanceof ExistentialCondition) {
                return head.concat(tail.steps);
            }
            else {
                return head.concat(new ExistentialCondition(Quantifier.Exists, tail.steps));
            }
        }
        if (spec instanceof InverseSpecification) {
            var inverse = spec;
            var steps = findTarget(spec.specification);
            if (steps.length === 1 && steps[0] instanceof ExistentialCondition) {
                var inner = steps[0];
                return [new ExistentialCondition(inner.quantifier === Quantifier.Exists ? Quantifier.NotExists : Quantifier.Exists, inner.steps)];
            }
            else {
                return [new ExistentialCondition(Quantifier.NotExists, steps)];
            }
        }
        if (spec instanceof Object) {
            var steps = [];
            var targetQuery = null;
            for (var field in spec) {
                if (!targetQuery) {
                    var targetQuery = findTarget(spec[field]);
                    if (targetQuery) {
                        var join = new Join(Direction.Successor, field);
                        targetQuery.push(join);
                    }
                }
                if (typeof spec[field] === "string" ||
                    typeof spec[field] === "number" ||
                    typeof spec[field] === "boolean") {
                    var step = new PropertyCondition(field, spec[field]);
                    steps.push(step);
                }
            }
            if (targetQuery) {
                targetQuery = targetQuery.concat(steps);
            }
            return targetQuery;
        }
        return null;
    }
    function parse(templates) {
        for (var templateIndex in templates) {
            var template = templates[templateIndex];
            var target = new ParserProxy(null, null);
            var spec = template(target);
            var targetJoins = findTarget(spec);
            return new Query(targetJoins); // TODO: Append each query
        }
        return null;
    }
    return parse;
});
