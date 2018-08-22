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
	this._mouse.map(HX.Mouse.DRAG_X, "axisX");
	this._mouse.map(HX.Mouse.DRAG_Y, "axisY");
	this._mouse.map(HX.Mouse.WHEEL_Y, "zoom");

    this.zoomSpeed = 1.0;
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

/**
 * @ignore
 */
OrbitController.prototype.onAdded = function()
{
    var self = this;

	this._input.enable(this._mouse);

    this._onTouchDown = function (event)
    {
        self._oldMouseX = undefined;
        self._oldMouseY = undefined;

        if (event.touches.length === 2) {
            var touch1 = event.touches[0];
            var touch2 = event.touches[1];
            var dx = touch1.screenX - touch2.screenX;
            var dy = touch1.screenY - touch2.screenY;
            self._startPitchDistance = Math.sqrt(dx*dx + dy*dy);
            self._startZoom = self.radius;
        }

        self._isDown = true;
    };

    this._onTouchMove = function (event)
    {
        event.preventDefault();

        if (!self._isDown) return;

        var numTouches = event.touches.length;

        if (numTouches === 1) {
            var touch = event.touches[0];
            self._updateMove(touch.screenX, touch.screenY);
        }
        else if (numTouches === 2) {
            var touch1 = event.touches[0];
            var touch2 = event.touches[1];
            var dx = touch1.screenX - touch2.screenX;
            var dy = touch1.screenY - touch2.screenY;
            var dist = Math.sqrt(dx*dx + dy*dy);
            var diff = self._startPitchDistance - dist;
            self.radius = self._startZoom + diff * self.touchZoomSpeed;
        }
    };

    this._onUp = function(event) { self._isDown = false; };

    HX.META.TARGET_CANVAS.addEventListener("touchmove", this._onTouchMove);
	HX.META.TARGET_CANVAS.addEventListener("touchstart", this._onTouchDown);
	HX.META.TARGET_CANVAS.addEventListener("touchend", this._onUp);
};

/**
 * @ignore
 */
OrbitController.prototype.onRemoved = function()
{
	this._input.disable(this._mouse);

	HX.META.TARGET_CANVAS.removeEventListener("touchmove", this._onTouchMove);
	HX.META.TARGET_CANVAS.removeEventListener("touchstart", this._onTouchDown);
	HX.META.TARGET_CANVAS.removeEventListener("touchend", this._onUp);
};

/**
 * @ignore
 */
OrbitController.prototype.onUpdate = function(dt)
{
	this.setAzimuthImpulse(this._input.getValue("axisX"));
	this.setPolarImpulse(this._input.getValue("axisY"));

	var zoom = this._input.getValue("zoom");
	this.setZoomImpulse(zoom * this.zoomSpeed);

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

/**
 * @ignore
 */
OrbitController.prototype.setAzimuthImpulse  = function(value)
{
    this._localAcceleration.x = value;
};

/**
 * @ignore
 */
OrbitController.prototype.setPolarImpulse = function(value)
{
    this._localAcceleration.y = value;
};

/**
 * @ignore
 */
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