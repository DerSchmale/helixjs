// Just contains some convenience methods and GL management stuff that shouldn't be called directly

// Will become an abstraction layer

/**
 * Default clearing function. Can be called if no special clearing functionality is needed (or in case another api is used that clears)
 * Otherwise, you can manually clear using GL context.
 */
HX.clear = function()
{
    HX.GL.clear(HX.GL.COLOR_BUFFER_BIT | HX.GL.DEPTH_BUFFER_BIT | HX.GL.STENCIL_BUFFER_BIT);
};

HX.unbindTextures = function()
{
    for (var i = 0; i < HX._numActiveTextures; ++i) {
        HX.GL.activeTexture(HX.GL.TEXTURE0 + i);
        HX.GL.bindTexture(HX.GL.TEXTURE_2D, null);
    }

    HX._numActiveTextures = 0;
};


HX._renderTargetStack = [];

HX._setRenderTarget = function(frameBuffer)
{
    if (frameBuffer) {
        HX.GL.bindFramebuffer(HX.GL.FRAMEBUFFER, frameBuffer._fbo);

        if (frameBuffer._numColorTextures > 1)
            HX.EXT_DRAW_BUFFERS.drawBuffersWEBGL(frameBuffer._drawBuffers);
    }
    else
        HX.GL.bindFramebuffer(HX.GL.FRAMEBUFFER, null);
};

// best not to use this except in Effects when rendering to a ping-ponged version, after popping any pushed ones
// so only usable between two equal levels (pingpong siblings)
HX.swapRenderTarget = function(frameBuffer)
{
    HX._renderTargetStack[HX._renderTargetStack.length - 1] = frameBuffer;
    HX._setRenderTarget(frameBuffer);
};

HX.getCurrentRenderTarget = function()
{
    return HX._renderTargetStack[HX._renderTargetStack.length - 1];
};

HX.pushRenderTarget = function(frameBuffer)
{
    HX._renderTargetStack.push(frameBuffer);
    HX._setRenderTarget(frameBuffer);
};

HX.popRenderTarget = function()
{
    HX._renderTargetStack.pop();
    HX._setRenderTarget(HX._renderTargetStack[HX._renderTargetStack.length - 1]);
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
