/**
 * The base class for any render pipeline. This can be a shadow map renderer, the default deferred render, ...
 * @constructor
 */
HX.Renderer = function()
{
};

HX.Renderer.prototype =
{
    constructor: HX.Renderer,


    /**
     * Renders a scene with a given camera. IMPORTANT: Helix does not clear the canvas. This may be useful to have 3D content
     * on top of a 2D gpu-based interface.
     * @param camera
     * @param scene
     */
    render: function (camera, scene, dt)
    {

    },

    dispose: function()
    {

    },

    /**
     *
     * @param passType
     * @param renderItems
     * @param transparencyMode (optional) If provided, it will only render passes with the given transparency mode
     * @param offsetIndex The index to start rendering.
     * @returns The index for the first unrendered renderItem in the list (depending on transparencyMode)
     * @private
     */
    _renderPass: function (passType, renderItems, transparencyMode, offsetIndex)
    {
        var len = renderItems.length;
        var activeShader = null;
        var activePass = null;
        var lastMesh = null;
        var offsetIndex = offsetIndex || 0;

        for(var i = offsetIndex; i < len; ++i) {
            var renderItem = renderItems[i];
            var material = renderItem.material;

            if (transparencyMode !== undefined && material._transparencyMode !== transparencyMode)
                return i;

            // lighting model 0 means unlit
            var stencilValue = (material._lightingModelID << 1) | material._transparencyMode;
            HX.GL.stencilFunc(HX.GL.ALWAYS, stencilValue, 0xff);

            var meshInstance = renderItem.meshInstance;
            var pass = renderItem.pass;
            var shader = pass._shader;

            if (shader !== activeShader) {
                shader.updateRenderState();
                activeShader = shader;
            }

            if (pass !== activePass) {
                this._switchPass(activePass, pass);
                activePass = pass;

                lastMesh = null;    // need to reset mesh data too
            }

            if (lastMesh != meshInstance._mesh) {
                meshInstance.updateRenderState(passType);
                lastMesh = meshInstance._mesh;
            }

            renderItem.draw();
        }

        if (activePass && activePass._blending) HX.GL.disable(HX.GL.BLEND);
        return len;
    },

    _switchPass: function(oldPass, newPass)
    {
        // clean up old pass
        if (!oldPass || oldPass._cullMode !== oldPass._cullMode) {
            if (newPass._cullMode === HX.CullMode.NONE)
                HX.GL.disable(HX.GL.CULL_FACE);
            else {
                HX.GL.enable(HX.GL.CULL_FACE);
                HX.GL.cullFace(newPass._cullMode);
            }
        }

        if (!oldPass || oldPass._blending !== oldPass._blending) {
            if (newPass._blending) {
                HX.GL.enable(HX.GL.BLEND);
                HX.GL.blendFunc(newPass._blendSource, newPass._blendDest);
                HX.GL.blendEquation(newPass._blendOperator);
            }
            else
                HX.GL.disable(HX.GL.BLEND);
        }

        newPass.updateRenderState();
    }
};