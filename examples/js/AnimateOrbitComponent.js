/**
 * Just spins an object around an axis.
 */
function AnimateOrbitComponent()
{
    HX.Component.call(this);
    this.pivotPoint = new HX.Float4();
    this.radius = 1.0;
    this.axis = HX.Float4.Y_AXIS.clone();
    this.radians = 0;
    this.speed = 1.0; // radians per second

    this._originalMatrix = null;
}

AnimateOrbitComponent.prototype = Object.create(HX.Component.prototype);

AnimateOrbitComponent.prototype.onAdded = function()
{
    // store the original matrix of the object
    this._originalMatrix = this.entity.matrix.clone();
};

AnimateOrbitComponent.prototype.onRemoved = function()
{
    // reset the original matrix now the component isn't in control anymore
    this.entity.matrix.copyFrom(this._originalMatrix);
};

AnimateOrbitComponent.prototype.onUpdate = function(dt)
{
    this.radians += dt/1000.0 * this.speed;

    var matrix = this.entity.matrix;
    matrix.fromTranslation(0, 0, this.radius);
    matrix.appendRotationAxisAngle(this.axis, this.radians);
    matrix.appendTranslation(this.pivotPoint);

    this.entity.matrix = matrix;
};

AnimateOrbitComponent.prototype.clone = function()
{
    var clone = new AnimateOrbitComponent();
	clone.pivotPoint = this.pivotPoint.clone();
	clone.radius = this.radius = 1.0;
	clone.axis = this.axis.clone();
	clone.radians = this.radians;
	clone.speed = this.speed; // radians per second
    return clone;
};

HX.Component.register("animateOrbitComponent", AnimateOrbitComponent);