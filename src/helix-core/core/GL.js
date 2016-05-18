// Just contains some convenience methods and GL management stuff that shouldn't be called directly

// Will become an abstraction layer

// properties to keep track of render state
HX._numActiveAttributes = 0;

HX._renderTargetStack = [ null ];
HX._renderTargetInvalid = true;

HX._viewport = {x: 0, y: 0, width: 0, height: 0};
HX._viewportInvalid = true;

HX._depthMask = true;
HX._depthMaskInvalid = true;

HX._cullMode = null;
HX._cullModeInvalid = true;

HX._depthTest = null;
HX._depthTestInvalid = true;

HX._blendState = null;
HX._blendStateInvalid = false;

// this is so that effects can push states on the stack
// the renderer at the root just pushes one single state and invalidates that constantly
HX._stencilStateStack = [ null ];
HX._stencilStateInvalid = false;

HX._glStats =
{
    numDrawCalls: 0,
    numTriangles: 0,
    numClears: 0
};

HX._clearGLStats = function()
{
    HX._glStats.numDrawCalls = 0;
    HX._glStats.numTriangles = 0;
    HX._glStats.numClears = 0;
};

/**
 * Default clearing function. Can be called if no special clearing functionality is needed (or in case another api is used that clears)
 * Otherwise, you can manually clear using GL context.
 */
HX.clear = function(clearMask)
{
    HX._updateRenderState();

    if (clearMask === undefined)
        clearMask = HX.COMPLETE_CLEAR_MASK;

    HX_GL.clear(clearMask);
    ++HX._glStats.numClears;
};

HX.drawElements = function(elementType, numIndices, offset)
{
    ++HX._glStats.numDrawCalls;
    HX._glStats.numTriangles += numIndices / 3;
    HX._updateRenderState();
    HX_GL.drawElements(elementType, numIndices, HX_GL.UNSIGNED_SHORT, offset * 2);
};


/**
 *
 * @param rect Any object with a width and height property, so it can be a Rect or even an FBO. If x and y are present, it will use these too.
 */
HX.setViewport = function(rect)
{
    HX._viewportInvalid = true;
    if (rect) {
        HX._viewport.x = rect.x || 0;
        HX._viewport.y = rect.y || 0;
        HX._viewport.width = rect.width || 0;
        HX._viewport.height = rect.height || 0;
    }
    else {
        HX._viewport.x = 0;
        HX._viewport.y = 0;
        HX._viewport.width = HX.TARGET_CANVAS.width;
        HX._viewport.height = HX.TARGET_CANVAS.height;
    }
};

HX.getCurrentRenderTarget = function()
{
    return HX._renderTargetStack[HX._renderTargetStack.length - 1];
};

HX.pushRenderTarget = function(frameBuffer)
{
    HX._renderTargetStack.push(frameBuffer);
    HX._renderTargetInvalid = true;
    HX.setViewport(frameBuffer);
};

HX.popRenderTarget = function()
{
    HX._renderTargetStack.pop();
    HX._renderTargetInvalid = true;
    HX.setViewport(HX._renderTargetStack[HX._renderTargetStack.length - 1]);
};

HX.enableAttributes = function(count)
{
    var numActiveAttribs = HX._numActiveAttributes;
    if (numActiveAttribs < count) {
        for (var i = numActiveAttribs; i < count; ++i)
            HX_GL.enableVertexAttribArray(i);
    }
    else if (numActiveAttribs > count) {
        // bug in WebGL/ANGLE? When rendering to a render target, disabling vertex attrib array 1 causes errors when using only up to the index below o_O
        // so for now + 1
        count += 1;
        for (var i = count; i < numActiveAttribs; ++i) {
            HX_GL.disableVertexAttribArray(i);
        }
    }

    HX._numActiveAttributes = 2;
};

HX.setClearColor = function(color)
{
    color = isNaN(color) ? color : new HX.Color(color);
    HX_GL.clearColor(color.r, color.g, color.b, color.a);
};

HX.setCullMode = function(value)
{
    if (HX._cullMode === value) return;
    HX._cullMode = value;
    HX._cullModeInvalid = true;
};

HX.setDepthMask = function(value)
{
    if (HX._depthMask === value) return;
    HX._depthMask = value;
    HX._depthMaskInvalid = true;
};

HX.setDepthTest = function(value)
{
    if (HX._depthTest === value) return;
    HX._depthTest = value;
    HX._depthTestInvalid = true;
};

HX.setBlendState = function(value)
{
    if (HX._blendState === value) return;
    HX._blendState = value;
    HX._blendStateInvalid = true;
};

HX.updateStencilReferenceValue = function(value)
{
    var currentState = HX._stencilStateStack[HX._stencilStateStack.length - 1];

    if (!currentState || currentState.reference === value) return;

    currentState.reference = value;

    if (!HX._stencilStateInvalid && currentState.enabled)
        HX_GL.stencilFunc(currentState.comparison, value, currentState.readMask);
};

HX.pushStencilState = function(frameBuffer)
{
    HX._stencilStateStack.push(frameBuffer);
    HX._stencilStateInvalid = true;
};

HX.popStencilState = function()
{
    HX._stencilStateStack.pop();
    HX._stencilStateInvalid = true;
};

HX._updateRenderState = function()
{
    if (HX._renderTargetInvalid) {
        var target = HX._renderTargetStack[HX._renderTargetStack.length - 1];

        if (target) {
            HX_GL.bindFramebuffer(HX_GL.FRAMEBUFFER, target._fbo);

            if (target._numColorTextures > 1)
                HX.EXT_DRAW_BUFFERS.drawBuffersWEBGL(target._drawBuffers);
        }
        else
            HX_GL.bindFramebuffer(HX_GL.FRAMEBUFFER, null);

        HX._renderTargetInvalid = false;
    }

    if (HX._depthMaskInvalid) {
        HX_GL.depthMask(HX._depthMask);
        HX._depthMaskInvalid = false;
    }


    if (this._viewportInvalid) {
        HX_GL.viewport(HX._viewport.x, HX._viewport.y, HX._viewport.width, HX._viewport.height);
        HX._viewportInvalid = false;
    }

    if (HX._cullModeInvalid) {
        if (HX._cullMode === HX.CullMode.NONE)
            HX_GL.disable(HX_GL.CULL_FACE);
        else {
            HX_GL.enable(HX_GL.CULL_FACE);
            HX_GL.cullFace(HX._cullMode);
        }
    }

    if (HX._depthTestInvalid) {
        if (HX._depthTest === HX.Comparison.DISABLED)
            HX_GL.disable(HX_GL.DEPTH_TEST);
        else {
            HX_GL.enable(HX_GL.DEPTH_TEST);
            HX_GL.depthFunc(HX._depthTest);
        }
    }

    if (HX._blendStateInvalid) {
        var state = HX._blendState;
        if (state === null || state === undefined || state.enabled === false)
            HX_GL.disable(HX_GL.BLEND);
        else {
            HX_GL.enable(HX_GL.BLEND);
            HX_GL.blendFunc(state.srcFactor, state.dstFactor);
            HX_GL.blendEquation(state.operator);
            var color = state.color;
            if (color)
                HX_GL.blendColor(color.r, color.g, color.b, color.a);
        }
        HX._blendStateInvalid = false;
    }

    if (HX._stencilStateInvalid) {
        var state = HX._stencilStateStack[HX._stencilStateStack.length - 1];
        if (state == null || state.enabled === false) {
            HX_GL.disable(HX_GL.STENCIL_TEST);
            HX_GL.stencilFunc(HX.Comparison.ALWAYS, 0, 0xff);
            HX_GL.stencilOp(HX.StencilOp.KEEP, HX.StencilOp.KEEP, HX.StencilOp.KEEP);
        }
        else {
            HX_GL.enable(HX_GL.STENCIL_TEST);
            HX_GL.stencilFunc(state.comparison, state.reference, state.readMask);
            HX_GL.stencilOp(state.onStencilFail, state.onDepthFail, state.onPass);
            HX_GL.stencilMask(state.writeMask);
        }
        HX._stencilStateInvalid = false;
    }
};