function BounceComponent(bounds)
{
	HX.Component.call(this);
	this._velocity = new HX.Float4(1, 2, 1.5);
	this._bounds = bounds;
	this._min = null;
	this._max = null;
}

HX.Component.create(BounceComponent);

BounceComponent.prototype.onAdded = function()
{
	var bounds = this.entity.getFirstComponentByType(HX.MeshInstance).bounds;
	this._min = this._bounds.minimum;
	this._max = this._bounds.maximum;
	this._min.add(bounds.halfExtent);
	this._max.subtract(bounds.halfExtent);
	this._audio = this.entity.getFirstComponentByType(HX.AudioEmitter);
};

BounceComponent.prototype.onUpdate = function(dt)
{
	var pos = this.entity.position;
	pos.addScaled(this._velocity, dt / 1000);

	var hit = false;
	hit |= checkBound("x", pos, this._velocity, this._min, this._max);
	hit |= checkBound("y", pos, this._velocity, this._min, this._max);
	hit |= checkBound("z", pos, this._velocity, this._min, this._max);

	if (hit) this._audio.play();
};

function checkBound(comp, pos, vel, min, max)
{
	if (vel[comp] > 0 && pos[comp] > max[comp]) {
		var diff = max[comp] - pos[comp];
		pos[comp] += 2.0 * diff;
		vel[comp] = -vel[comp];
		return true;
	}
	else if (vel[comp] < 0 && pos[comp] < min[comp]) {
		diff = min[comp] - pos[comp];
		pos[comp] -= 2.0 * diff;
		vel[comp] = -vel[comp];
		return true;
	}
	return false;
}