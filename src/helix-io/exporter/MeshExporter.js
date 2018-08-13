import {DataOutputStream} from "../core/DataOutputStream";

/**
 * @classdesc
 * MeshExporter exports to Helix's own .hmesh format.
 *
 * File format:
 *
 * <HEADER>
 * file hash "HX_MESH" as string (7 bytes)
 * version data: 3 unsigned shorts (major, minor, patch)
 *
 * <MESH DATA>
 * unsigned int: numIndices
 * unsigned byte: index size (16 or 32)
 * unsigned short/int[numIndices] (depending on index size): face indices
 * unsigned int: numVertices
 * unsigned byte: numAttributes
 *
 *      <ATTRIBUTE DATA> #numAttributes blocks of vertex attributes
 *          unsigned byte: nameLength
 *          char[nameLength]: name (hx_position etc) of length nameLength
 *          unsigned byte: stream index
 *          unsigned byte: numComponents
 *
 * unsigned byte: numStreams (redundant, but much easier to parse)
 *      <STREAM DATA>    #max(stream index)
 *          unsigned int: length (redundant, but much easier to parse)
 *          float[length]: vertex data
 *
 * <SKELETON DATA>:
 * numJoints: unsigned byte (if 0, there's no skeleton)
 *
 *      <JOINT DATA> #numJoints
 *      unsigned byte: nameLength (can be 0)
 *      char[nameLength]: name
 *      parentIndex: unsigned byte   (0xff is to be interpreted as -1)
 *      float[16]: inverseBindPose
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MeshExporter()
{

}

MeshExporter.VERSION = "0.1.0";

MeshExporter.prototype =
{
    // returns an ArrayBuffer object
    export: function(mesh)
    {
        var size = this._calculateFileSize(mesh);
        var buffer = new ArrayBuffer(size);
        var dataView = new DataView(buffer);
        var dataStream = new DataOutputStream(dataView);

        var version = MeshExporter.VERSION.split(".");
        dataStream.writeString("HX_MESH");
        dataStream.writeUint16Array(version);

        this._writeMeshData(dataStream, mesh);

        this._writeSkeleton(dataStream, mesh.skeleton);

        return buffer;
    },

    _writeMeshData: function(dataStream, mesh)
    {
        dataStream.writeUint32(mesh.numIndices);

        if (mesh._indexType === HX.DataType.UNSIGNED_INT) {
            dataStream.writeUint8(32);
            dataStream.writeUint32Array(mesh.getIndexData());
        }
        else {
            dataStream.writeUint8(16);
            dataStream.writeUint16Array(mesh.getIndexData());
        }

        dataStream.writeUint32(mesh.numVertices);
        dataStream.writeUint8(mesh.numVertexAttributes);

        for (var j = 0; j < mesh.numVertexAttributes; ++j) {
            var attrib = mesh.getVertexAttributeByIndex(j);
            dataStream.writeUint8(attrib.name.length);
            dataStream.writeString(attrib.name);
            dataStream.writeUint8(attrib.streamIndex);
            dataStream.writeUint8(attrib.numComponents);
        }

        dataStream.writeUint8(mesh.numStreams);
        for (j = 0; j < mesh.numStreams; ++j) {
            var data = mesh.getVertexData(j);
            dataStream.writeUint32(data.length);
            dataStream.writeFloat32Array(data);
        }
    },

    _writeSkeleton: function(dataStream, skeleton)
    {
        var numJoints = skeleton? skeleton.numJoints : 0;

        dataStream.writeUint8(numJoints);

        for (var i = 0; i < numJoints; ++i) {
            var joint = skeleton.getJoint(i);
            if (joint.name) {
                dataStream.writeUint8(joint.name.length);
                dataStream.writeString(joint.name);
            }
            else {
                dataStream.writeUint8(0);
            }
            dataStream.writeUint8(joint.parentIndex === -1? 0xff : joint.parentIndex);
            dataStream.writeFloat32Array(joint.inverseBindPose._m);
        }
    },

    _calculateFileSize: function(mesh)
    {
        var size = 7;   // hash "HX_MESH"
        size += 2 * 3;  // version (3 shorts)

        size += 4; // numIndices
        size += 1; // index size
        var indexSize;
        if (mesh._indexType === HX.DataType.UNSIGNED_INT)
            indexSize = 4;
        else
            indexSize = 2;

        size += indexSize * mesh.numIndices;    // indices
        size += 4;  // numVertices (int in case of int index type)
        size += 1;  // numAttributes

        for (var j = 0; j < mesh.numVertexAttributes; ++j) {
            var attrib = mesh.getVertexAttributeByIndex(j);
            size += 1;      // nameLength
            size += attrib.name.length; // name
            size += 1;  // stream index
            size += 1;  // num components
        }

        size += 1;  // num streams

        for (j = 0; j < mesh.numStreams; ++j) {
            size += 4;  // stream length
            size += 4 * mesh.getVertexData(j).length;   // float per data element
        }

        size += 1;  // numJoints
        var numJoints = mesh.skeleton? mesh.skeleton.numJoints : 0;

        for (var i = 0; i < numJoints; ++i) {
            var joint = mesh.skeleton.getJoint(i);
            size += 1;  // name length
            size += joint.name? joint.name.length : 0;  // name
            size += 1; // parentIndex
            size += 16 * 4; // inverseBindPose
        }
        return size;
    }
};

export { MeshExporter };