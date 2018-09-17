function FPSController()
{
	HX.Component.call(this);

	this.walkAcceleration = 2.0;
	this.runAcceleration = 4.0;

	this.jumpForce = 1.0;
	this.pitch = 0.0;
	this.yaw = 0.0;

	// normally this would be defined externally and passed into the controllers
	this._input = new HX.Input();
	this._mouse = new HX.MouseLock();
	this._mouse.map(HX.MouseLock.MOVE_X, "lookX");
	this._mouse.map(HX.MouseLock.MOVE_Y, "lookY");
	this._mouse.sensitivityX = 3;
	this._mouse.sensitivityY = -3;
	this._keyboard = new HX.Keyboard();
	this._keyboard.map("ShiftLeft", "run");
	this._keyboard.map("Space", "jump");
	this._keyboard.mapAxis("KeyA", "KeyD", "moveX");
	this._keyboard.mapAxis("KeyS", "KeyW", "moveY");

    // also support the old keyboard API
    this._keyboard.map(16, "run");
    this._keyboard.map(32, "jump");
    this._keyboard.mapAxis(65, 68, "moveX");
    this._keyboard.mapAxis(83, 87, "moveY");
}

HX.Component.create(FPSController);

FPSController.prototype.onAdded = function(dt)
{
	this._input.enable(this._mouse);
	this._input.enable(this._keyboard);
	this._input.onAction.bind(this._onAction, this);
};

FPSController.prototype.onRemoved = function(dt)
{
	this._input.disable(this._mouse);
	this._input.disable(this._keyboard);
	this._input.onAction.unbind(this._onAction, this);
};

FPSController.prototype.onUpdate = function(dt)
{
	var x = new HX.Float2();
	var y = new HX.Float2();
	var p = new HX.Float4();

	return function(dt)
	{
		this._rigidBody = this._rigidBody || this.entity.getFirstComponentByType(HX_PHYS.RigidBody);
		this._updateLook();

		var moveX = this._input.getValue("moveX");
		var moveY = this._input.getValue("moveY");
		var matrix = this.entity.matrix;

		var m = matrix._m;
		x.set(m[0], m[1]);
		y.set(m[4], m[5]);
		x.normalize();
		y.normalize();

		var run = this._input.getValue("run");
		var acc = HX.MathX.lerp(this.walkAcceleration, this.runAcceleration, run);
		p.x = (moveX * x.x + moveY * y.x) * acc;
		p.y = (moveX * x.y + moveY * y.y) * acc;
		p.z = 0.0;

		this._rigidBody.addForce(p);
	}
}();

FPSController.prototype._onAction = function(name, value)
{
	var f = new HX.Float4();

	return function(name, value) {
		if (name !== "jump" || value === 0) return;
		f.z = this.jumpForce * value;
		this._rigidBody = this._rigidBody || this.entity.getFirstComponentByType(HX_PHYS.RigidBody);
		this._rigidBody.addImpulse(f);
	}
}();

FPSController.prototype._updateLook = function()
{
	var axisX = this._input.getValue("lookX");
	var axisY = this._input.getValue("lookY");
	this.yaw -= axisX;
	var extr = Math.PI * .5 - 0.001;
	this.pitch = HX.MathX.clamp(this.pitch - axisY, -extr, extr);
	this.entity.rotation.fromPitchYawRoll(this.pitch, this.yaw, 0.0);
};

FPSController.prototype.clone = function()
{
	var clone = new FPSController();
	clone.walkForce = this.walkForce;
	clone.runForce = this.runForce;
	clone.jumpForce = this.jumpForce;
	clone.pitch = this.pitch;
	clone.yaw = this.yaw;
	return clone;
};