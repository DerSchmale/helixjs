/**
 *
 * @param target
 * @constructor
 */
HX.OrbitController = function(lookAtTarget)
{
    HX.Component.call(this);
    this._coords = new HX.Float4(Math.PI *.5, Math.PI * .4, 1.0, 0.0);   // azimuth, polar, radius
    this._localAcceleration = new HX.Float4(0.0, 0.0, 0.0, 0.0);
    this._localVelocity = new HX.Float4(0.0, 0.0, 0.0, 0.0);

    this.touchZoomSpeed = .01;
    this.zoomSpeed = 1.0;
    this.maxRadius = 4.0;
    this.minRadius = 0.1;
    this.dampen = .9;
    this.lookAtTarget = lookAtTarget || new HX.Float4(0.0, 0.0, 0.0, 1.0);
    this._oldMouseX = 0;
    this._oldMouseY = 0;

    this._isDown = false;
};

HX.OrbitController.prototype = Object.create(HX.Component.prototype,
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

HX.OrbitController.prototype.onAdded = function()
{
    var self = this;

    this._onMouseWheel = function(event)
    {
        var delta = event.detail? -120 * event.detail : event.wheelDelta;
        self.setZoomImpulse(-delta * self.zoomSpeed * .0001);
    };

    this._onMouseDown = function (event)
    {
        self._oldMouseX = undefined;
        self._oldMouseY = undefined;

        self._isDown = true;
    };

    this._onMouseMove = function(event)
    {
        if (!self._isDown) return;
        self._updateMove(event.screenX, event.screenY)
    };

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
            self.radius = self._startZoom + diff * this.touchZoomSpeed;
        }
    };

    this._onUp = function(event) { self._isDown = false; };

    var mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
    HX.TARGET_CANVAS.addEventListener(mousewheelevt, this._onMouseWheel);
    HX.TARGET_CANVAS.addEventListener("mousemove", this._onMouseMove);
    HX.TARGET_CANVAS.addEventListener("touchmove", this._onTouchMove);
    HX.TARGET_CANVAS.addEventListener("mousedown", this._onMouseDown);
    HX.TARGET_CANVAS.addEventListener("touchstart", this._onTouchDown);
    HX.TARGET_CANVAS.addEventListener("mouseup", this._onUp);
    HX.TARGET_CANVAS.addEventListener("touchend", this._onUp);
};

HX.OrbitController.prototype.onRemoved = function()
{
    var mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
    HX.TARGET_CANVAS.removeEventListener(mousewheelevt, this._onMouseWheel);
    HX.TARGET_CANVAS.removeEventListener("mousemove", this._onMouseMove);
    HX.TARGET_CANVAS.removeEventListener("touchmove", this._onTouchMove);
    HX.TARGET_CANVAS.removeEventListener("mousedown", this._onMouseDown);
    HX.TARGET_CANVAS.removeEventListener("touchstart", this._onTouchDown);
    HX.TARGET_CANVAS.removeEventListener("mouseup", this._onUp);
    HX.TARGET_CANVAS.removeEventListener("touchend", this._onUp);
};

HX.OrbitController.prototype.onUpdate = function(dt)
{
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
    this._coords.y = HX.clamp(this._coords.y, 0.1, Math.PI - .1);
    this._coords.z = HX.clamp(this._coords.z, this.minRadius, this.maxRadius);

    var matrix = this.entity.matrix;
    var pos = new HX.Float4();
    pos.fromSphericalCoordinates(this._coords.z, this._coords.x, this._coords.y);
    pos.add(this.lookAtTarget);
    matrix.lookAt(this.lookAtTarget, pos, HX.Float4.Y_AXIS);
    this.entity.matrix = matrix;
};

    // ratio is "how far the controller is pushed", from -1 to 1
HX.OrbitController.prototype.setAzimuthImpulse  = function(value)
{
    this._localAcceleration.x = value;
};

HX.OrbitController.prototype.setPolarImpulse = function(value)
{
    this._localAcceleration.y = value;
};

HX.OrbitController.prototype.setZoomImpulse = function(value)
{
    this._localAcceleration.z = value;
};

HX.OrbitController.prototype._updateMove = function(x, y)
{
    if (this._oldMouseX !== undefined) {
        var dx = x - this._oldMouseX;
        var dy = y - this._oldMouseY;
        this.setAzimuthImpulse(dx * .0015);
        this.setPolarImpulse(-dy * .0015);
    }
    this._oldMouseX = x;
    this._oldMouseY = y;
};