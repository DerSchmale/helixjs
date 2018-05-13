import {Color} from "../core/Color";
import {Texture2D} from "../texture/Texture2D";
import {MaterialPass} from "../material/MaterialPass";
import {RectMesh} from "../mesh/RectMesh";
import {META, TextureFilter, TextureWrapMode} from "../Helix";
import {FrameBuffer} from "../texture/FrameBuffer";
import {GL} from "../core/GL";
import {RenderUtils} from "./RenderUtils";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {PerspectiveCamera} from "../camera/PerspectiveCamera";
import {SpotShadowCasterCollector} from "./SpotShadowCasterCollector";

/**
 * @ignore
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotShadowMapRenderer()
{
    this._casterCollector = new SpotShadowCasterCollector();

    this._camera = new PerspectiveCamera();
    this._camera.nearDistance = .01;
}

SpotShadowMapRenderer.prototype =
{
    render: function (light, atlas, viewCamera, scene)
    {
        this._camera.verticalFOV = light.outerAngle;
        this._camera.farDistance = light._radius;
        this._camera.matrix.copyFrom(light.worldMatrix);
        this._camera._invalidateWorldMatrix();

        this._casterCollector.collect(this._camera, scene);

        var rect = atlas.getNextRect();
        var atlasSize = 1.0 / atlas.size;

        GL.setViewport(rect);

        var m = light.shadowMatrix;
        m.copyFrom(this._camera.viewProjectionMatrix);

        // also includes NDC [-1, 1] -> UV [0, 1]
        var sx = rect.width * atlasSize;
        var sy = rect.height * atlasSize;
        var tx = rect.x * atlasSize;
        var ty = rect.y * atlasSize;
        light._shadowTile.set(.5 * sx, .5 * sy, .5 * sx + tx, .5 * sy + ty);

        RenderUtils.renderPass(this, MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS, this._casterCollector.getRenderList(), light);
    }
};

export { SpotShadowMapRenderer };