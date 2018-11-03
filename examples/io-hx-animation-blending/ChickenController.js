function ChickenController()
{
	HX.Component.call(this);

	this._input = new HX.Input();
	this._mouse = new HX.Mouse();
	this._touch = new HX.Touch();
	this._mouse.map(HX.Mouse.BUTTON_LEFT, "startle");
	this._touch.map(HX.Touch.TAP, "startle");
}

ChickenController.prototype = Object.create(HX.Component.prototype);

ChickenController.prototype.onAdded = function()
{
	this._input.enable(this._mouse);
	this._input.enable(this._touch);
	this._input.onAction.bind(this._onAction, this);
	this._animation = this.entity.getFirstComponentByType(HX.SkeletonAnimation);
	this._animation.animationNode.fadeTo("Idle", 0);
};

ChickenController.prototype.onRemoved = function()
{
	this._input.disable(this._mouse);
	this._input.disable(this._touch);
	this._input.onAction.unbind(this._onAction);
};

ChickenController.prototype._onAction = function(name, value)
{
	if (name === "startle" && value) {
		this._animation.animationNode.fadeTo("Flap", 100.0, false, false);
	}
};

HX.Component.register("chickenController", ChickenController);