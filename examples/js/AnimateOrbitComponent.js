/**
 * Just spins an object around an axis.
 */
AnimateOrbitComponent = function()
{
    HX.Component.call(this);
    this._pivotPoint = new HX.Float4();
    this._radiusVector = new HX.Float4(0.0, 0.0, 1.0);
    this._radians = 0;
    this._speed = 1.0; // radians per second
    this._axis = HX.Float4.Y_AXIS.clone();
};

AnimateOrbitComponent.prototype = Object.create(HX.Component.prototype,
    {
        pivotPoint: {
            get: function ()
            {
                return this._pivotPoint;
            },
            set: function (value)
            {
                this._pivotPoint = value;
            }
        },
        radius: {
            get: function ()
            {
                return this._radiusVector.z;
            },
            set: function (value)
            {
                this._radiusVector.z = value;
            }
        },
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

AnimateOrbitComponent.prototype.onUpdate = function(dt)
{
    this._radians += dt/1000.0 * this._speed;

    var matrix = this.entity.transformationMatrix;
    matrix.fromTranslation(this._radiusVector);
    matrix.appendRotationAxisAngle(this._axis, this._radians);
    matrix.appendTranslation(this._pivotPoint);

    this.entity.transformationMatrix = matrix;
};