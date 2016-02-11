FlightController = function()
{
    HX.Component.call(this);
    this._speed = 1.0;
    this._speedMultiplier = 2.0;
    this._torquePitch = 0.0;
    this._torqueYaw = 0.0;
    this._localVelocity = new HX.Float4(0, 0, 0, 0);
    this._localAcceleration = new HX.Float4(0, 0, 0, 0);
    this._pitch = 0.0;
    this._yaw = 0.0;
    this._mouseX = 0;
    this._mouseY = 0;

    this._torque = 1.0;    // m/s^2
    this._friction = 5.0;    // 1/s

    this._maxAcceleration = this._speed;    // m/s^2
    this._maxVelocity = this._speed;    // m/s

    this._onKeyDown = null;
    this._onKeyUp = null;
};

FlightController.prototype = Object.create(HX.Component.prototype, {
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

    torque: {
        get: function()
        {
            return this._torque;
        },

        set: function(value)
        {
            this._torque = value;
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

FlightController.prototype.onAdded = function(dt)
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
                self._setForwardForce(-1.0);
                break;
            case 83:
                self._setForwardForce(1.0);
                break;
            case 65:
                self._setStrideForce(-1.0);
                break;
            case 68:
                self._setStrideForce(1.0);
                break;
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
        }
    };

    this._onMouseMove = function(event)
    {
        event = event || window.event;

        self._addPitch(-(self._mouseY-event.clientY) / 100);
        self._addYaw((self._mouseX-event.clientX) / 100);

        self._mouseX = event.clientX;
        self._mouseY = event.clientY;
    };

    this._onMouseDown = function(event)
    {
        self._mouseX = event.clientX;
        self._mouseY = event.clientY;
        document.addEventListener("mousemove", self._onMouseMove);
    };

    this._onMouseUp = function(event)
    {
        document.removeEventListener("mousemove", self._onMouseMove);
    };

    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
    document.addEventListener("mousedown", this._onMouseDown);
    document.addEventListener("mouseup", this._onMouseUp);
};

FlightController.prototype.onRemoved = function(dt)
{
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mousedown", this._onMouseDown);
    document.removeEventListener("mouseup", this._onMouseUp);
};

FlightController.prototype.onUpdate = function(dt)
{
    var seconds = dt * .001;

    var frictionForce = HX.Float4.scale(this._localVelocity, this._friction*seconds);
    this._localVelocity.subtract(frictionForce);

    var acceleration = HX.Float4.scale(this._localAcceleration, this._maxAcceleration*seconds);
    this._localVelocity.add(acceleration);

    var absVelocity = this._localVelocity.length;
    if (absVelocity > this._maxVelocity)
        this._localVelocity.scale(this._maxVelocity/absVelocity);

    this._pitch += this._torquePitch;
    this._yaw += this._torqueYaw;

    if (this._pitch < -Math.PI*.5) this._pitch = -Math.PI*.5;
    else if (this._pitch > Math.PI*.5) this._pitch = Math.PI*.5;

    var matrix = this.entity.transformationMatrix;
    // the original position
    var position = matrix.getColumn(3);
    var distance = HX.Float4.scale(this._localVelocity, seconds);

    matrix.fromRotationPitchYawRoll(this._pitch, this._yaw, 0.0);
    matrix.prependTranslation(distance);
    matrix.appendTranslation(position);

    this.entity.transformationMatrix = matrix;
};

// ratio is "how far the controller is pushed", from -1 to 1
FlightController.prototype._setForwardForce = function(ratio)
{
    this._localAcceleration.z = ratio * this._maxAcceleration;
};

FlightController.prototype._setStrideForce = function(ratio)
{
    this._localAcceleration.x = ratio * this._maxAcceleration;
};

FlightController.prototype._setTorquePitch = function(ratio)
{
    this._torquePitch = ratio * this._torque;
};

FlightController.prototype._setTorqueYaw = function(ratio)
{
    this._torqueYaw = ratio * this._torque;
};

FlightController.prototype._addPitch = function(value)
{
    this._pitch += value;
};

FlightController.prototype._addYaw = function(value)
{
    this._yaw += value;
};