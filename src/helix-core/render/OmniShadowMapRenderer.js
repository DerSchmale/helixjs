import {MaterialPass} from "../material/MaterialPass";
import {GL} from "../core/GL";
import {renderPass} from "./RenderUtils";
import {Float4} from "../math/Float4";
import {OmniShadowCasterCollector} from "./OmniShadowCasterCollector";
import {CubeCamera} from "../camera/CubeCamera";

/**
 * @ignore
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OmniShadowMapRenderer()
{
    this._casterCollector = new OmniShadowCasterCollector();
    this._scene = null;
    this._cubeCamera = new CubeCamera();
}

OmniShadowMapRenderer.prototype =
{
    render: function (light, atlas, viewCamera, scene) {
        var pos = new Float4();
        return function(light, atlas, viewCamera, scene)
        {
            var entity = light.entity;
            entity.worldMatrix.getColumn(3, pos);

            this._cubeCamera.farDistance = light._radius;
            this._cubeCamera.position = pos;

            this._casterCollector.setLightBounds(entity.worldBounds);
            this._casterCollector.collect(this._cubeCamera, scene, viewCamera);

            GL.setInvertCulling(true);

            var atlasSize = 1.0 / atlas.size;

            for (var i = 0; i < 6; ++i) {
                var rect = atlas.getNextRect();
                var camera = this._cubeCamera.getFaceCamera(i);
                GL.setViewport(rect);

                var sx = rect.width * atlasSize;
                var sy = rect.height * atlasSize;
                var tx = rect.x * atlasSize;
                var ty = rect.y * atlasSize;

                light._shadowTiles[i].set(.5 * sx, .5 * sy, .5 * sx + tx, .5 * sy + ty);

                renderPass(this, camera, MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS, this._casterCollector.getRenderList(i), light);
            }

            GL.setInvertCulling(false);

            GL.setColorMask(true);
        }
    }()
};



export {OmniShadowMapRenderer};