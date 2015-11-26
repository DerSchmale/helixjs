// Just contains some convenience methods and GL management stuff that shouldn't be called directly

// Will become an abstraction layer

// properties to keep track of render state
HX._numActiveAttributes = 0;
HX._numActiveTextures = 0;

HX._renderTargetStack = [ null ];
HX._renderTargetInvalid = true;

HX._viewport = {x: 0, y: 0, width: 0, height: 0};
HX._viewportInvalid = true;

HX._cullMode = null;
HX._cullModeInvalid = false;

HX._blendState = null;
HX._blendStateInvalid = false;


/**
 * Default clearing function. Can be called if no special clearing functionality is needed (or in case another api is used that clears)
 * Otherwise, you can manually clear using GL context.
 */
HX.clear = function(clearMask)
{
    if (clearMask === undefined)
        clearMask = HX.GL.COLOR_BUFFER_BIT | HX.GL.DEPTH_BUFFER_BIT | HX.GL.STENCIL_BUFFER_BIT;

    HX._updateRenderState();
    HX.GL.clear(clearMask);
};

HX.drawElements = function(elementType, numIndices, offset)
{
    HX._updateRenderState();
    HX.GL.drawElements(elementType, numIndices, HX.GL.UNSIGNED_SHORT, offset);
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
        HX._viewport.width = HX.TARGET_CANVAS.clientWidth;
        HX._viewport.height = HX.TARGET_CANVAS.clientHeight;
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
            HX.GL.enableVertexAttribArray(i);
    }
    else if (numActiveAttribs > count) {
        // bug in WebGL/ANGLE? When rendering to a render target, disabling vertex attrib array 1 causes errors when using only up to the index below o_O
        // so for now + 1
        count += 1;
        for (var i = count; i < numActiveAttribs; ++i) {
            HX.GL.disableVertexAttribArray(i);
        }
    }

    HX._numActiveAttributes = 2;
};

HX.setClearColor = function(color)
{
    color = isNaN(color) ? color : new HX.Color(color);
    HX.GL.clearColor(color.r, color.g, color.b, color.a);
};

HX.setCullMode = function(value)
{
    if (HX._cullMode === value) return;
    HX._cullMode = value;
    HX._cullModeInvalid = true;
};

HX.setBlendState = function(value)
{
    if (HX._blendState === value) return;
    HX._blendState = value;
    HX._blendStateInvalid = true;
};

HX._updateRenderState = function()
{
    if (this._renderTargetInvalid) {
        var target = HX._renderTargetStack[HX._renderTargetStack.length - 1];

        if (target) {
            HX.GL.bindFramebuffer(HX.GL.FRAMEBUFFER, target._fbo);

            if (target._numColorTextures > 1)
                HX.EXT_DRAW_BUFFERS.drawBuffersWEBGL(target._drawBuffers);
        }
        else
            HX.GL.bindFramebuffer(HX.GL.FRAMEBUFFER, null);

        HX._renderTargetInvalid = false;
    }

    if (this._viewportInvalid) {
        HX.GL.viewport(HX._viewport.x, HX._viewport.y, HX._viewport.width, HX._viewport.height);
        HX._viewportInvalid = false;
    }

    if (HX._cullModeInvalid) {
        if (HX._cullMode === HX.CullMode.NONE)
            HX.GL.disable(HX.GL.CULL_FACE);
        else {
            HX.GL.enable(HX.GL.CULL_FACE);
            HX.GL.cullFace(HX._cullMode);
        }
    }

    if (HX._blendStateInvalid) {
        var state = HX._blendState;
        if (state == null || state.enabled === false)
            HX.GL.disable(HX.GL.BLEND);
        else {
            HX.GL.enable(HX.GL.BLEND);
            HX.GL.blendFunc(state.srcFactor, state.dstFactor);
            HX.GL.blendEquation(state.operator);
            var color = state.color;
            if (color)
                HX.GL.blendColor(color.r, color.g, color.b, color.a);
        }
        HX._blendStateInvalid = false;
    }
};
