function ChickenController()
{
	HX.Component.call(this);

	this._input = new HX.Input();
	this._keyboard = new HX.Keyboard();
	this._keyboard.map("Space", "startle");
	this._keyboard.map(32, "startle");
}

HX.Component.create(ChickenController);

ChickenController.prototype.onAdded = function()
{
	this._input.enable(this._keyboard);
	this._input.onAction.bind(this._onAction, this);
	this._animation = this.entity.getFirstComponentByType(HX.SkeletonAnimation);
	this._animation.animationNode.fadeTo("Idle", 0);
};

ChickenController.prototype.onRemoved = function()
{
	this._input.disable(this._keyboard);
	this._input.onAction.unbind(this._onAction);
};

ChickenController.prototype._onAction = function(name, value)
{
	if (name === "startle" && value) {
		this._animation.animationNode.fadeTo("Flap", 100.0, false, false);
	}
};