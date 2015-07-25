/**
 * An object using position, rotation quaternion and scale to describe an object's transformation.
 *
 * @constructor
 */
HX.Transform = function()
{
    this._position = new HX.Float4(0.0, 0.0, 0.0, 1.0);
    this._rotation = new HX.Quaternion();
    this._scale = new HX.Float4(1.0, 1.0, 1.0, 1.0);

    this._changeListener = new HX.PropertyListener();
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
    this.onChange = this._changeListener.onChange;
};

HX.Transform.prototype =
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

    copyFrom: function(transform)
    {
        this._changeListener.setEnabled(false);
        this.position.copyFrom(transform.position);
        this.rotation.copyFrom(transform.rotation);
        this.scale.copyFrom(transform.scale);
        this._changeListener.setEnabled(true);
        this.onChange.dispatch();
    }
};