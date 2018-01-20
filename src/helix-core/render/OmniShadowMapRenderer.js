import {Color} from "../core/Color";
import {MaterialPass} from "../material/MaterialPass";
import {CubeFace, TextureFilter, TextureWrapMode, META} from "../Helix";
import {GL} from "../core/GL";
import {RenderUtils} from "./RenderUtils";
import {PerspectiveCamera} from "../camera/PerspectiveCamera";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {FrameBuffer} from "../texture/FrameBuffer";
import {TextureCube} from "../texture/TextureCube";
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
function OmniShadowMapRenderer(light, shadowMapSize)
{
    this._light = light;
    this._shadowMapSize = shadowMapSize || 256;
    this._shadowMapInvalid = true;
    this._fbos = [];
    this._depthBuffer = new WriteOnlyDepthBuffer();

    // TODO: Some day, we might want to create a shadow atlas and dynamically assign regions, sized based on screen-size
    this._shadowMap = this._createShadowBuffer();
    this._softness = META.OPTIONS.spotShadowFilter.softness ? META.OPTIONS.spotShadowFilter.softness : .002;

    this._casterCollector = new OmniShadowCasterCollector();

    this._scene = null;

    this._initFaces();

}

OmniShadowMapRenderer.prototype =
{
    get shadowMapSize() {
        return this._shadowMapSize;
    },

    set shadowMapSize(value) {
        if (this._shadowMapSize === value) return;
        this._shadowMapSize = value;
        this._invalidateShadowMap();
    },

    render: function (viewCamera, scene) {
        var pos = new Float4();
        return function(viewCamera, scene)
        {
            var light = this._light;

            if (this._shadowMapInvalid)
                this._initShadowMap();

            light.worldMatrix.getColumn(3, pos);

            for (var i = 0; i < 6; ++i) {
                this._cameras[i].position.copyFrom(pos);
            }

            this._casterCollector.setLightBounds(light.worldBounds);
            this._casterCollector.collect(this._cameras, scene);

            GL.setInvertCulling(true);

            for (i = 0; i < 6; ++i) {
                GL.setRenderTarget(this._fbos[i]);
                GL.setClearColor(Color.WHITE);
                GL.clear();

                RenderUtils.renderPass(this, MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS, this._casterCollector.getRenderList(i), light);
            }

            GL.setInvertCulling(false);

            GL.setColorMask(true);

            GL.setRenderTarget();
            GL.setClearColor(Color.BLACK);
        }
    }(),

    _createShadowBuffer: function () {
        var tex = new TextureCube();
        tex.filter = TextureFilter.BILINEAR_NOMIP;
        tex.wrapMode = TextureWrapMode.CLAMP;
        return tex;
    },

    _invalidateShadowMap: function () {
        this._shadowMapInvalid = true;
    },

    _initShadowMap: function () {
        var size = this._shadowMapSize;

        this._shadowMap.initEmpty(size, META.OPTIONS.spotShadowFilter.getShadowMapFormat(), META.OPTIONS.spotShadowFilter.getShadowMapDataType());

        this._depthBuffer.init(size, size, false);

        for (var i = 0; i < 6; ++i)
            this._fbos[i].init();

        this._shadowMapInvalid = false;
    },

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

        var radius = this._light._radius;

        var cubeFaces = [ CubeFace.POSITIVE_X, CubeFace.NEGATIVE_X, CubeFace.POSITIVE_Y, CubeFace.NEGATIVE_Y, CubeFace.POSITIVE_Z, CubeFace.NEGATIVE_Z ];
        for (var i = 0; i < 6; ++i) {
            var camera = new PerspectiveCamera();
            camera.nearDistance = 0.01;
            camera.farDistance = radius;
            camera.verticalFOV = Math.PI * .5;
            camera.rotation.copyFrom(rotations[i]);
            camera.scale.set(1, 1, -1);
            this._cameras.push(camera);

            this._fbos.push(new FrameBuffer(this._shadowMap, this._depthBuffer, cubeFaces[i]));
        }
    }
};



export {OmniShadowMapRenderer};