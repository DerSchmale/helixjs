import {Float4} from "./Float4";
import {Quaternion} from "./Quaternion";
import {Matrix4x4} from "./Matrix4x4";
import {PropertyListener} from "../core/PropertyListener";

/**
 * @classdesc
 * Transform is a class to describe an object's transformation through position, rotation (as a quaternion) and scale.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Transform()
{
    this._position = new Float4(0.0, 0.0, 0.0, 1.0);
    this._rotation = new Quaternion();
    this._euler = new Float4(0.0, 0.0, 0.0, 0.0);
    this._scale = new Float4(1.0, 1.0, 1.0, 1.0);
    this._matrix = new Matrix4x4();

	this._eulerInvalid = true;
    this._eulerChangeListener = new PropertyListener();
	this._eulerChangeListener.add(this._euler, "x");
	this._eulerChangeListener.add(this._euler, "y");
	this._eulerChangeListener.add(this._euler, "z");
	this._eulerChangeListener.onChange.bind(this._onEulerChanged, this);

    this._changeListener = new PropertyListener();
    this._changeListener.add(this._position, "x");
    this._changeListener.add(this._position, "y");
    this._changeListener.add(this._position, "z");
    this._changeListener.add(this._scale, "x");
    this._changeListener.add(this._scale, "y");
    this._changeListener.add(this._scale, "z");
    this._changeListener.onChange.bind(this._invalidateMatrix, this);

    this._rotationChangeListener = new PropertyListener();
	this._rotationChangeListener.add(this._rotation, "x");
	this._rotationChangeListener.add(this._rotation, "y");
	this._rotationChangeListener.add(this._rotation, "z");
	this._rotationChangeListener.add(this._rotation, "w");
	this._rotationChangeListener.onChange.bind(this._onRotationChanged, this);
}

Transform.prototype =
{
    /**
     * The position of the object.
     */
    get position() {
        return this._position;
    },


    set position(value) {
        // make sure position object never changes
        this._position.copyFrom(value);
    },

    /**
     * The rotation of the object.
     */
    get rotation() {
        return this._rotation;
    },

    set rotation(value) {
        // make sure position object never changes
        this._rotationChangeListener.enabled = false;
        this._rotation.copyFrom(value);
		this._rotationChangeListener.enabled = true;
		this._onRotationChanged();
    },

    /**
     * The rotation of the object.
     */
    get euler() {
        if (this._eulerInvalid) {
            // this is a slave update, should not trigger an invalidation
			this._eulerChangeListener.enabled = false;
            this._rotation.toEuler(this._euler);
			this._eulerChangeListener.enabled = true;
        }
        return this._euler;
    },

    set euler(value) {
        this._eulerChangeListener.enabled = false;
        this._euler.copyFrom(value);
		this._eulerChangeListener.enabled = true;
		this._onEulerChanged();
    },

    /**
     * The scale of the object.
     */
    get scale() {
        return this._scale;
    },

    set scale(value) {
        // make sure position object never changes
        this._scale.copyFrom(value);
    },

    /**
     * Orients the object in such a way as to face the target point.
     */
    lookAt: function(target)
    {
        this._matrix.lookAt(target, this._position);
        this._matrix.appendScale(this._scale);
        this._applyMatrix();
    },

    /**
     * Copies the state of another Transform object
     */
    copyTransform: function(transform)
    {
        this._changeListener.enabled = false;
        this._rotationChangeListener.enabled = false;
        this._position.copyFrom(transform.position);
        this._rotation.copyFrom(transform.rotation);
        this._scale.copyFrom(transform.scale);
        this._changeListener.enabled = true;
        this._rotationChangeListener.enabled = true;
        this._eulerInvalid = true;
        this._invalidateMatrix();
    },

    /**
     * The matrix representing the transform.
     */
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

	/**
     * @ignore
	 */
	_onEulerChanged: function()
    {
        this._rotationChangeListener.enabled = false;
        this._rotation.fromEuler(this._euler);
		this._rotationChangeListener.enabled = true;
        this._invalidateMatrix();
	},

	/**
     * @ignore
	 */
	_onRotationChanged: function ()
	{
        this._eulerInvalid = true;
        this._invalidateMatrix();
	},

	/**
     * @ignore
     */
    _invalidateMatrix: function ()
    {
        this._matrixInvalid = true;
    },

    /**
     * @ignore
     */
    _updateMatrix: function()
    {
        this._matrix.compose(this);
        this._matrixInvalid = false;
    },

    /**
     * @ignore
     */
    _applyMatrix: function()
    {
        this._matrixInvalid = false;
        // matrix decompose will trigger property updates, so disable this
        this._changeListener.enabled = false;
        this._rotationChangeListener.enabled = false;
        this._matrix.decompose(this);
        this._changeListener.enabled = true;
        this._rotationChangeListener.enabled = true;
        this._eulerInvalid = true;
    },

	/**
	 * Creates a copy of the object.
 	 */
	clone: function()
	{
		var clone = new Transform();
		clone.copyFrom(this);
		return clone;
	},

	/**
	 * @ignore
	 */
	copyFrom: function(src)
	{
		this.matrix = src.matrix;
	}
};

export { Transform };