import {Float4} from "./Float4";
import {Quaternion} from "./Quaternion";
import {Matrix4x4} from "./Matrix4x4";
import {PropertyListener} from "../core/PropertyListener";

/**
 * An object using position, rotation quaternion and scale to describe an object's transformation.
 *
 * @constructor
 */
function Transform()
{
    this._position = new Float4(0.0, 0.0, 0.0, 1.0);
    this._rotation = new Quaternion();
    this._scale = new Float4(1.0, 1.0, 1.0, 1.0);
    this._matrix = new Matrix4x4();

    this._changeListener = new PropertyListener();
    this._changeListener.add(this._position, "x");
    this._changeListener.add(this._position, "y");
    this._changeListener.add(this._position, "z");
    this._changeListener.add(this._rotation, "x");
    this._changeListener.add(this._rotation, "y");
    this._changeListener.add(this._rotation, "z");
    this._changeListener.add(this._rotation, "w");
    this._changeListener.add(this._scale, "x");
    this._changeListener.add(this._scale, "y");
    this._changeListener.add(this._scale, "z");
    this._changeListener.onChange.bind(this._invalidateMatrix, this);
}

Transform.prototype =
{
    get position() {
        return this._position;
    },

    set position(value) {
        // make sure position object never changes
        this._position.copyFrom(value);
    },

    get rotation() {
        return this._rotation;
    },

    set rotation(value) {
        // make sure position object never changes
        this._rotation.copyFrom(value);
    },

    get scale() {
        return this._scale;
    },

    set scale(value) {
        // make sure position object never changes
        this._scale.copyFrom(value);
    },

    lookAt: function(target)
    {
        this._matrix.lookAt(target, this._position, Float4.Y_AXIS);
        this._applyMatrix();
    },

    copyFrom: function(transform)
    {
        this._changeListener.enabled = false;
        this.position.copyFrom(transform.position);
        this.rotation.copyFrom(transform.rotation);
        this.scale.copyFrom(transform.scale);
        this._changeListener.enabled = true;
    },

    get matrix()
    {
        if (this._matrixInvalid)
            this._updateMatrix();

        return this._matrix;
    },

    set matrix(value)
    {
        this._matrix.copyFrom(value);
        this._applyMatrix();
    },

    _invalidateMatrix: function ()
    {
        this._matrixInvalid = true;
    },

    _updateMatrix: function()
    {
        this._matrix.compose(this);
        this._matrixInvalid = false;
    },

    _applyMatrix: function()
    {
        this._matrixInvalid = false;
        // matrix decompose will trigger property updates, so disable this
        this._changeListener.enabled = false;
        this._matrix.decompose(this);
        this._changeListener.enabled = true;
    }
};

export { Transform };