import {Renderer} from "./Renderer";
import {FrameBuffer} from "../texture/FrameBuffer";
import {CubeCamera} from "../camera/CubeCamera";
import {GL} from "../core/GL";
import {CubeFace} from "../Helix";

/**
 * @classdesc
 *
 * CubeRenderer allows rendering to cube maps.
 *
 * @constructor
 * @param {TextureCube} renderTarget The target cube map to render to.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CubeRenderer(targetTexture)
{
    // TODO: Do not wrap renderer, but make this a bonafide extension to Renderer with its own custom collection (similar to OmniShadowMapRenderer)
    this._renderer = new Renderer();
    this._renderer.skipEffects = true;
    this._targetTexture = targetTexture;
    this._fbos = [];

    // may be set later
    if (targetTexture)
        this._initFBOs();
}

CubeRenderer.prototype =
{
    get renderTarget() {
        return this._renderTarget;
    },

    set renderTarget(value) {
        this._renderTarget = value;
        this._initFBOs();
    },

    render: function(camera, scene)
    {
        if (!(camera instanceof CubeCamera))
            throw new Error("Camera must be a CubeCamera!");

        GL.setInvertCulling(true);

        for (var i = 0; i < 6; ++i) {
            this._renderer.renderTarget = this._fbos[i];
            this._renderer.render(camera.getFaceCamera(i), scene, 0);
        }

        this._targetTexture.generateMipmap();

        GL.setInvertCulling(false);
    },

    _initFBOs: function()
    {
        var cubeFaces = [ CubeFace.POSITIVE_X, CubeFace.NEGATIVE_X, CubeFace.POSITIVE_Y, CubeFace.NEGATIVE_Y, CubeFace.POSITIVE_Z, CubeFace.NEGATIVE_Z ];
        for (var i = 0; i < 6; ++i) {
            var fbo = new FrameBuffer(this._targetTexture, null, cubeFaces[i]);
            fbo.init();
            this._fbos[i] = fbo;
        }
    }
};

export { CubeRenderer };