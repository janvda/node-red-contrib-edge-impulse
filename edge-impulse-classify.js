const fs = require("fs"); 

module.exports = function(RED) {
    "use strict";
    const fs = require("fs-extra"); 

    function EdgeImpulseClassifyNode(config) {
        RED.nodes.createNode(this,config);
        this.path       = config.path;
        this.edge_impulse_module = this.path + "/edge-impulse-standalone";

        /** A copy of 'this' object in case we need it in context of callbacks of other functions.*/
        const node = this;

        try {
            if (!(fs.existsSync(this.edge_impulse_module + ".js"))) throw new Error('no edge impulse at location:' + this.edge_impulse_module + '.js'); 

            this.status({fill:"yellow",shape:"dot",text:"loading edge-impulse:" + this.edge_impulse_module });

            // based on https://docs.edgeimpulse.com/docs/through-webassembly

            // Load the inferencing WebAssembly module
            let Module = require( this.edge_impulse_module);

            // Classifier module
            let classifierInitialized = false;
            Module.onRuntimeInitialized = () => {
                classifierInitialized = true;
                node.status({fill:"green",shape:"dot",text:"successfully loaded edge-impulse:" + node.edge_impulse_module });
            };

            function _arrayToHeap(data) {
                let typedArray = new Float32Array(data);
                let numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
                let ptr = Module._malloc(numBytes);
                let heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
                heapBytes.set(new Uint8Array(typedArray.buffer));
                return { ptr: ptr, buffer: heapBytes };
            }

            function _classify(rawData, debug = false) {
                    if (!classifierInitialized) throw new Error('Module is not initialized');

                    const obj = _arrayToHeap(rawData);
                    let ret = Module.run_classifier(obj.buffer.byteOffset, rawData.length, debug);
                    Module._free(obj.ptr);

                    if (ret.result !== 0) {
                        throw new Error('Classification failed (err code: ' + ret.result + ')');
                    }

                    let jsResult = {
                        anomaly: ret.anomaly,
                        results: []
                    };

                    for (let cx = 0; cx < ret.classification.size(); cx++) {
                        let c = ret.classification.get(cx);
                        jsResult.results.push({ label: c.label, value: c.value });
                    }

                    return jsResult;
            }

            this.on('input', function(msg) {
                msg.payload = _classify(msg.payload);
                this.send(msg);
            });

            this.on('close', function() {
                // unloading edge impulse module
                var name = require.resolve(this.edge_impulse_module);
                delete require.cache[name];
            });
        }
        catch(err){
            this.status({fill:"red",shape:"ring",text:err.message}); 
        }
    }
    RED.nodes.registerType("edge-impulse-classify",EdgeImpulseClassifyNode);
}