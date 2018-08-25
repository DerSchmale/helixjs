import * as HX from "helix";
import * as CANNON from "cannon";
import {CompoundShape} from "./CompoundShape";

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Collider()
{
    // these can optionally be set by subclasses
    // center is the local object space center of mass (ie: an offset of the entity's origin). When allowed to auto-calculate, it uses the bounding box center
    // orientation allows
    this._center = null;
    this._orientation = null;
}

Collider.prototype = {

    /**
     * @ignore
     */
    createRigidBody: function(bounds)
    {
        if (!this._center)
            this._center = bounds.center;

        var shape = this.createShape(bounds);
        var body = new CANNON.Body({
            mass: 50 * this.volume()
        });

        if (shape instanceof CompoundShape) {
            var shapes = shape.shapes;
            for (var i = 0; i < shapes.length; ++i) {
                var subShape = shapes[i];
                var c = HX.Float4.add(this._center, subShape.offset);
                var q = undefined;
                if (this._orientation) {
                    q = this._orientation.clone();
                }
                if (subShape.orientation) {
                    if (q)
                        q.append(subShape.orientation);
                    else
                        q = subShape.orientation.clone();
                }

			    body.addShape(subShape.shape, c, q);
			}
        }
        else
            body.addShape(shape, this._center, this._orientation);

        return body;
    },

	/**
	 * @ignore
     */
    createShape: function(bounds)
    {
        throw new Error("Abstract method called!");
    },

    /**
     * @ignore
     */
    volume: function()
    {
        throw new Error("Abstract method called!");
    }

};

export {Collider};