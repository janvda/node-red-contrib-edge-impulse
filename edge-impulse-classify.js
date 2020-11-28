const fs = require("fs"); 

module.exports = function(RED) {
    "use strict";
    const fs = require("fs-extra"); 

    function EdgeImpulseClassifyNode(config) {
        RED.nodes.createNode(this,config);
        this.path       = config.path;
        this.edge_impulse_module = this.path + "/edge-impulse-standalone";

        // set node status based on edge impulse existing on path
        if (fs.existsSync(this.edge_impulse_module + ".js")){
            this.status({fill:"green",shape:"dot",text:"edge impulse found" });
        } else {
            this.status({fill:"red",shape:"ring",text:"no edge impulse at path:" + this.edge_impulse_module + ".js"});
        }

        // based on https://docs.edgeimpulse.com/docs/through-webassembly

        // Load the inferencing WebAssembly module
        let Module = require( this.edge_impulse_module);

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

        this.on('input', function(msg) {
            msg.payload = classifier.classify(msg.payload);
            this.send(msg);
        });

        this.on('close', function() {
            // unloading edge impulse module
            var name = require.resolve(this.edge_impulse_module);
            delete require.cache[name];
        });
    }
    RED.nodes.registerType("edge-impulse-classify",EdgeImpulseClassifyNode);
}