import {Importer} from "./Importer";
import {URLLoader} from "./URLLoader";
import {DataStream} from "../core/DataStream";
import {Skeleton} from "../animation/skeleton/Skeleton";
import {SkeletonJoint} from "../animation/skeleton/SkeletonJoint";
import {Mesh} from "../mesh/Mesh";

/**
 * @classdesc
 * HMESH is an Importer for Helix' (binary) model format. Yields a {@linkcode Model} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HMESH()
{
    Importer.call(this, Mesh, URLLoader.DATA_BINARY);
}

HMESH.prototype = Object.create(Importer.prototype);

HMESH.VERSION = "0.1.0";

HMESH.prototype.parse = function(data, target)
{
    var stream = new DataStream(data);

    var hash = stream.getString(7);
    if (hash !== "HX_MESH")
        throw new Error("Invalid file hash!");

    var version = stream.getUint16Array(3).join(".");
    // pointless to check this now, only know when to support which versions in the future
    // if (version !== HMESH.VERSION)
    //     throw new Error("Unsupported file version!");

    this._parseMesh(stream, target);
    target.skeleton = this._parseSkeleton(stream);

    this._notifyComplete(target);
};

HMESH.prototype._parseMesh = function(stream, mesh)
{
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

HMESH.prototype._parseSkeleton = function(stream)
{
    var numJoints = stream.getUint8();
    if (numJoints === 0) return null;

    var skeleton = new Skeleton();
    for (var i = 0; i < numJoints; ++i) {
        var joint = new SkeletonJoint();
        var nameLen = stream.getUint8();
        if (nameLen !== 0)
            joint.name = stream.getString(nameLen);
        var parentIndex = stream.getUint8();
        joint.parentIndex = parentIndex === 0xff? -1 : parentIndex;

        for (var j = 0; j < 16; ++j)
            joint.inverseBindPose._m[j] = stream.getFloat32();

        skeleton.addJoint(joint);
    }

    return skeleton;
};

export { HMESH };