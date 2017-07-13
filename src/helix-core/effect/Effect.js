import {GL} from "../core/GL";
import {Component} from "../entity/Component";


/**
 *
 * @constructor
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
        needsNormalDepth: {
            get: function() { return this._needsNormalDepth; },
            set: function(value) { this._needsNormalDepth = value; }
        },

        hdrTarget: {
            get: function() { return this._renderer._hdrFront.fbo; }
        },

        hdrSource: {
            get: function() { return this._renderer._hdrBack.texture; }
        }
    }
);

Effect.prototype.isSupported = function()
{
    return this._isSupported;
};

Effect.prototype.render = function(renderer, dt)
{
    this._renderer = renderer;
    this.draw(dt);
};

Effect.prototype.draw = function(dt)
{
    throw new Error("Abstract method error!");
};

Effect.prototype._drawPass = function(pass)
{
    pass.updateRenderState(this._renderer);
    GL.drawElements(GL.gl.TRIANGLES, 6, 0);
};

Effect.prototype.onAdded = function()
{
    this._entity._registerEffect(this);
};

Effect.prototype.onRemoved = function()
{
    this._entity._unregisterEffect(this);
};

/**
 * Used when we need to current render target as a source.
 */
Effect.prototype._swapHDRFrontAndBack = function()
{
    this._renderer._swapHDRFrontAndBack();
};

export { Effect };