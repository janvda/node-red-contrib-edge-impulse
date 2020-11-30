Node-RED nodes for Edge Impulse
================================

[Edge Impulse](https://www.edgeimpulse.com/) is the leading development platform for machine learning on edge devices, free for developers and trusted by enterprises.

## What is an Impulse ?

The [online Edge Impulse studio](https://studio.edgeimpulse.com/) makes it very easy to design and train `impulses`.

An `impulse` typically takes raw data, uses signal processing to extract features (e.g. extracting a spectogram from audio) and then uses a learning block to classify new data. Currently edge impulse studio supports 3 types of learning blocks:

* **Neural Network (Keras)** - Learns patterns from data, and can apply these to new data. Great for categorizing movement or recognizing audio.
* **Transfer Learning (Images)** - Fine tune a pre-trained image model on your data. Good performance even with relatively small image datasets.
* **K-means anomaly detection** - Find outliers in new data. Good for recognizing unknown states, and to complement neural networks.

These impulses can be deployed to various types of edge devices.  
This makes the model run without an internet connection, minimizes latency, and runs with minimal power consumption.
It is even possible to [deploy it as a WebAssembly library](https://docs.edgeimpulse.com/docs/through-webassembly) which is the basis of the `edge-impulse-classify`.

## "edge-impulse-classify" Node

This node runs an `impulse` on the input payload and outputs the classification and/or anomaly detection.  
E.g. the input can be a fixed length audio fragment, an image,... converted to 1 dimensional array.

Here below an example of the output payload it might produce:

```json
{
 "anomaly":0,
 "results":[{"label":"other","value":0.999983549118042},
            {"label":"ring", "value":0.000016410584066761658}]
}
```

### Prerequisites

In order to use this node, an impulse created by [online Edge Impulse studio](https://studio.edgeimpulse.com/) must be [deployed as a Webassembly library](https://docs.edgeimpulse.com/docs/through-webassembly) to a folder that is readable by your Node-RED application.
So when the studio builds your WebAssembly package it will download it as a zip file containing 2 files: `edge-impulse-standalone.js` and `edge-impulse-standalone.wasm`.

It is important that you copy these 2 files to a folder that is accessible by your Node-RED application.

You can then "bind" this impulse to an `edge-impulse-classify` node by just specifying the folder location in the `Path` configuration property of the `edge-impulse-classify` node.

Note that there is no need to restart Node-RED when a new impulse is deployed or the `Path` configuration property is updated.  The new impulse will automatically be bound when the flow becomes restarted.

### Contributing

Feel free to report any issue to this github repository.

### License

[Eclipse Public License 2.0](LICENSE).
