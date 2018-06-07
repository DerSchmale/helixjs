function SubShape(shape, offset, orientation)
{
	this.shape = shape;
	this.offset = offset || new HX.Float4();
	this.orientation = orientation;
}

function CompoundShape()
{
	this._shapes = [];
}

CompoundShape.prototype = {
	get shapes() { return this._shapes; },

	addShape: function(shape, offset, orientation)
	{
		this._shapes.push(new SubShape(shape, offset, orientation));
	}
};

export {CompoundShape, SubShape};