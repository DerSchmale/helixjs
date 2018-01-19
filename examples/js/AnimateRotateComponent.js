/**
 * Just spins an object around an axis.
 */
AnimateRotateComponent = function()
{
    HX.Component.call(this);
    this._radians = 0;
    this._speed = 1.0; // radians per second
    this._axis = HX.Float4.Z_AXIS.clone();
};

HX.Component.create(AnimateRotateComponent,
    {
        axis: {
            get: function ()
            {
                return this._axis;
            },
            set: function (value)
            {
                this._axis = value;
            }
        },
        speed: {
            get: function ()
            {
                return this._speed;
            },
            set: function (value)
            {
                this._speed = value;
            }
        }
    }
);

AnimateRotateComponent.prototype.onUpdate = function(dt)
{
    this._radians += dt/1000.0 * this._speed;
    var matrix = this.entity.matrix;
    var position = matrix.getColumn(3);
    matrix.fromRotationAxisAngle(this._axis, this._radians);
    matrix.setColumn(3, position);

    this.entity.matrix = matrix;
};