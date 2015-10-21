define(["require", "exports", "./interface", "./queryParser", "./memory", "./queryInverter", "debug", "./collections"], function (require, exports, Interface, parse, MemoryProvider, QueryInverter, Debug, Collections) {
    var _isEqual = Collections._isEqual;
    var _some = Collections._some;
    var debug = Debug ? Debug("jinaga") : function () { };
    var Watch = (function () {
        function Watch(start, joins, resultAdded, resultRemoved, inverses) {
            this.start = start;
            this.joins = joins;
            this.resultAdded = resultAdded;
            this.resultRemoved = resultRemoved;
            this.inverses = inverses;
        }
        return Watch;
    })();
    var JinagaCoordinator = (function () {
        function JinagaCoordinator() {
            this.watches = [];
            this.messages = null;
            this.network = null;
        }
        JinagaCoordinator.prototype.save = function (storage) {
            this.messages = storage;
            this.messages.init(this);
            if (this.network)
                this.messages.sendAllFacts();
        };
        JinagaCoordinator.prototype.sync = function (network) {
            this.network = network;
            this.network.init(this);
            this.messages.sendAllFacts();
        };
        JinagaCoordinator.prototype.fact = function (message) {
            this.messages.save(message, null);
        };
        JinagaCoordinator.prototype.watch = function (start, templates, resultAdded, resultRemoved) {
            var query = parse(templates);
            var inverses = QueryInverter.invertQuery(query);
            if (inverses.length > 0) {
                this.watches.push(new Watch(start, query, resultAdded, resultRemoved, inverses));
            }
            this.messages.executeQuery(start, query, function (error, results) {
                results.map(resultAdded);
            }, this);
            if (this.network) {
                this.network.watch(start, query);
            }
        };
        JinagaCoordinator.prototype.onSaved = function (fact, source) {
            if (source === null) {
                this.messages.push(fact);
            }
            this.watches.map(function (watch) {
                watch.inverses.map(function (inverse) {
                    this.messages.executeQuery(fact, inverse.affected, function (error2, affected) {
                        if (!error2) {
                            if (_some(affected, function (obj) { return _isEqual(obj, watch.start); })) {
                                if (inverse.added && watch.resultAdded) {
                                    this.messages.executeQuery(fact, inverse.added, function (error3, added) {
                                        if (!error3) {
                                            added.map(watch.resultAdded);
                                        }
                                    });
                                }
                                if (inverse.removed && watch.resultRemoved) {
                                    this.messages.executeQuery(fact, inverse.removed, function (error2, added) {
                                        if (!error2) {
                                            added.map(watch.resultRemoved);
                                        }
                                    });
                                }
                            }
                        }
                    }, this);
                }, this);
            }, this);
        };
        JinagaCoordinator.prototype.onReceived = function (fact, source) {
            this.messages.save(fact, source);
        };
        JinagaCoordinator.prototype.onError = function (err) {
            debug(err);
        };
        JinagaCoordinator.prototype.send = function (fact, source) {
            if (this.network)
                this.network.fact(fact);
        };
        return JinagaCoordinator;
    })();
    var Jinaga = (function () {
        function Jinaga() {
            this.coordinator = new JinagaCoordinator();
            this.coordinator.save(new MemoryProvider());
        }
        Jinaga.prototype.save = function (storage) {
            this.coordinator.save(storage);
        };
        Jinaga.prototype.sync = function (network) {
            this.coordinator.sync(network);
        };
        Jinaga.prototype.fact = function (message) {
            this.coordinator.fact(message);
        };
        Jinaga.prototype.watch = function (start, templates, resultAdded, resultRemoved) {
            this.coordinator.watch(start, templates, resultAdded, resultRemoved);
        };
        Jinaga.prototype.where = function (specification, conditions) {
            return new Interface.ConditionalSpecification(specification, conditions, true);
        };
        Jinaga.prototype.not = function (conditionOrSpecification) {
            if (typeof (conditionOrSpecification) === "function") {
                var condition = conditionOrSpecification;
                return function (t) { return new Interface.InverseSpecification(condition(t)); };
            }
            else {
                var specification = conditionOrSpecification;
                return new Interface.InverseSpecification(specification);
            }
        };
        return Jinaga;
    })();
    return Jinaga;
});
