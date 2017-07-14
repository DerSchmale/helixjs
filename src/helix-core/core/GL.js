import { capabilities, ClearMask, Comparison, CullMode, StencilOp, META } from '../Helix.js';
import { Color } from '../core/Color.js';

// Just contains some convenience methods and GL management stuff that shouldn't be called directly
// Will become an abstraction layer
// properties to keep track of render state
var _numActiveAttributes = 0;

var _renderTarget = null;
var _renderTargetInvalid = true;

var _viewport = {x: 0, y: 0, width: 0, height: 0};
var _viewportInvalid = true;

var _depthMask = true;
var _depthMaskInvalid = true;

var _cullMode = null;
var _cullModeInvalid = true;

var _depthTest = null;
var _depthTestInvalid = true;

var _blendState = null;
var _blendStateInvalid = false;

// this is so that effects can push states on the stack
// the renderer at the root just pushes one single state and invalidates that constantly
var _stencilState = null;
var _stencilStateInvalid = false;

var _glStats =
    {
        numDrawCalls: 0,
        numTriangles: 0,
        numClears: 0
    };

var _clearGLStats = function ()
{
    _glStats.numDrawCalls = 0;
    _glStats.numTriangles = 0;
    _glStats.numClears = 0;
};

var gl = null;

function _updateRenderState()
{
    if (_renderTargetInvalid) {
        var target = _renderTarget;

        if (target) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target._fbo);

            if (target._numColorTextures > 1)
                capabilities.EXT_DRAW_BUFFERS.drawBuffersWEBGL(target._drawBuffers);
        }
        else
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        _renderTargetInvalid = false;
    }

    if (_viewportInvalid) {
        gl.viewport(_viewport.x, _viewport.y, _viewport.width, _viewport.height);
        _viewportInvalid = false;
    }

    if (_depthMaskInvalid) {
        gl.depthMask(_depthMask);
        _depthMaskInvalid = false;
    }

    if (_cullModeInvalid) {
        if (_cullMode === CullMode.NONE)
            gl.disable(gl.CULL_FACE);
        else {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(_cullMode);
        }
    }

    if (_depthTestInvalid) {
        if (_depthTest === Comparison.DISABLED)
            gl.disable(gl.DEPTH_TEST);
        else {
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(_depthTest);
        }
    }

    if (_blendStateInvalid) {
        var blendState = _blendState;
        if (!blendState || blendState.enabled === false)
            gl.disable(gl.BLEND);
        else {
            gl.enable(gl.BLEND);
            gl.blendFunc(blendState.srcFactor, blendState.dstFactor);
            gl.blendEquation(blendState.operator);
            var color = blendState.color;
            if (color)
                gl.blendColor(color.r, color.g, color.b, color.a);
        }
        _blendStateInvalid = false;
    }

    if (_stencilStateInvalid) {
        var stencilState = _stencilState;
        if (!stencilState || stencilState.enabled === false) {
            gl.disable(gl.STENCIL_TEST);
            gl.stencilFunc(Comparison.ALWAYS, 0, 0xff);
            gl.stencilOp(StencilOp.KEEP, StencilOp.KEEP, StencilOp.KEEP);
        }
        else {
            gl.enable(gl.STENCIL_TEST);
            gl.stencilFunc(stencilState.comparison, stencilState.reference, stencilState.readMask);
            gl.stencilOp(stencilState.onStencilFail, stencilState.onDepthFail, stencilState.onPass);
            gl.stencilMask(stencilState.writeMask);
        }
        _stencilStateInvalid = false;
    }
}

/**
 * GL forms a bridge to native WebGL. It's used to keep track of certain states. If the method is in here, use it instead of the raw gl calls.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var GL = {
    gl: null,

    _setGL: function (value)
    {
        GL.gl = gl = value;
    },

    /**
     * Clears the current render target.
     *
     * @param [clearMask] One of {@linkcode ClearMask}. If omitted, all planes will be cleared.
     */
    clear: function (clearMask)
    {
        if (clearMask === undefined)
            clearMask = ClearMask.COMPLETE;

        _updateRenderState();
        gl.clear(clearMask);
        ++_glStats.numClears;
    },

    /**
     * Draws elements for the current index buffer bound.
     * @param elementType One of {@linkcode ElementType}.
     * @param numIndices The amount of indices in the index buffer
     * @param offset The first index to start drawing from.
     */
    drawElements: function (elementType, numIndices, offset)
    {
        ++_glStats.numDrawCalls;
        _glStats.numTriangles += numIndices / 3;
        _updateRenderState();
        gl.drawElements(elementType, numIndices, gl.UNSIGNED_SHORT, offset * 2);
    },


    /**
     * Sets the viewport to render into.
     * @param {*} rect Any object with a width and height property, so it can be a {@linkcode Rect} or even a {linkcode FrameBuffer}. If x and y are present, it will use these too.
     */
    setViewport: function (rect)
    {
        _viewportInvalid = true;
        if (rect) {
            _viewport.x = rect.x || 0;
            _viewport.y = rect.y || 0;
            _viewport.width = rect.width || 0;
            _viewport.height = rect.height || 0;
        }
        else {
            _viewport.x = 0;
            _viewport.y = 0;
            _viewport.width = META.TARGET_CANVAS.width;
            _viewport.height = META.TARGET_CANVAS.height;
        }
    },

    /**
     * Gets the current render target.
     */
    getCurrentRenderTarget: function ()
    {
        return _renderTarget;
    },

    /**
     * Sets the current render target. It's recommended to clear afterwards for certain platforms.
     */
    setRenderTarget: function (frameBuffer)
    {
        _renderTarget = frameBuffer;
        _renderTargetInvalid = true;
        GL.setViewport(frameBuffer);
    },

    /**
     * Enables a given count of vertex attributes.
     */
    enableAttributes: function (count)
    {
        var numActiveAttribs = _numActiveAttributes;
        var i;

        if (numActiveAttribs < count) {
            for (i = numActiveAttribs; i < count; ++i)
                gl.enableVertexAttribArray(i);
        }
        else if (numActiveAttribs > count) {
            // bug in WebGL/ANGLE? When rendering to a render target, disabling vertex attrib array 1 causes errors when using only up to the index below o_O
            // so for now + 1
            count += 1;
            for (i = count; i < numActiveAttribs; ++i) {
                gl.disableVertexAttribArray(i);
            }
        }

        _numActiveAttributes = count;
    },

    /**
     * Sets the clear color.
     */
    setClearColor: function (color)
    {
        color = isNaN(color) ? color : new Color(color);
        gl.clearColor(color.r, color.g, color.b, color.a);
    },

    /**
     * Sets the cull mode.
     */
    setCullMode: function (value)
    {
        if (_cullMode === value) return;
        _cullMode = value;
        _cullModeInvalid = true;
    },

    /**
     * Sets the depth mask.
     */
    setDepthMask: function (value)
    {
        if (_depthMask === value) return;
        _depthMask = value;
        _depthMaskInvalid = true;
    },

    /**
     * Sets the depth test.
     */
    setDepthTest: function (value)
    {
        if (_depthTest === value) return;
        _depthTest = value;
        _depthTestInvalid = true;
    },

    /**
     * Sets the blend state.
     *
     * @see {@linkcode BlendState}
     */
    setBlendState: function (value)
    {
        if (_blendState === value) return;
        _blendState = value;
        _blendStateInvalid = true;
    },

    /**
     * Sets a new stencil reference value for the current stencil state. This prevents resetting an entire state.
     */
    updateStencilReferenceValue: function (value)
    {
        var currentState = _stencilState;

        if (!currentState || currentState.reference === value) return;

        currentState.reference = value;

        if (!_stencilStateInvalid && currentState.enabled)
            gl.stencilFunc(currentState.comparison, value, currentState.readMask);
    },

    /**
     * Sets a new stencil state.
     *
     * @see {@linkcode StencilState}
     */
    setStencilState: function (value)
    {
        _stencilState = value;
        _stencilStateInvalid = true;
    }
};

export { _glStats, _clearGLStats, GL };