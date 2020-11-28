const fs = require("fs"); 

module.exports = function(RED) {
    "use strict";
    const fs = require("fs-extra"); 

    // based on https://docs.edgeimpulse.com/docs/through-webassembly

    // Load the inferencing WebAssembly module
    const Module = require('/data/ei-doorbell-1-deployment-wasm-1595836551780/edge-impulse-standalone');

    // Classifier module
    let classifierInitialized = false;
    Module.onRuntimeInitialized = function() {
      classifierInitialized = true;
    };

    class EdgeImpulseClassifier {
        _initialized = false;

        init() {
            if (classifierInitialized === true) return Promise.resolve();

            return new Promise((resolve) => {
                Module.onRuntimeInitialized = () => {
                    resolve();
                    classifierInitialized = true;
                };
            });
        }

        classify(rawData, debug = false) {
            if (!classifierInitialized) throw new Error('Module is not initialized');

            const obj = this._arrayToHeap(rawData);
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

        _arrayToHeap(data) {
            let typedArray = new Float32Array(data);
            let numBytes = typedArray.length * typedArray.BYTES_PER_ELEMENT;
            let ptr = Module._malloc(numBytes);
            let heapBytes = new Uint8Array(Module.HEAPU8.buffer, ptr, numBytes);
            heapBytes.set(new Uint8Array(typedArray.buffer));
            return { ptr: ptr, buffer: heapBytes };
        }
    }


   // Initialize the classifier
    let classifier = new EdgeImpulseClassifier();
    classifier.init()

    function EdgeImpulseClassifyNode(config) {
        RED.nodes.createNode(this,config);
        this.path = config.path;
        var node = this;

        // set node status based on edge impulse existing on path
        if (fs.existsSync(this.path + "/edge-impulse-standalone.js")){
            this.status({fill:"green",shape:"dot",text:"edge impulse found" });
        } else {
            this.status({fill:"red",shape:"ring",text:"no edge impulse at path:" + this.path});
        }

        node.on('input', function(msg) {
            msg.payload = classifier.classify(msg.payload);
            node.send(msg);
        });
    }
    RED.nodes.registerType("edge-impulse-classify",EdgeImpulseClassifyNode);
}