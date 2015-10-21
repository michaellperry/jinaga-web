define(["require", "exports", "engine.io-client"], function (require, exports, engine) {
    var Socket = engine.Socket;
    var JinagaDistributor = (function () {
        function JinagaDistributor(endpoint) {
            this.socket = new Socket(endpoint);
            this.socket.on("message", this.onMessage.bind(this));
        }
        JinagaDistributor.prototype.init = function (coordinator) {
            this.coordinator = coordinator;
        };
        JinagaDistributor.prototype.watch = function (start, query) {
            this.socket.send(JSON.stringify({
                type: "watch",
                start: start,
                query: query.toDescriptiveString()
            }));
        };
        JinagaDistributor.prototype.fact = function (fact) {
            this.socket.send(JSON.stringify({
                type: "fact",
                fact: fact
            }));
        };
        JinagaDistributor.prototype.onMessage = function (message) {
            var messageObj = JSON.parse(message);
            if (messageObj.type === "fact") {
                this.coordinator.onReceived(messageObj.fact, this);
            }
        };
        return JinagaDistributor;
    })();
    return JinagaDistributor;
});
