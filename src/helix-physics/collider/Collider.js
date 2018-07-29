import * as CANNON from "cannon";
import {CompoundShape} from "./CompoundShape";

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Collider()
{
    // these can be set by subclasses
    this._center = null;
    this._orientation = null;
    this._positionOffset = null;
}

Collider.prototype = {

    /**
     * @ignore
     */
    createRigidBody: function(sceneBounds)
    {
        var shape = this.createShape(sceneBounds);
        var body = new CANNON.Body({
            mass: 50 * this.volume()
        });

        if (!this._center) this._center = sceneBounds.center;

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
    createShape: function(sceneBounds)
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