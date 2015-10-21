define(["require", "exports", "./interface"], function (require, exports, Interface) {
    var Query = Interface.Query;
    var Direction = Interface.Direction;
    var Join = Interface.Join;
    var PropertyCondition = Interface.PropertyCondition;
    var ExistentialCondition = Interface.ExistentialCondition;
    var Quantifier = Interface.Quantifier;
    var Inverse = (function () {
        function Inverse(affected, added, removed) {
            this.affected = affected;
            this.added = added;
            this.removed = removed;
        }
        return Inverse;
    })();
    exports.Inverse = Inverse;
    function optimize(steps) {
        if (steps.length > 0) {
            // Since a new fact does not yet have successors, an existential condition is always
            // true (if not exists) or false (if exists).
            if (steps[0] instanceof ExistentialCondition) {
                var condition = steps[0];
                if (condition.quantifier === Quantifier.Exists) {
                    return null;
                }
                else {
                    return steps.slice(1);
                }
            }
            else if (steps[0] instanceof Join) {
                var join = steps[0];
                if (join.direction === Direction.Successor) {
                    return null;
                }
                else {
                    return steps;
                }
            }
            else {
                return steps;
            }
        }
        else {
            return steps;
        }
    }
    function invertSteps(steps) {
        var inverses = [];
        var oppositeSteps = [];
        for (var stepIndex = 0; stepIndex < steps.length; ++stepIndex) {
            var step = steps[stepIndex];
            if (step instanceof PropertyCondition) {
                oppositeSteps.unshift(step);
            }
            else if (step instanceof Join) {
                var join = step;
                oppositeSteps.unshift(new Join(join.direction === Direction.Predecessor ? Direction.Successor : Direction.Predecessor, join.role));
                for (var conditionIndex = stepIndex + 1; conditionIndex < steps.length; ++conditionIndex) {
                    var condition = steps[conditionIndex];
                    if (condition instanceof PropertyCondition) {
                        oppositeSteps.unshift(condition);
                        stepIndex = conditionIndex;
                    }
                    else {
                        break;
                    }
                }
                if (join.direction === Direction.Successor) {
                    var rest = optimize(steps.slice(stepIndex + 1));
                    if (rest != null) {
                        inverses.push(new Inverse(new Query(oppositeSteps.slice(0)), new Query(rest), null));
                    }
                }
            }
            else if (step instanceof ExistentialCondition) {
                var existential = step;
                var subInverses = invertSteps(existential.steps);
                subInverses.forEach(function (subInverse) {
                    var added = existential.quantifier === Quantifier.Exists ?
                        subInverse.added != null : subInverse.removed != null;
                    var remainder = new Query(subInverse.affected.steps.concat(steps.slice(stepIndex + 1)));
                    inverses.push(new Inverse(new Query(subInverse.affected.steps.concat(oppositeSteps)), added ? remainder : null, added ? null : remainder));
                });
            }
        }
        return inverses;
    }
    function invertQuery(query) {
        return invertSteps(query.steps);
    }
    exports.invertQuery = invertQuery;
});
