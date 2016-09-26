/**
 * A Model combines a list of Meshes
 * @param modelData
 * @constructor
 */
HX.Model = function (modelData)
{
    this._name = null;
    this._localBounds = new HX.BoundingAABB();
    this._skeleton = null;
    this.onChange = new HX.Signal();

    if (modelData) {
        this._meshes = null;
        this._setModelData(modelData);
    }
    else
        this._meshes = [];
};

HX.Model.prototype =
{
    constructor: HX.Model,

    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    get numMeshes()
    {
        return this._meshes.length;
    },

    getMesh: function (index)
    {
        return this._meshes[index];
    },

    dispose: function()
    {
        if (this._meshes)
            for (var i = 0; i < this._meshes.length; ++i)
                this._meshes[i].dispose();
    },

    get localBounds()
    {
        return this._localBounds;
    },


    get skeleton()
    {
        return this._skeleton;
    },

    set skeleton(value)
    {
        this._skeleton = value;
    },

    _setModelData: function (modelData)
    {
        this.dispose();

        this._localBounds.clear();
        this._meshes = [];

        for (var i = 0; i < modelData.numMeshes; ++i) {
            var meshData = modelData.getMeshData(i);
            this._localBounds.growToIncludeMesh(meshData);
            this._meshes.push(new HX.Mesh(meshData, this));
        }

        this.skeleton = modelData.skeleton;

        this.onChange.dispatch();
    },

    toString: function()
    {
        return "[Model(name=" + this._name + ")]";
    }
};