import * as CANNON from "cannon";

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