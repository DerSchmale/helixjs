import {BoundingAABB} from "../scene/BoundingAABB";
import {Signal} from "../core/Signal";
import {Mesh} from "./Mesh";

/**
 * @classdesc
 * The Model class bundles several {@linkcode Mesh} objects into a single renderable object. This allows a single object
 * (for example: a character) to use different Materials for different parts (fe: a skin material and a clothes material)
 *
 * @constructor
 * @param [meshes] The {@linkcode Mesh} objects with which to initialize the Model.
 *
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Model(meshes)
{
    this._name = null;
    this._localBounds = new BoundingAABB();
    this._localBoundsInvalid = true;
    this._skeleton = null;
    this.onMeshesChange = new Signal();
    this.onSkeletonChange = new Signal();
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
}

Model.prototype =
    {
        /**
         * The name of the Model.
         */
        get name()
        {
            return this._name;
        },

        set name(value)
        {
            this._name = value;
        },

        /**
         * The amount of {@linkcode Mesh} objects in this Model.
         */
        get numMeshes()
        {
            return this._meshes.length;
        },

        /**
         * Retrieves the {@linkcode Mesh} at the given index.
         */
        getMesh: function (index)
        {
            return this._meshes[index];
        },

        /**
         * The object-space bounding box.
         */
        get localBounds()
        {
            if (this._localBoundsInvalid) this._updateLocalBounds();
            return this._localBounds;
        },

        /**
         * The {@linkcode Skeleton} used for skinning animations.
         */
        get skeleton()
        {
            return this._skeleton;
        },

        set skeleton(value)
        {
            this._skeleton = value;
            this.onSkeletonChange.dispatch();
        },

        /**
         * Removes a Mesh from the Model.
         */
        removeMesh: function (mesh)
        {
            var index = this._meshes.indexOf(mesh);
            if (index < 0) return;

            mesh._model = null;

            this._localBoundsInvalid = true;
            this.onMeshesChange.dispatch();
        },

        /**
         * Adds a Mesh to the Model
         */
        addMesh: function (mesh)
        {
            if (mesh._model) throw new Error("Mesh cannot be shared across Models");

            mesh._model = this;
            this._meshes.push(mesh);
            this._localBoundsInvalid = true;
            this.onMeshesChange.dispatch();
        },

        /**
         * @ignore
         */
        toString: function()
        {
            return "[Model(name=" + this._name + ")]";
        },

        /**
         * @ignore
         * @private
         */
        _updateLocalBounds: function()
        {
            this._localBounds.clear();

            for (var i = 0; i < this._meshes.length; ++i)
                this._localBounds.growToIncludeMesh(this._meshes[i]);

            this._localBoundsInvalid = false;
        }
    };

export { Model };