import {TextureCube} from "./TextureCube";
import {capabilities, CubeFace, TextureFormat} from "../Helix";
import {CubeCamera} from "../camera/CubeCamera";
import {FrameBuffer} from "./FrameBuffer";
import {ShaderLibrary} from "../shader/ShaderLibrary";
import {EffectPass} from "../effect/EffectPass";
import {Color} from "../core/Color";
import {Float4} from "../math/Float4";
import {GL} from "../core/GL";

function DynamicSkyTexture(textureSize)
{
    TextureCube.call(this);
    textureSize = textureSize || 128;
    this.initEmpty(textureSize, TextureFormat.RGBA, capabilities.HDR_DATA_TYPE);
    this.generateMipmap();
    this._initRendering();

    this.rayleighScattering = new Color(5.8e-6, 1.35e-5, 3.31e-5);
    this.groundColor = new Color(0.5, 0.5, 0.5);
    this.mieScattering = 5.216e-6;
    this.mieCoefficient = 0.3;
    this.rayleighHeightFalloff = 8000;
    this.mieHeightFalloff = 1200;
    this._sunDir = new Float4(1.0, 1.0, 1.0);
    this._sunDir.normalize();
    this.intensity = 1.0;
}

DynamicSkyTexture.prototype = Object.create(TextureCube.prototype, {
    sunDirection: {
        get: function() {
            return this._sunDir;
        },
        set: function(v) {
            this._sunDir.copyFrom(v).normalize();
        }
    }
});

DynamicSkyTexture.prototype.update = function()
{
    var g = this.mieCoefficient;
    var pass = this._pass;

    pass.setUniform("rayleighScattering", this.rayleighScattering);
    pass.setUniform("rayleighExtinction", this.rayleighScattering);
    pass.setUniform("rayleighHeightFalloff",  1.0 / this.rayleighHeightFalloff);
    pass.setUniform("mieHeightFalloff",  1.0 / this.mieHeightFalloff);
    pass.setUniform("mieCoefficient",  1.55 * g - 0.55 * g * g * g);
    pass.setUniform("mieScattering", this.mieScattering);
    pass.setUniform("mieExtinction", this.mieScattering * 1.11);
    pass.setUniform("groundColor",  this.groundColor.gammaToLinear());
    pass.setUniform("sunDir", this._sunDir);
    pass.setUniform("intensity", this.intensity);

    for (var i = 0; i < 6; ++i) {
        GL.setRenderTarget(this._fbos[i]);
        GL.clear();
        var camera = this._cubeCam.getFaceCamera(i);
        pass.setUniform("inverseViewProjectionMatrix", camera.inverseViewProjectionMatrix);
        pass.draw();
    }

    this.generateMipmap();
};

DynamicSkyTexture.prototype._initRendering = function()
{
    this._cubeCam = new CubeCamera();
    this._fbos = [];

    var cubeFaces = [ CubeFace.POSITIVE_X, CubeFace.NEGATIVE_X, CubeFace.POSITIVE_Y, CubeFace.NEGATIVE_Y, CubeFace.POSITIVE_Z, CubeFace.NEGATIVE_Z ];
    for (var i = 0; i < 6; ++i) {
        this._fbos[i] = new FrameBuffer(this, null, cubeFaces[i]);
        this._fbos[i].init();
    }

    var volumetric = ShaderLibrary.get("snippets_volumetric.glsl") + "\n";
    this._pass = new EffectPass(volumetric + ShaderLibrary.get("dynamic_skybox_vertex.glsl"), volumetric + ShaderLibrary.get("dynamic_skybox_fragment.glsl"));
    this._pass.setUniform("earthRadius", 6371000.0);
    this._pass.setUniform("atmosphereRadius", 6426000.0);
};

export { DynamicSkyTexture }