import {Importer} from "./Importer";
import {URLLoader} from "./URLLoader";
import {DataStream} from "../core/DataStream";
import {Mesh} from "../mesh/Mesh";
import {Model} from "../mesh/Model";

/**
 * @classdesc
 * HMODEL is an Importer for Helix' (binary) model format. Yields a {@linkcode Model} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HMODEL()
{
    Importer.call(this, Model, URLLoader.DATA_BINARY);
}

HMODEL.prototype = Object.create(Importer.prototype);

HMODEL.VERSION = "0.1.0";

HMODEL.prototype.parse = function(data, target)
{
    var stream = new DataStream(data);

    var hash = stream.getString(8);
    if (hash !== "HX_MODEL")
        throw new Error("Invalid file hash!");

    var version = stream.getUint16Array(3).join(".");
    if (version !== HMODEL.VERSION)
        throw new Error("Unsupported file version!");

    var numMeshes = stream.getUint16();

    for (var i = 0; i < numMeshes; ++i) {
        var mesh = this._parseMesh(stream);
        target.addMesh(mesh);
    }

    this._notifyComplete(target);
};

HMODEL.prototype._parseMesh = function(stream)
{
    var mesh = new Mesh();
    var numIndices = stream.getUint32();
    var indexSize = stream.getUint8();
    var indices;

    if (indexSize === 16)
        indices = stream.getUint16Array(numIndices);
    else
        indices = stream.getUint32Array(numIndices);

    mesh.setIndexData(indices);

    var numVertices = stream.getUint32();
    var numAttributes = stream.getUint8();

    for (var i = 0; i < numAttributes; ++i) {
        var nameLen = stream.getUint8();
        var name = stream.getString(nameLen);
        var streamIndex = stream.getUint8();
        var numComponents = stream.getUint8();
        mesh.addVertexAttribute(name, numComponents, streamIndex);
    }

    var numStreams = stream.getUint8();
    for (i = 0; i < numStreams; ++i) {
        var len = stream.getUint32();
        var data = stream.getFloat32Array(len);
        mesh.setVertexData(data, i);
    }

    return mesh;
};

export { HMODEL };