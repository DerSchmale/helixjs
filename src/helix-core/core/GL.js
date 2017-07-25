import { capabilities, ClearMask, Comparison, CullMode, StencilOp, META } from '../Helix.js';
import { Color } from '../core/Color.js';

// Just contains some convenience methods and GL management stuff that shouldn't be called directly
// Will become an abstraction layer
// properties to keep track of render state
var _numActiveAttributes = 0;
var _depthMask = true;
var _colorMask = true;
var _cullMode = null;
var _invertCullMode = false;
var _depthTest = null;
var _blendState = null;
var _renderTarget = null;

// this is so that effects can push states on the stack
// the renderer at the root just pushes one single state and invalidates that constantly
var _stencilState = null;

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

        gl.clear(clearMask);
        ++_glStats.numClears;
    },

    /**
     * Draws elements for the current index buffer bound.
     * @param elementType One of {@linkcode ElementType}.
     * @param numIndices The amount of indices in the index buffer
     * @param offset The first index to start drawing from.
     * @param [indexType] The data type of the index buffer/
     */
    drawElements: function (elementType, numIndices, offset, indexType)
    {
        indexType = indexType || gl.UNSIGNED_SHORT;
        ++_glStats.numDrawCalls;
        _glStats.numTriangles += numIndices / 3;
        gl.drawElements(elementType, numIndices, indexType, offset * 2);
    },


    /**
     * Sets the viewport to render into.
     * @param {*} rect Any object with a width and height property, so it can be a {@linkcode Rect} or even a {linkcode FrameBuffer}. If x and y are present, it will use these too.
     */
    setViewport: function (rect)
    {
        if (rect)
            gl.viewport(rect.x || 0, rect.y || 0, rect.width, rect.height);
        else
            gl.viewport(0, 0, META.TARGET_CANVAS.width, META.TARGET_CANVAS.height);
    },

    /**
     * Gets the current render target.
     */
    getCurrentRenderTarget: function ()
    {
        return _renderTarget;
    },

    /**
     * Specifies whether or not to write color. Uses all channels for efficiency (and the current lack of need for
     * anything else).
     */
    setColorMask: function(value)
    {
        if (value === _colorMask) return;
        _colorMask = value;
        gl.colorMask(value, value, value, value);
    },

    /**
     * Sets the current render target. It's recommended to clear afterwards for certain platforms.
     */
    setRenderTarget: function (frameBuffer)
    {
        _renderTarget = frameBuffer;

        var target = _renderTarget;

        if (target) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target._fbo);

            if (target._numColorTextures > 1)
                capabilities.EXT_DRAW_BUFFERS.drawBuffersWEBGL(target._drawBuffers);
        }
        else
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

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

        if (value === CullMode.NONE)
            gl.disable(gl.CULL_FACE);
        else {
            // was disabled before
            if (_cullMode === CullMode.NONE)
                gl.enable(gl.CULL_FACE);

            var cullMode = value;

            if (_invertCullMode) {
                if (cullMode === CullMode.BACK)
                    cullMode = CullMode.FRONT;
                else if (cullMode === CullMode.FRONT)
                    cullMode = CullMode.BACK;
            }

            gl.cullFace(cullMode);
        }

        _cullMode = value;
    },

    setInvertCulling: function(value)
    {
        if (_invertCullMode === value) return;
        _invertCullMode = value;

        // just make sure it gets assigned next time
        _cullMode = CullMode.NONE;
    },

    /**
     * Sets the depth mask.
     */
    setDepthMask: function (value)
    {
        if (_depthMask === value) return;
        _depthMask = value;
        gl.depthMask(_depthMask);
    },

    /**
     * Sets the depth test.
     */
    setDepthTest: function (value)
    {
        if (_depthTest === value) return;
        _depthTest = value;

        if (_depthTest === Comparison.DISABLED)
            gl.disable(gl.DEPTH_TEST);
        else {
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(_depthTest);
        }
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
    },

    /**
     * Sets a new stencil reference value for the current stencil state. This prevents resetting an entire state.
     */
    updateStencilReferenceValue: function (value)
    {
        var currentState = _stencilState;

        if (!currentState || currentState.reference === value) return;

        currentState.reference = value;

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
    },

    /**
     * Just inlined to reduce function calls in the render loop
     *
     * @ignore
     */
    setMaterialPassState: function(cullMode, depthTest, depthMask, colorMask, blendState)
    {
        if (_cullMode !== cullMode) {
            if (cullMode === CullMode.NONE)
                gl.disable(gl.CULL_FACE);
            else {
                // was disabled before
                if (_cullMode === CullMode.NONE)
                    gl.enable(gl.CULL_FACE);

                var cullModeEff = cullMode;

                if (_invertCullMode) {
                    if (cullModeEff === CullMode.BACK)
                        cullModeEff = CullMode.FRONT;
                    else if (cullModeEff === CullMode.FRONT)
                        cullModeEff = CullMode.BACK;
                }

                gl.cullFace(cullModeEff);
            }

            _cullMode = cullMode;
        }

        if (_depthTest !== depthTest) {
            _depthTest = depthTest;

            if (_depthTest === Comparison.DISABLED)
                gl.disable(gl.DEPTH_TEST);
            else {
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(_depthTest);
            }
        }

        if (_depthMask !== depthMask) {
            _depthMask = depthMask;
            gl.depthMask(_depthMask);
        }

        if (colorMask !== _colorMask) {
            _colorMask = colorMask;
            gl.colorMask(colorMask, colorMask, colorMask, colorMask);
        }

        if (_blendState !== blendState) {
            _blendState = blendState;

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
        }
    }
};

export { _glStats, _clearGLStats, GL };