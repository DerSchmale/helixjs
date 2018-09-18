import * as HX from "helix";

function SubShape(shape, offset, orientation)
{
	this.shape = shape;
	this.offset = offset || new HX.Float4();
	this.orientation = orientation;
}


/**
 * @classdesc
 * Compound shape allows combining multiple shapes into a single shape.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
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