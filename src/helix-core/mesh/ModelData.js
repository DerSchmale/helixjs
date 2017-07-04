/**
 *
 * @constructor
 */
function ModelData()
{
    this._meshDataList = [];
    this._joints = [];
    this.skeleton = null;
}

ModelData.prototype = {
    get numMeshes()
    {
        return this._meshDataList.length;
    },

    getMeshData: function (index)
    {
        return this._meshDataList[index];
    },

    addMeshData: function (meshData)
    {
        this._meshDataList.push(meshData);
    },

    addJoint: function(joint)
    {
        this._joints.push(joint);
    },

    get hasSkeleton()
    {
        return this._joints.length > 0;
    }
};


export { ModelData };