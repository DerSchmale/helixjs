function FloatController()
{
	this.maxAcceleration = 2.0;
	this.maxSpeed = 4.0;
	this.shiftMultiplier = 2.0;
	this.friction = .02;
	this.pitch = 0.0;
	this.yaw = 0.0;

	HX.Component.call(this);

	// normally this would be defined externally and passed into the controllers
    this._input = new HX.Input();
    if (HX.MouseLock.isSupported()) {
        this._mouse = new HX.MouseLock();
        this._mouse.map(HX.MouseLock.MOVE_X, "lookX");
        this._mouse.map(HX.MouseLock.MOVE_Y, "lookY");
    }
    else {
        this._mouse = new HX.Mouse();
        this._mouse.map(HX.Mouse.DRAG_X, "lookX");
        this._mouse.map(HX.Mouse.DRAG_Y, "lookY");
	}
	this._mouse.sensitivityX = 3;
	this._mouse.sensitivityY = -3;
    this._keyboard = new HX.Keyboard();
	this._keyboard.map("ShiftLeft", "run");
	this._keyboard.mapAxis("KeyA", "KeyD", "moveX");
	this._keyboard.mapAxis("KeyS", "KeyW", "moveY");

    this._velocity = new HX.Float4(0, 0, 0, 0);
    this._acceleration = new HX.Float4(0, 0, 0, 0);
}

HX.Component.create(FloatController);

FloatController.prototype.onAdded = function()
{
	this._input.enable(this._mouse);
	this._input.enable(this._keyboard);
};

FloatController.prototype.onRemoved = function()
{
	this._input.disable(this._mouse);
	this._input.disable(this._keyboard);
};

FloatController.prototype.onUpdate = function(dt)
{
	this._updateLook();
    this._updateVelocity(dt);

	var seconds = dt * .001;
    var matrix = this.entity.matrix;
    // the original position
    var position = matrix.getColumn(3);
    var distance = HX.Float4.scale(this._velocity, seconds);

    matrix.fromRotationPitchYawRoll(this.pitch, this.yaw, 0.0);
    matrix.prependTranslation(distance);
    matrix.appendTranslation(position);

    this.entity.matrix = matrix;
};

FloatController.prototype._updateVelocity = function(seconds)
{
	var run = this._input.getValue("run");
	var moveX = this._input.getValue("moveX");
	var moveY = this._input.getValue("moveY");

	this._acceleration.x = moveX * this.maxAcceleration;
	this._acceleration.y = moveY * this.maxAcceleration;

	var maxSpeed = this.maxSpeed;

	if (run) {
	    maxSpeed *= this.shiftMultiplier;
		this._acceleration.scale(this.shiftMultiplier);
	}

	var frictionAmount = Math.min(this.friction * seconds, 1.0);
	var dv = HX.Float4.scale(this._velocity, frictionAmount);
	this._velocity.subtract(dv);
	this._velocity.addScaled(this._acceleration, seconds);

	var absVelocity = this._velocity.length;
	if (absVelocity > maxSpeed)
		this._velocity.scale(maxSpeed/absVelocity);
};

FloatController.prototype._updateLook = function()
{
	var axisX = this._input.getValue("lookX");
	var axisY = this._input.getValue("lookY");
	this.yaw += axisX;
	this.pitch = HX.MathX.clamp(this.pitch + axisY, -Math.PI*.5, Math.PI*.5);
};

FloatController.prototype.clone = function()
{
    var clone = new FloatController();
    clone.maxAcceleration = this.maxAcceleration;
    clone.maxSpeed = this.maxSpeed;
    clone.shiftMultiplier = this.shiftMultiplier;
    clone.pitch = this.pitch;
    clone.yaw = this.yaw;
    clone.friction = this.friction;
    return clone;
};