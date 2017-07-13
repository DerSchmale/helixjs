/**
 * A Model combines a list of Meshes
 * @param modelData
 * @constructor
 */
import {BoundingAABB} from "../scene/BoundingAABB";
import {Signal} from "../core/Signal";
import {Mesh} from "./Mesh";

function Model(meshes)
{
    this.onLocalBoundsChanged = new Signal();
    this._name = null;
    this._localBounds = new BoundingAABB();
    this._localBoundsInvalid = true;
    this._skeleton = null;
    this.onChange = new Signal();
    this._meshes = [];

    if (meshes) {
        if (meshes instanceof Array) {
            for (var i = 0; i < meshes.length; ++i)
                this.addMesh(meshes[i]);
        }
        else if (meshes instanceof Mesh) {
            this.addMesh(meshes);
        }
    }
};

Model.prototype =
    {
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

        get localBounds()
        {
            if (this._localBoundsInvalid) this._updateLocalBounds();
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

        removeMesh: function (mesh)
        {
            var index = this._meshes.indexOf(mesh);
            if (index < 0) return;

            mesh._model = null;

            this._localBoundsInvalid = true;
            this.onChange.dispatch();
        },

        addMesh: function (mesh)
        {
            if (mesh._model) throw new Error("Mesh cannot be shared across Models");

            mesh._model = this;
            this._meshes.push(mesh);
            this._localBoundsInvalid = true;
            this.onChange.dispatch();
        },

        toString: function()
        {
            return "[Model(name=" + this._name + ")]";
        },

        _updateLocalBounds: function()
        {
            this._localBounds.clear();

            for (var i = 0; i < this._meshes.length; ++i)
                this._localBounds.growToIncludeMesh(this._meshes[i]);

            this._localBoundsInvalid = false;
        }
    };

export { Model };