var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "./collections"], function (require, exports, Collections) {
    var _pairs = Collections._pairs;
    (function (Direction) {
        Direction[Direction["Predecessor"] = 0] = "Predecessor";
        Direction[Direction["Successor"] = 1] = "Successor";
    })(exports.Direction || (exports.Direction = {}));
    var Direction = exports.Direction;
    (function (Quantifier) {
        Quantifier[Quantifier["Exists"] = 0] = "Exists";
        Quantifier[Quantifier["NotExists"] = 1] = "NotExists";
    })(exports.Quantifier || (exports.Quantifier = {}));
    var Quantifier = exports.Quantifier;
    var Step = (function () {
        function Step() {
        }
        Step.prototype.construtor = function () { };
        Step.prototype.toDeclarativeString = function () {
            throw Error("Abstract");
        };
        return Step;
    })();
    exports.Step = Step;
    var ExistentialCondition = (function (_super) {
        __extends(ExistentialCondition, _super);
        function ExistentialCondition(quantifier, steps) {
            _super.call(this);
            this.quantifier = quantifier;
            this.steps = steps;
        }
        ExistentialCondition.prototype.toDeclarativeString = function () {
            return (this.quantifier === Quantifier.Exists ? "E(" : "N(") +
                this.steps.map(function (s) { return s.toDeclarativeString(); }).join(" ") + ")";
        };
        return ExistentialCondition;
    })(Step);
    exports.ExistentialCondition = ExistentialCondition;
    var PropertyCondition = (function (_super) {
        __extends(PropertyCondition, _super);
        function PropertyCondition(name, value) {
            _super.call(this);
            this.name = name;
            this.value = value;
        }
        PropertyCondition.prototype.toDeclarativeString = function () {
            return "F." + this.name + "=\"" + this.value + "\"";
        };
        return PropertyCondition;
    })(Step);
    exports.PropertyCondition = PropertyCondition;
    var Join = (function (_super) {
        __extends(Join, _super);
        function Join(direction, role) {
            _super.call(this);
            this.direction = direction;
            this.role = role;
        }
        Join.prototype.toDeclarativeString = function () {
            return (this.direction === Direction.Predecessor ? "P." : "S.") + this.role;
        };
        return Join;
    })(Step);
    exports.Join = Join;
    var Query = (function () {
        function Query(steps) {
            this.steps = steps;
        }
        Query.prototype.toDescriptiveString = function () {
            return this.steps.map(function (s) { return s.toDeclarativeString(); }).join(" ");
        };
        return Query;
    })();
    exports.Query = Query;
    var ConditionalSpecification = (function () {
        function ConditionalSpecification(specification, conditions, isAny) {
            this.specification = specification;
            this.conditions = conditions;
            this.isAny = isAny;
        }
        return ConditionalSpecification;
    })();
    exports.ConditionalSpecification = ConditionalSpecification;
    var InverseSpecification = (function () {
        function InverseSpecification(specification) {
            this.specification = specification;
        }
        return InverseSpecification;
    })();
    exports.InverseSpecification = InverseSpecification;
    function done(descriptive, index) {
        return index === descriptive.length || lookahead(descriptive, index) === ")";
    }
    function lookahead(descriptive, index) {
        if (descriptive.length <= index) {
            throw Error("Malformed descriptive string " + descriptive + " at " + index +
                ". Reached the end of the string prematurely.");
        }
        return descriptive.charAt(index);
    }
    function consume(descriptive, index, expected) {
        if (lookahead(descriptive, index) !== expected) {
            throw Error("Malformed descriptive string " + descriptive + " at " + index +
                ". Expecting " + expected + " but found " + lookahead(descriptive, index) + ".");
        }
        return index + 1;
    }
    function identifier(descriptive, index) {
        var id = "";
        while (!done(descriptive, index) &&
            lookahead(descriptive, index) !== " " &&
            lookahead(descriptive, index) !== "=") {
            var next = lookahead(descriptive, index);
            index = consume(descriptive, index, next);
            id = id + next;
        }
        return { id: id, index: index };
    }
    function quotedValue(descriptive, index) {
        var value = "";
        index = consume(descriptive, index, "\"");
        while (lookahead(descriptive, index) !== "\"") {
            var next = lookahead(descriptive, index);
            index = consume(descriptive, index, next);
            value = value + next;
        }
        index = consume(descriptive, index, "\"");
        return { value: value, index: index };
    }
    function fromDescriptiveString(descriptive) {
        var _a = parseDescriptiveString(descriptive, 0), steps = _a.steps, index = _a.index;
        return new Query(steps);
    }
    exports.fromDescriptiveString = fromDescriptiveString;
    function parseDescriptiveString(descriptive, index) {
        if (done(descriptive, index)) {
            return { steps: [], index: index };
        }
        var steps = [];
        while (true) {
            var next = lookahead(descriptive, index);
            if (next === "P" || next === "S") {
                index = consume(descriptive, index, next);
                index = consume(descriptive, index, ".");
                var _a = identifier(descriptive, index), id = _a.id, index = _a.index;
                var join = new Join(next === "P" ? Direction.Predecessor : Direction.Successor, id);
                steps.push(join);
            }
            else if (next === "F") {
                index = consume(descriptive, index, "F");
                index = consume(descriptive, index, ".");
                var _b = identifier(descriptive, index), id = _b.id, index = _b.index;
                index = consume(descriptive, index, "=");
                var _c = quotedValue(descriptive, index), value = _c.value, index = _c.index;
                var property = new PropertyCondition(id, value);
                steps.push(property);
            }
            else if (next === "N" || next === "E") {
                index = consume(descriptive, index, next);
                index = consume(descriptive, index, "(");
                var childQuery = parseDescriptiveString(descriptive, index);
                index = childQuery.index;
                index = consume(descriptive, index, ")");
                var step = new ExistentialCondition(next === "N" ? Quantifier.NotExists : Quantifier.Exists, childQuery.steps);
                steps.push(step);
            }
            else {
                throw Error("Malformed descriptive string " + descriptive + " at " + index);
            }
            if (done(descriptive, index)) {
                return { steps: steps, index: index };
            }
            index = consume(descriptive, index, " ");
        }
    }
    function isPredecessor(value) {
        if (typeof (value) !== "object")
            return false;
        if (value instanceof Date)
            return false;
        return true;
    }
    exports.isPredecessor = isPredecessor;
    function computeHash(fact) {
        if (!fact)
            return 0;
        var hash = _pairs(fact).map(computeMemberHash, this)
            .reduce(function (agg, current) {
            return agg + current;
        }, 0);
        return hash;
    }
    exports.computeHash = computeHash;
    function computeMemberHash(pair) {
        var name = pair[0];
        var value = pair[1];
        var valueHash = 0;
        switch (typeof (value)) {
            case "string":
                valueHash = computeStringHash(value);
                break;
            case "number":
                valueHash = value;
                break;
            case "object":
                if (value instanceof Date) {
                    valueHash = value.getTime();
                }
                else {
                    valueHash = computeHash(value);
                }
                break;
            case "boolean":
                valueHash = value ? 1 : 0;
                break;
            default:
                throw new TypeError("Property " + name + " is a " + typeof (value));
        }
        var nameHash = computeStringHash(name);
        return (nameHash << 5) - nameHash + valueHash;
    }
    function computeStringHash(str) {
        if (!str)
            return 0;
        var hash = 0;
        for (var index = 0; index < str.length; index++) {
            hash = (hash << 5) - hash + str.charCodeAt(index);
        }
        return hash;
    }
});
