HX.DebugRenderMode = {
    DEBUG_NONE: 0,
    DEBUG_COLOR: 1,
    DEBUG_NORMALS: 2,
    DEBUG_METALLICNESS: 3,
    DEBUG_SPECULAR_NORMAL_REFLECTION: 4,
    DEBUG_ROUGHNESS: 5,
    DEBUG_DEPTH: 6,
    DEBUG_LIGHT_ACCUM: 7,
    DEBUG_AO: 8
};

/**
 *
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

    _renderPass: function (passType, renderItems)
    {
        var len = renderItems.length;
        var activeShader = null;
        var activePass = null;
        var lastMesh = null;

        for(var i = 0; i < len; ++i) {
            var renderItem = renderItems[i];
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