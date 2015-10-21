/// <reference path="jinaga.ts" />
define(["require", "exports", "./interface", "./collections"], function (require, exports, Interface, Collections) {
    var Direction = Interface.Direction;
    var Join = Interface.Join;
    var PropertyCondition = Interface.PropertyCondition;
    var computeHash = Interface.computeHash;
    var isPredecessor = Interface.isPredecessor;
    var _isEqual = Collections._isEqual;
    var Node = (function () {
        function Node(fact, predecessors) {
            this.fact = fact;
            this.predecessors = predecessors;
            this.successors = {};
        }
        Node.prototype.addSuccessor = function (role, node) {
            var array = this.successors[role];
            if (!array) {
                array = [];
                this.successors[role] = array;
            }
            array.push(node);
        };
        Node.prototype.successorsIn = function (role) {
            return this.successors[role] || [];
        };
        Node.prototype.predecessorsInRole = function (role) {
            return this.predecessors[role] || [];
        };
        return Node;
    })();
    var MemoryProvider = (function () {
        function MemoryProvider() {
            this.nodes = {};
            this.queue = [];
        }
        MemoryProvider.prototype.init = function (coordinator) {
            this.coordinator = coordinator;
        };
        MemoryProvider.prototype.save = function (fact, source) {
            this.insertNode(fact, source);
        };
        MemoryProvider.prototype.executeQuery = function (start, query, result, thisArg) {
            var startingNode = this.findNode(start);
            if (!startingNode) {
                result.bind(thisArg)(null, []);
                return;
            }
            var nodes = this.queryNodes(startingNode, query.steps);
            var facts = [];
            nodes.forEach(function (node) {
                facts.push(node.fact);
            });
            result.bind(thisArg)(null, facts);
        };
        MemoryProvider.prototype.queryNodes = function (startingNode, steps) {
            var _this = this;
            var nodes = [startingNode];
            for (var index = 0; index < steps.length; index++) {
                var step = steps[index];
                if (nodes.length === 0) {
                    break;
                }
                if (step instanceof Join) {
                    var join = step;
                    var nextNodes = [];
                    for (var nodeIndex in nodes) {
                        var node = nodes[nodeIndex];
                        nextNodes = nextNodes.concat(join.direction === Direction.Successor
                            ? node.successorsIn(join.role)
                            : node.predecessorsInRole(join.role));
                    }
                    nodes = nextNodes;
                }
                else if (step instanceof PropertyCondition) {
                    var propertyCondition = step;
                    var nextNodes = [];
                    nodes.forEach(function (node) {
                        if (node.fact[propertyCondition.name] == propertyCondition.value) {
                            nextNodes.push(node);
                        }
                    });
                    nodes = nextNodes;
                }
                else if (step instanceof Interface.ExistentialCondition) {
                    var existentialCondition = step;
                    var nextNodes = [];
                    nodes.forEach(function (node) {
                        var subNodes = _this.queryNodes(node, existentialCondition.steps);
                        if (existentialCondition.quantifier === Interface.Quantifier.Exists
                            ? subNodes.length > 0 : subNodes.length === 0) {
                            nextNodes.push(node);
                        }
                    });
                    nodes = nextNodes;
                }
            }
            return nodes;
        };
        MemoryProvider.prototype.sendAllFacts = function () {
            var _this = this;
            this.queue.forEach(function (item) {
                _this.coordinator.send(item.fact, null);
            });
        };
        MemoryProvider.prototype.push = function (fact) {
            this.queue.push({ hash: computeHash(fact), fact: fact });
            if (this.coordinator)
                this.coordinator.send(fact, null);
        };
        MemoryProvider.prototype.findNodeWithFact = function (array, fact) {
            for (var index = 0; index < array.length; index++) {
                if (_isEqual(array[index].fact, fact)) {
                    return array[index];
                }
            }
            return null;
        };
        MemoryProvider.prototype.insertNode = function (fact, source) {
            var hash = computeHash(fact);
            var array = this.nodes[hash];
            if (!array) {
                array = [];
                this.nodes[hash] = array;
            }
            var node = this.findNodeWithFact(array, fact);
            if (!node) {
                var predecessors = {};
                for (var field in fact) {
                    var value = fact[field];
                    if (isPredecessor(value)) {
                        var predecessor = this.insertNode(value, source);
                        predecessors[field] = [predecessor];
                    }
                }
                node = new Node(fact, predecessors);
                for (var role in predecessors) {
                    var predecessorArray = predecessors[role];
                    predecessorArray[0].addSuccessor(role, node);
                }
                array.push(node);
                this.coordinator.onSaved(fact, source);
            }
            return node;
        };
        MemoryProvider.prototype.findNode = function (fact) {
            var hash = computeHash(fact);
            var array = this.nodes[hash];
            if (!array) {
                return null;
            }
            return this.findNodeWithFact(array, fact);
        };
        return MemoryProvider;
    })();
    return MemoryProvider;
});
