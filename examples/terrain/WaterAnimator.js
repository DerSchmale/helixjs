function WaterAnimator(camera)
{
	HX.Component.call(this);
	this._material = null;
	this._time = 0;
	this._camera = camera;
}

WaterAnimator.prototype = Object.create(HX.Component.prototype);

WaterAnimator.prototype.onAdded = function()
{
	var meshInstance = this.entity.getFirstComponentByType(HX.MeshInstance);
	this._material = meshInstance.material;
};

WaterAnimator.prototype.onUpdate = function(dt)
{
	this._time += dt;
	var time = this._time;
	this._material.setUniform("normalOffset1", [ -time * 0.0004, -time * 0.0005 ]);
	this._material.setUniform("normalOffset2", [ time * 0.0001, time * 0.0002 ]);

	this.entity.position.x = this._camera.position.x;
	this.entity.position.y = this._camera.position.y;
};

WaterAnimator.prototype.clone = function()
{
	return new WaterAnimator(this._camera);
};

HX.Component.register("waterAnimator", WaterAnimator);