import {RigidBody} from "../components/RigidBody";

function PlayerController()
{
	HX.Component.call(this);
	this._move = new HX.Float2();
	this._walkForce = 50.0;
	this._runForce = 100.0;
	this._movementForce = this._walkForce;
	this._jumpForce = 10.0;
	this._pitch = 0.0;
	this._yaw = 0.0;
	this._mouseX = 0;
	this._mouseY = 0;
	this._jump = 0;

	this._onKeyDown = null;
	this._onKeyUp = null;
}

HX.Component.create(PlayerController, {
	walkForce: {
		get: function()
		{
			return this._walkForce;
		},

		set: function(value)
		{
			this._movementForce = value;
			this._walkForce = value;
		}
	},

	runForce: {
		get: function()
		{
			return this._runForce;
		},

		set: function(value)
		{
			this._runForce = value;
		}
	},

	jumpForce: {
		get: function()
		{
			return this._jumpForce;
		},

		set: function(value)
		{
			this._jumpForce = value;
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
	}
});

/**
 * @ignore
 */
PlayerController.prototype.onAdded = function(dt)
{
	var self = this;

	this._onKeyDown = function(event) {
		var keyCode = ("which" in event) ? event.which : event.keyCode;

		switch (keyCode) {
			case 16:
				self._movementForce = self._runForce;
				break;
			case 32:
				self._jump = self._jumpForce;
				break;
			case 87:
				self._setForward(1.0);
				break;
			case 83:
				self._setForward(-1.0);
				break;
			case 65:
				self._setStride(-1.0);
				break;
			case 68:
				self._setStride(1.0);
				break;
			default:
			// nothing
		}
	};

	this._onKeyUp = function(event) {
		var keyCode = ("which" in event) ? event.which : event.keyCode;

		switch (keyCode) {
			case 16:
				self._movementForce = self._walkForce;
				break;
			case 87:
			case 83:
				self._setForward(0.0);
				break;
			case 65:
			case 68:
				self._setStride(0.0);
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
		HX.META.TARGET_CANVAS.addEventListener("mousemove", self._onMouseMove);
	};

	this._onMouseUp = function(event)
	{
		HX.META.TARGET_CANVAS.removeEventListener("mousemove", self._onMouseMove);
	};

	document.addEventListener("keydown", this._onKeyDown);
	document.addEventListener("keyup", this._onKeyUp);
	HX.META.TARGET_CANVAS.addEventListener("mousedown", this._onMouseDown);
	HX.META.TARGET_CANVAS.addEventListener("mouseup", this._onMouseUp);
};

/**
 * @ignore
 */
PlayerController.prototype.onRemoved = function(dt)
{
	document.removeEventListener("keydown", this._onKeyDown);
	document.removeEventListener("keyup", this._onKeyUp);
	HX.META.TARGET_CANVAS.removeEventListener("mousemove", this._onMouseMove);
	HX.META.TARGET_CANVAS.removeEventListener("mousedown", this._onMouseDown);
	HX.META.TARGET_CANVAS.removeEventListener("mouseup", this._onMouseUp);
};

/**
 * @ignore
 */
PlayerController.prototype.onUpdate = function(dt)
{
	var x = new HX.Float2();
	var y = new HX.Float2();
	var p = new HX.Float4();

	return function(dt)
	{
		this._rigidBody = this.entity.getFirstComponentByType(RigidBody);

		var extr = Math.PI * .5 - 0.001;
		if (this._pitch < -extr) this._pitch = -extr;
		else if (this._pitch > extr) this._pitch = extr;

		this.entity.rotation.fromPitchYawRoll(this._pitch, this._yaw, 0.0);

		var matrix = this.entity.matrix;

		var m = matrix._m;
		x.set(m[0], m[1]);
		y.set(m[4], m[5]);
		x.normalize();
		y.normalize();
		p.x = (this._move.x * x.x + this._move.y * y.x) * this._movementForce;
		p.y = (this._move.x * x.y + this._move.y * y.y) * this._movementForce;
		p.z = 0.0;
		this._rigidBody.addForce(p);

		if (this._jump) {
			p.x = 0;
			p.y = 0;
			p.z = this._jump;
			this._rigidBody.addImpulse(p);
			this._jump = 0;
		}
	}
}();

/**
 * @ignore
 */
PlayerController.prototype._setForward = function(ratio)
{
	this._move.y = ratio;
};

/**
 * @ignore
 */
PlayerController.prototype._setStride = function(ratio)
{
	this._move.x = ratio;
};

/**
 * @ignore
 */
PlayerController.prototype._addPitch = function(value)
{
	this._pitch += value;
};

/**
 * @ignore
 */
PlayerController.prototype._addYaw = function(value)
{
	this._yaw += value;
};

export {PlayerController };