import { capabilities, ClearMask, Comparison, CullMode, StencilOp, META } from '../Helix.js';
import { Color } from '../core/Color.js';
import {ProgramCache} from "../shader/ProgramCache";

// Just contains some convenience methods and GL management stuff that shouldn't be called directly
// Will become an abstraction layer
// properties to keep track of render state
var _numActiveAttributes = 0;
var _depthMask = true;
var _colorMask = true;
var _lockColorMask = false;
var _cullMode = null;
var _invertCullMode = false;
var _depthTest = null;
var _blendState = null;
var _renderTarget = null;
var _shader = null;
var _instanceDivisors = [];

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

	vertexAttribDivisor: function(index, divisor)
	{
		if (capabilities.WEBGL_2)
			gl.vertexAttribDivisor(index, divisor);
		else
			capabilities.EXT_INSTANCED_ARRAYS.vertexAttribDivisorANGLE(index, divisor);

		_instanceDivisors[index] = divisor;
	},

    /**
     * Draws elements for the current index buffer bound.
     * @param elementType One of {@linkcode ElementType}.
     * @param numIndices The amount of indices in the index buffer
     * @param [indexType] The data type of the index buffer.
     * @param [offset] The first index to start drawing from.
     */
    drawElements: function (elementType, numIndices, indexType, offset)
    {
        indexType = indexType || gl.UNSIGNED_SHORT;
        ++_glStats.numDrawCalls;
        gl.drawElements(elementType, numIndices, indexType, (offset || 0) << 1);
    },

    /**
     * Draws multiple instances for the current index buffer bound.
     * @param elementType One of {@linkcode ElementType}.
     * @param numIndices The amount of indices in the index buffer
     * @param offset The first index to start drawing from.
     * @param indexType The data type of the index buffer.
     * @param numInstances The amount of instances to draw
     */
    drawElementsInstanced: function (elementType, numIndices, indexType, offset, numInstances)
    {
        if (numInstances === 0) return;
        indexType = indexType || gl.UNSIGNED_SHORT;
        ++_glStats.numDrawCalls;
        if (capabilities.WEBGL_2)
            gl.drawElementsInstanced(elementType, numIndices, indexType, (offset || 0) << 1, numInstances);
        else
		    capabilities.EXT_INSTANCED_ARRAYS.drawElementsInstancedANGLE(elementType, numIndices, indexType, (offset || 0) << 1, numInstances);
    },

    setShader: function(shader)
    {
        if (_shader === shader) return;

		GL.gl.useProgram(shader.program);

		if (!shader._cachedProgram.isCached)
			shader._cachedProgram = ProgramCache.resolveLost(shader._cachedProgram);

		// let the cache know that we're still using the program in this frame
		shader._cachedProgram.frameMark = META.CURRENT_FRAME_MARK;

		GL.enableAttributes(shader._numAttributes, shader._attributeFlags);
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
        if (_lockColorMask || value === _colorMask) return;
        _colorMask = value;
        gl.colorMask(value, value, value, value);
    },

    /**
     * Specifies any calls to setColorMask or states defined by material will have no effect until the first call to unlockColorMask
     */
    lockColorMask: function(state)
    {
        if (state !== undefined) {
            GL.setColorMask(state);
        }
        _lockColorMask = true;
    },

    /**
     * Specifies any calls to setColorMask or states defined by material will be applied.
     */
    unlockColorMask: function(state)
    {
        if (state !== undefined) {
            GL.setColorMask(state);
        }
        _lockColorMask = false;
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

            if (target._numColorTextures > 1) {
                if (capabilities.WEBGL_2)
                    gl.drawBuffers(target._drawBuffers);
                else
                    capabilities.EXT_DRAW_BUFFERS.drawBuffersWEBGL(target._drawBuffers);
			}
        }
        else
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        GL.setViewport(frameBuffer);
    },

    /**
     * Enables a given count of vertex attributes.
     */
    enableAttributes: function (count, flags)
    {
        var numActiveAttribs = _numActiveAttributes;

		for (var i = 0; i < count; ++i) {
		    // clear instanced settings
		    if (_instanceDivisors[i])
				GL.vertexAttribDivisor(i, 0);

            if (flags & (1 << i))
                gl.enableVertexAttribArray(i);
            else
                gl.disableVertexAttribArray(i);
        }

        if (numActiveAttribs > count) {
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
        color = color instanceof Color ? color : new Color(color);
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

            if (blendState.alphaSrcFactor === null || blendState.alphaSrcFactor === undefined)
                gl.blendFunc(blendState.srcFactor, blendState.dstFactor);
            else
                gl.blendFuncSeparate(blendState.srcFactor, blendState.dstFactor, blendState.alphaSrcFactor, blendState.alphaDstFactor);

            if (blendState.alphaOperator === null || blendState.alphaOperator === undefined)
                gl.blendEquation(blendState.operator);
            else
                gl.blendEquationSeparate(blendState.operator, blendState.alphaOperator);

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

        if (!_lockColorMask && colorMask !== _colorMask) {
            _colorMask = colorMask;
            gl.colorMask(colorMask, colorMask, colorMask, colorMask);
        }

        if (_blendState !== blendState) {
            _blendState = blendState;

            if (!blendState || blendState.enabled === false)
                gl.disable(gl.BLEND);
            else {
                gl.enable(gl.BLEND);
                if (blendState.alphaSrcFactor === null || blendState.alphaSrcFactor === undefined)
                    gl.blendFunc(blendState.srcFactor, blendState.dstFactor);
                else 
                    gl.blendFuncSeparate(blendState.srcFactor, blendState.dstFactor, blendState.alphaSrcFactor, blendState.alphaDstFactor);

                if (blendState.alphaOperator === null || blendState.alphaOperator === undefined)
                    gl.blendEquation(blendState.operator);
                else
                    gl.blendEquationSeparate(blendState.operator, blendState.alphaOperator);

                var color = blendState.color;
                if (color)
                    gl.blendColor(color.r, color.g, color.b, color.a);
            }
        }
    }
};

export { _glStats, _clearGLStats, GL };