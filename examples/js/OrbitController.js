function OrbitController(lookAtTarget)
{
	HX.Component.call(this);

    this._coords = new HX.Float4(-Math.PI *.5, Math.PI * .4, 1.0, 0.0);   // azimuth, polar, radius
    this._localAcceleration = new HX.Float4(0.0, 0.0, 0.0, 0.0);
    this._localVelocity = new HX.Float4(0.0, 0.0, 0.0, 0.0);

    this._input = new HX.Input();
    this._mouse = new HX.Mouse();
	this._mouse.sensitivityX = -1;
	this._mouse.sensitivityY = -1;
	this._mouse.sensitivityZoom = 1.2;
	this._mouse.map(HX.Mouse.DRAG_X, "axisX");
	this._mouse.map(HX.Mouse.DRAG_Y, "axisY");
	this._mouse.map(HX.Mouse.WHEEL_Y, "zoom");

	this._touch = new HX.Touch();
	this._touch.sensitivityY = -1;
	this._touch.sensitivityX = -1;
	this._touch.map(HX.Touch.MOVE_X, "axisX");
	this._touch.map(HX.Touch.MOVE_Y, "axisY");
	this._touch.map(HX.Touch.PINCH, "zoom");

	this.zoomSpeed = 0.8;
    this.maxRadius = 4.0;
    this.minRadius = 0.1;
    this.dampen = .9;
    this.lookAtTarget = lookAtTarget || new HX.Float4(0.0, 0.0, 0.0, 1.0);

    this._isDown = false;
}

HX.Component.create(OrbitController,
    {
        radius: {
            get: function() { return this._coords.z; },
            set: function(value) { this._coords.z = value; }
        },

        azimuth: {
            get: function() { return this._coords.x; },
            set: function(value) { this._coords.x = value; }
        },

        polar: {
            get: function() { return this._coords.y; },
            set: function(value) { this._coords.y = value; }
        }
    });

OrbitController.prototype.onAdded = function()
{
	this._input.enable(this._mouse);
	this._input.enable(this._touch);
};

OrbitController.prototype.onRemoved = function()
{
	this._input.disable(this._mouse);
	this._input.disable(this._touch);
};

OrbitController.prototype.onUpdate = function(dt)
{
	this.setAzimuthImpulse(this._input.getValue("axisX"));
	this.setPolarImpulse(this._input.getValue("axisY"));

	var zoom = this._input.getValue("zoom");
	this.setZoomImpulse(-zoom * this.zoomSpeed);

    this._localVelocity.x *= this.dampen;
    this._localVelocity.y *= this.dampen;
    this._localVelocity.z *= this.dampen;
    this._localVelocity.x += this._localAcceleration.x;
    this._localVelocity.y += this._localAcceleration.y;
    this._localVelocity.z += this._localAcceleration.z;
    this._localAcceleration.x = 0.0;
    this._localAcceleration.y = 0.0;
    this._localAcceleration.z = 0.0;

    this._coords.add(this._localVelocity);
    this._coords.y = HX.MathX.clamp(this._coords.y, 0.1, Math.PI - .1);
    this._coords.z = HX.MathX.clamp(this._coords.z, this.minRadius, this.maxRadius);

    var matrix = this.entity.matrix;
    var pos = new HX.Float4();
    pos.fromSphericalCoordinates(this._coords.z, this._coords.x, this._coords.y);
    pos.w = 0.0;
    pos.add(this.lookAtTarget);
    matrix.lookAt(this.lookAtTarget, pos);
    this.entity.matrix = matrix;
};

OrbitController.prototype.setAzimuthImpulse  = function(value)
{
    this._localAcceleration.x = value;
};

OrbitController.prototype.setPolarImpulse = function(value)
{
    this._localAcceleration.y = value;
};

OrbitController.prototype.setZoomImpulse = function(value)
{
    this._localAcceleration.z = value;
};


OrbitController.prototype.clone = function()
{
	var clone = new OrbitController();
	clone.radius = this.radius;
	clone.azimuth = this.azimuth;
	clone.polar = this.polar;
	clone.touchZoomSpeed = this.touchZoomSpeed;
	clone.zoomSpeed = this.zoomSpeed;
	clone.maxRadius = this.maxRadius;
	clone.minRadius = this.minRadius;
	clone.dampen = this.dampen;
	clone.lookAtTarget = this.lookAtTarget.clone();
	return clone;
};