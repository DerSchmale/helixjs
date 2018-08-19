import {Float4} from "../math/Float4";
import {Component} from "../entity/Component";
import {META} from "../Helix";


/**
 * @classdesc
 * FloatController is a {@linkcode Component} that allows moving an object (usually a camera) using mouse and keyboard (typical WASD controls) in all directions.
 * It uses Tait-Bryan pitch/yaw (ignoring roll) angles.
 *
 * @property {number} speed The speed at which to move.
 * @property {number} shiftMultiplier A speed-up factor for when the shift key is pressed.
 * @property {number} pitch The current orientation pitch (rotation about the X axis).
 * @property {number} yaw The current orientation yaw (rotation about the Y axis).
 * @property {number} friction The amount of friction that will cause the movement to stop when there's no input.
 *
 * @constructor
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FloatController()
{
    Component.call(this);
    this._speed = 1.0;
    this._speedMultiplier = 2.0;
    this._localVelocity = new Float4(0, 0, 0, 0);
    this._localAcceleration = new Float4(0, 0, 0, 0);
    this._pitch = 0.0;
    this._yaw = 0.0;
    this._mouseX = 0;
    this._mouseY = 0;

    this._friction = 5.0;    // 1/s

    this._maxAcceleration = this._speed;    // m/s^2
    this._maxVelocity = this._speed;    // m/s

    this._onKeyDown = null;
    this._onKeyUp = null;
}

Component.create(FloatController, {
    speed: {
        get: function()
        {
            return this._speed;
        },

        set: function(value)
        {
            this._speed = value;
            this._maxAcceleration = value;
            this._maxVelocity = value;
        }
    },

    shiftMultiplier: {
        get: function()
        {
            return this._speedMultiplier;
        },

        set: function(value)
        {
            this._speedMultiplier = value;
        }
    },

    pitch: {
        get: function()
        {
            return this._pitch;
        },

        set: function(value)
        {
            this._pitch = value;
        }
    },

    yaw: {
        get: function()
        {
            return this._yaw;
        },

        set: function(value)
        {
            this._yaw = value;
        }
    },

    friction: {
        get: function()
        {
            return this._friction;
        },

        set: function(value)
        {
            this._friction = value;
        }
    }
});

/**
 * @ignore
 */
FloatController.prototype.onAdded = function()
{
    var self = this;
    this._onKeyDown = function(event) {
        var keyCode = ("which" in event) ? event.which : event.keyCode;

        switch (keyCode) {
            case 16:
                self._maxVelocity = self._speed * self._speedMultiplier;
                self._maxAcceleration = self._speed * self._speedMultiplier;
                break;
            case 87:
                self._setForwardForce(1.0);
                break;
            case 83:
                self._setForwardForce(-1.0);
                break;
            case 65:
                self._setStrideForce(-1.0);
                break;
            case 68:
                self._setStrideForce(1.0);
                break;
            default:
                // nothing
        }
    };

    this._onKeyUp = function(event) {
        var keyCode = ("which" in event) ? event.which : event.keyCode;

        switch (keyCode) {
            case 16:
                self._maxVelocity = self._speed;
                self._maxAcceleration = self._speed;
                break;
            case 87:
            case 83:
                self._setForwardForce(0.0);
                break;
            case 65:
            case 68:
                self._setStrideForce(0.0);
                break;
            default:
            // nothing
        }
    };

    this._onMouseMove = function(event)
    {
        event = event || window.event;

        self._addPitch((self._mouseY-event.clientY) / 100);
        self._addYaw(-(self._mouseX-event.clientX) / 100);

        self._mouseX = event.clientX;
        self._mouseY = event.clientY;
    };

    this._onMouseDown = function(event)
    {
        self._mouseX = event.clientX;
        self._mouseY = event.clientY;
        META.TARGET_CANVAS.addEventListener("mousemove", self._onMouseMove);
    };

    this._onMouseUp = function(event)
    {
        META.TARGET_CANVAS.removeEventListener("mousemove", self._onMouseMove);
    };

    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
    META.TARGET_CANVAS.addEventListener("mousedown", this._onMouseDown);
    META.TARGET_CANVAS.addEventListener("mouseup", this._onMouseUp);
};

/**
 * @ignore
 */
FloatController.prototype.onRemoved = function()
{
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    META.TARGET_CANVAS.removeEventListener("mousemove", this._onMouseMove);
    META.TARGET_CANVAS.removeEventListener("mousedown", this._onMouseDown);
    META.TARGET_CANVAS.removeEventListener("mouseup", this._onMouseUp);
};

/**
 * @ignore
 */
FloatController.prototype.onUpdate = function(dt)
{
    var seconds = dt * .001;

    var frictionForce = Float4.scale(this._localVelocity, this._friction*seconds);
    this._localVelocity.subtract(frictionForce);

    var acceleration = Float4.scale(this._localAcceleration, this._maxAcceleration*seconds);
    this._localVelocity.add(acceleration);

    var absVelocity = this._localVelocity.length;
    if (absVelocity > this._maxVelocity)
        this._localVelocity.scale(this._maxVelocity/absVelocity);

    if (this._pitch < -Math.PI*.5) this._pitch = -Math.PI*.5;
    else if (this._pitch > Math.PI*.5) this._pitch = Math.PI*.5;

    var matrix = this.entity.matrix;
    // the original position
    var position = matrix.getColumn(3);
    var distance = Float4.scale(this._localVelocity, seconds);

    matrix.fromRotationPitchYawRoll(this._pitch, this._yaw, 0.0);
    matrix.prependTranslation(distance);
    matrix.appendTranslation(position);

    this.entity.matrix = matrix;
};

/**
 * @ignore
 */
FloatController.prototype._setForwardForce = function(ratio)
{
    this._localAcceleration.y = ratio * this._maxAcceleration;
};

/**
 * @ignore
 */
FloatController.prototype._setStrideForce = function(ratio)
{
    this._localAcceleration.x = ratio * this._maxAcceleration;
};

/**
 * @ignore
 */
FloatController.prototype._addPitch = function(value)
{
    this._pitch += value;
};

/**
 * @ignore
 */
FloatController.prototype._addYaw = function(value)
{
    this._yaw += value;
};

FloatController.prototype.clone = function()
{
    var clone = new FloatController();
    clone.speed = this.speed;
    clone.shiftMultiplier = this.shiftMultiplier;
    clone.pitch = this.pitch;
    clone.yaw = this.yaw;
    clone.friction = this.friction;
    return clone;
};

export {FloatController };