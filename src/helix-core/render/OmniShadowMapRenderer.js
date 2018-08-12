import {MaterialPass} from "../material/MaterialPass";
import {GL} from "../core/GL";
import {RenderUtils} from "./RenderUtils";
import {PerspectiveCamera} from "../camera/PerspectiveCamera";
import {Float4} from "../math/Float4";
import {Quaternion} from "../math/Quaternion";
import {OmniShadowCasterCollector} from "./OmniShadowCasterCollector";

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

    this._initFaces();

}

OmniShadowMapRenderer.prototype =
{
    render: function (light, atlas, viewCamera, scene) {
        var pos = new Float4();
        return function(light, atlas, viewCamera, scene)
        {
            light.worldMatrix.getColumn(3, pos);

            for (var i = 0; i < 6; ++i) {
                var cam = this._cameras[i];
                var radius = light._radius;
                cam.farDistance = radius;
                cam.position.copyFrom(pos);
            }

            this._casterCollector.setLightBounds(light.worldBounds);
            this._casterCollector.collect(this._cameras, scene);

            GL.setInvertCulling(true);

            var atlasSize = 1.0 / atlas.size;

            for (i = 0; i < 6; ++i) {
                var rect = atlas.getNextRect();
                GL.setViewport(rect);

                var sx = rect.width * atlasSize;
                var sy = rect.height * atlasSize;
                var tx = rect.x * atlasSize;
                var ty = rect.y * atlasSize;

                light._shadowTiles[i].set(.5 * sx, .5 * sy, .5 * sx + tx, .5 * sy + ty);

                RenderUtils.renderPass(this, MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS, this._casterCollector.getRenderList(i), light);
            }

            GL.setInvertCulling(false);

            GL.setColorMask(true);
        }
    }(),

    _initFaces: function()
    {
        this._cameras = [];

        var flipY = new Quaternion();
        flipY.fromAxisAngle(Float4.Z_AXIS, Math.PI);

        var rotations = [];
        for (var i = 0; i < 6; ++i)
            rotations[i] = new Quaternion();

        rotations[0].fromAxisAngle(Float4.Z_AXIS, -Math.PI * .5);
        rotations[1].fromAxisAngle(Float4.Z_AXIS, Math.PI * .5);
        rotations[2].fromAxisAngle(Float4.Z_AXIS, 0);
        rotations[3].fromAxisAngle(Float4.Z_AXIS, Math.PI);
        rotations[4].fromAxisAngle(Float4.X_AXIS, Math.PI * .5);
        rotations[5].fromAxisAngle(Float4.X_AXIS, -Math.PI * .5);

        for (i = 0; i < 6; ++i) {
            var camera = new PerspectiveCamera();
            camera.nearDistance = 0.01;
            camera.verticalFOV = Math.PI * .5;
            camera.rotation.copyFrom(rotations[i]);
            camera.scale.set(1, 1, -1);
            this._cameras.push(camera);
        }
    }
};



export {OmniShadowMapRenderer};