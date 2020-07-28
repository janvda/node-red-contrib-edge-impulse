module.exports = function(RED) {
    function ClassifyNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            msg.payload = msg.payload.classify();
            node.send(msg);
        });
    }
    RED.nodes.registerType("classify",ClassifyNode);
}