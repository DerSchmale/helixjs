import {FrameBuffer} from "../texture/FrameBuffer";
import {Texture2D} from "../texture/Texture2D";
import {TextureFilter, TextureWrapMode, capabilities} from "../Helix";

/**
 * 0) RGB: ALBEDO, A: OCCLUSION
 * 1) RG: NORMAL, BA: DEPTH
 * 2) R: METALLICNESS, G: NORMAL REFLECTION, B: ROUGHNESS, A: (TODO, A: effectID, can be used by post-processing effects such as SSS to selectively apply if a match)
 * @param depthBuffer
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function GBuffer(depthBuffer)
{
    this.textures = [];
    this.fbos = [];

    for (var i = 0; i < 3; ++i) {
        var tex = new Texture2D();
        tex.filter = TextureFilter.BILINEAR_NOMIP;
        tex.wrapMode = TextureWrapMode.CLAMP;

        this.textures[i] = tex;
        this.fbos[i] = new FrameBuffer(tex, depthBuffer);
    }

    if (capabilities.GBUFFER_MRT)
        this.mrt = new FrameBuffer(this.textures, depthBuffer);
}

GBuffer.ALBEDO = 0;
GBuffer.NORMAL_DEPTH = 1;
GBuffer.SPECULAR = 2;

GBuffer.prototype = {
    resize: function(w, h)
    {
        for (var i = 0; i < 3; ++i) {
            this.textures[i].initEmpty(w, h);
            this.fbos[i].init();
        }

        if (this.mrt) this.mrt.init();
    }
};

export { GBuffer };