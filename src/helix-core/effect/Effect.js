import {GL} from "../core/GL";
import {Component} from "../entity/Component";


/**
 * @classdesc
 * Effect is a {@linkcode Component} that will be picked up by the renderer for post-processing. Most effects are added
 * to the Camera, but some could be tied to a different Entity (for example: a DirectionalLight for crepuscular rays)
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Effect()
{
    Component.call(this);
    this._isSupported = true;
    this._mesh = null;
    this._outputsGamma = false;
    this._needsNormalDepth = false;
}

Effect.prototype = Object.create(Component.prototype,
    {
        /**
         * Defines whether this Effect needs normal/depth information from the renderer.
         */
        needsNormalDepth: {
            get: function() { return this._needsNormalDepth; },
            set: function(value) { this._needsNormalDepth = value; }
        },

        /**
         * The current full-resolution render target.
         */
        hdrTarget: {
            get: function() { return this._renderer._hdrFront.fbo; }
        },

        /**
         * The current full-resolution source texture.
         */
        hdrSource: {
            get: function() { return this._renderer._hdrBack.texture; }
        }
    }
);

/**
 * Returns whether this Effect is supported considering the current capabilities.
 */
Effect.prototype.isSupported = function()
{
    return this._isSupported;
};

/**
 * @ignore
 */
Effect.prototype.render = function(renderer, dt)
{
    this._renderer = renderer;
    this.draw(dt);
};

/**
 * This method needs to be implemented by child classes.
 */
Effect.prototype.draw = function(dt)
{
    throw new Error("Abstract method error!");
};

/**
 * @ignore
 */
Effect.prototype._drawPass = function(pass)
{
    pass.updateRenderState(this._renderer);
    GL.drawElements(GL.gl.TRIANGLES, 6, 0);
};

/**
 * @ignore
 */
Effect.prototype.onAdded = function()
{
    this._entity._registerEffect(this);
};

/**
 * @ignore
 */
Effect.prototype.onRemoved = function()
{
    this._entity._unregisterEffect(this);
};

/**
 * Child classes need to call this when rendering to and from full-resolution textures.
 */
Effect.prototype._swapHDRFrontAndBack = function()
{
    this._renderer._swapHDRFrontAndBack();
};

export { Effect };