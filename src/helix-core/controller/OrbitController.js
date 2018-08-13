import {Component} from "../entity/Component";
import {Float4} from "../math/Float4";
import {MathX} from "../math/MathX";
import {META} from "../Helix";
import {FloatController} from "./FloatController";

/**
 * @classdesc
 * FloatController is a {@linkcode Component} that allows moving an object (usually a camera) using mouse or touch around a central point.
 *
 * @property {number} radius The distance between the Entity and the lookAtTarget.
 * @property {number} azimuth The azimuth coordinate of the object relative to the lookAtTarget.
 * @property {number} polar The polar coordinate of the object relative to the lookAtTarget.
 *
 * @param {Float4} target The position around which to orbit.
 *
 * @constructor
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OrbitController(lookAtTarget)
{
    Component.call(this);
    this._coords = new Float4(-Math.PI *.5, Math.PI * .4, 1.0, 0.0);   // azimuth, polar, radius
    this._localAcceleration = new Float4(0.0, 0.0, 0.0, 0.0);
    this._localVelocity = new Float4(0.0, 0.0, 0.0, 0.0);

    this.touchZoomSpeed = .01;
    this.zoomSpeed = 1.0;
    this.maxRadius = 4.0;
    this.minRadius = 0.1;
    this.dampen = .9;
    this.lookAtTarget = lookAtTarget || new Float4(0.0, 0.0, 0.0, 1.0);
    this._oldMouseX = 0;
    this._oldMouseY = 0;

    this._isDown = false;
}

Component.create(OrbitController,
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
            self.radius = self._startZoom + diff * self.touchZoomSpeed;
        }
    };

    this._onUp = function(event) { self._isDown = false; };

    var mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
    META.TARGET_CANVAS.addEventListener(mousewheelevt, this._onMouseWheel);
    META.TARGET_CANVAS.addEventListener("mousemove", this._onMouseMove);
    META.TARGET_CANVAS.addEventListener("touchmove", this._onTouchMove);
    META.TARGET_CANVAS.addEventListener("mousedown", this._onMouseDown);
    META.TARGET_CANVAS.addEventListener("touchstart", this._onTouchDown);
    META.TARGET_CANVAS.addEventListener("mouseup", this._onUp);
    META.TARGET_CANVAS.addEventListener("touchend", this._onUp);
};

/**
 * @ignore
 */
OrbitController.prototype.onRemoved = function()
{
    var mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
    META.TARGET_CANVAS.removeEventListener(mousewheelevt, this._onMouseWheel);
    META.TARGET_CANVAS.removeEventListener("mousemove", this._onMouseMove);
    META.TARGET_CANVAS.removeEventListener("touchmove", this._onTouchMove);
    META.TARGET_CANVAS.removeEventListener("mousedown", this._onMouseDown);
    META.TARGET_CANVAS.removeEventListener("touchstart", this._onTouchDown);
    META.TARGET_CANVAS.removeEventListener("mouseup", this._onUp);
    META.TARGET_CANVAS.removeEventListener("touchend", this._onUp);
};

/**
 * @ignore
 */
OrbitController.prototype.onUpdate = function(dt)
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
    this._coords.y = MathX.clamp(this._coords.y, 0.1, Math.PI - .1);
    this._coords.z = MathX.clamp(this._coords.z, this.minRadius, this.maxRadius);

    var matrix = this.entity.matrix;
    var pos = new Float4();
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

/**
 * @ignore
 */
OrbitController.prototype._updateMove = function(x, y)
{
    if (this._oldMouseX !== undefined) {
        var dx = this._oldMouseX - x;
        var dy = this._oldMouseY - y;
        this.setAzimuthImpulse(dx * .0015);
        this.setPolarImpulse(dy * .0015);
    }
    this._oldMouseX = x;
    this._oldMouseY = y;
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


export { OrbitController };