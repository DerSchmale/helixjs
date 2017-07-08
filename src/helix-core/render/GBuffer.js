import {FrameBuffer} from "../texture/FrameBuffer";
import {Texture2D} from "../texture/Texture2D";
import {TextureFilter, TextureWrapMode} from "../Helix";
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
    }
};

export { GBuffer };