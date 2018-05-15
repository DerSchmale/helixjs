import {MaterialPass} from "../MaterialPass";
import {DirectionalLight} from "../../light/DirectionalLight";
import {PointLight} from "../../light/PointLight";
import {LightProbe} from "../../light/LightProbe";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {capabilities, META} from "../../Helix";
import {Float4} from "../../math/Float4";
import {Matrix4x4} from "../../math/Matrix4x4";
import {MathX} from "../../math/MathX";
import {Shader} from "../../shader/Shader";
import {GL} from "../../core/GL";
import {SpotLight} from "../../light/SpotLight";


/**
 * @classdesc
 * This material pass renders all lighting in one fragment shader.
 *
 * @ignore
 *
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @param lights
 * @constructor
 */
function FixedLitPass(geometryVertex, geometryFragment, lightingModel, lights)
{
    this._dirLights = null;
    this._pointLights = null;
    this._spotLights = null;
    this._diffuseLightProbes = null;
    this._specularLightProbes = null;

    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel, lights));

    this._getUniformLocations();

    this._assignLightProbes();
}

FixedLitPass.prototype = Object.create(MaterialPass.prototype);

FixedLitPass.prototype.updatePassRenderState = function (camera, renderer)
{
    GL.gl.useProgram(this._shader._program);
    this._assignDirLights(camera);
    this._assignPointLights(camera);
    this._assignSpotLights(camera);
    this._assignLightProbes(camera);

    MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
};

FixedLitPass.prototype._generateShader = function (geometryVertex, geometryFragment, lightingModel, lights)
{
    this._dirLights = [];
    this._pointLights = [];
    this._spotLights = [];
    this._diffuseLightProbes = [];
    this._specularLightProbes = [];

    for (var i = 0; i < lights.length; ++i) {
        var light = lights[i];

        // I don't like typechecking, but do we have a choice? :(
        if (light instanceof DirectionalLight) {
            this._dirLights.push(light);
        }
        else if (light instanceof PointLight) {
            this._pointLights.push(light);
        }
        else if (light instanceof SpotLight) {
            this._spotLights.push(light);
        }
        else if (light instanceof LightProbe) {
            if (light.diffuseTexture)
                this._diffuseLightProbes.push(light);

            if (light.specularTexture)
                this._specularLightProbes.push(light);
        }
    }

    var extensions = [];

    var defines = {
        HX_NUM_DIR_LIGHTS: this._dirLights.length,
        HX_NUM_POINT_LIGHTS: this._pointLights.length,
        HX_NUM_SPOT_LIGHTS: this._spotLights.length,
        HX_NUM_DIFFUSE_PROBES: this._diffuseLightProbes.length,
        HX_NUM_SPECULAR_PROBES: this._specularLightProbes.length
    };

    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_fixed_vertex.glsl", defines);

    var fragmentShader =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.shadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("directional_light.glsl", defines) + "\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_fixed_fragment.glsl");

    return new Shader(vertexShader, fragmentShader);
};

FixedLitPass.prototype._assignDirLights = function (camera)
{
    var dir = new Float4();
    var matrix = new Matrix4x4();
    var matrixData = new Float32Array(64);

    return function(camera) {
        var lights = this._dirLights;
        if (!lights) return;

        var len = lights.length;
        var gl = GL.gl;

        for (var i = 0; i < len; ++i) {
            var light = lights[i];
            var locs = this._dirLocations[i];
            camera.viewMatrix.transformVector(light.direction, dir);

            var col = light._scaledIrradiance;
            gl.uniform3f(locs.color, col.r, col.g, col.b);
            gl.uniform3f(locs.direction, dir.x, dir.y, dir.z);
            gl.uniform1i(locs.castShadows, light.castShadows? 1 : 0);

            if (light.castShadows) {
                var numCascades = META.OPTIONS.numShadowCascades;
                var splits = light._cascadeSplitDistances;
                var k = 0;
                for (var j = 0; j < numCascades; ++j) {
                    matrix.multiply(light.getShadowMatrix(j), camera.worldMatrix);
                    var m = matrix._m;

                    for (var l = 0; l < 16; ++l) {
                        matrixData[k++] = m[l];
                    }
                }

                gl.uniformMatrix4fv(locs.matrices, false, matrixData);
                gl.uniform4f(locs.splits, splits[0], splits[1], splits[2], splits[3]);
                gl.uniform1f(locs.depthBias, light.depthBias);
                gl.uniform1f(locs.maxShadowDistance, splits[numCascades - 1]);
            }
        }
    }
}();


FixedLitPass.prototype._assignPointLights = function (camera) {
    var pos = new Float4();
    var tiles = new Float32Array(24);

    return function (camera)
    {
        var lights = this._pointLights;
        if (!lights) return;

        var gl = GL.gl;

        var len = lights.length;

        for (var i = 0; i < len; ++i) {
            var locs = this._pointLocations[i];
            var light = lights[i];
            light.worldMatrix.getColumn(3, pos);
            camera.viewMatrix.transformPoint(pos, pos);

            var col = light._scaledIrradiance;
            gl.uniform3f(locs.color, col.r, col.g, col.b);
            gl.uniform3f(locs.position, pos.x, pos.y, pos.z);
            gl.uniform1f(locs.radius, light._radius);
            gl.uniform1f(locs.rcpRadius, 1.0 / light._radius);

            gl.uniform1i(locs.castShadows, light.castShadows? 1 : 0);

            if (light.castShadows) {
                gl.uniformMatrix4fv(locs.matrix, false, camera.worldMatrix._m);
                gl.uniform1f(locs.depthBias, light.depthBias);

                var j = 0;
                for (var i = 0; i < 6; ++i) {
                    var t = light._shadowTiles[i];
                    tiles[j++] = t.x;
                    tiles[j++] = t.y;
                    tiles[j++] = t.z;
                    tiles[j++] = t.w;
                }
                gl.uniform4fv(locs.tiles, tiles);


            }
        }
    }
}();


FixedLitPass.prototype._assignSpotLights = function (camera)
{
    var pos = new Float4();
    var matrix = new Matrix4x4();

    return function (camera)
    {
        var lights = this._spotLights;
        if (!lights) return;

        var gl = GL.gl;

        var len = lights.length;

        for (var i = 0; i < len; ++i) {
            var locs = this._spotLocations[i];
            var light = lights[i];
            var worldMatrix = light.worldMatrix;
            var viewMatrix = camera.viewMatrix;
            worldMatrix.getColumn(3, pos);
            viewMatrix.transformPoint(pos, pos);

            var col = light._scaledIrradiance;
            gl.uniform3f(locs.color, col.r, col.g, col.b);
            gl.uniform3f(locs.position, pos.x, pos.y, pos.z);
            gl.uniform1f(locs.radius, light._radius);
            gl.uniform1f(locs.rcpRadius, 1.0 / light._radius);
            gl.uniform2f(locs.angleData, light._cosOuter, 1.0 / Math.max((light._cosInner - light._cosOuter), .00001));

            worldMatrix.getColumn(1, pos);
            viewMatrix.transformVector(pos, pos);
            gl.uniform3f(locs.direction, pos.x, pos.y, pos.z);

            gl.uniform1i(locs.castShadows, light.castShadows? 1 : 0);

            if (light.castShadows) {
                matrix.multiply(light.shadowMatrix, camera.worldMatrix);

                gl.uniformMatrix4fv(locs.matrix, false, matrix._m);
                gl.uniform1f(locs.depthBias, light.depthBias);
                var tile = light._shadowTile;
                gl.uniform4f(locs.tile, tile.x, tile.y, tile.z, tile.w);
            }
        }
    }
}();


FixedLitPass.prototype._assignLightProbes = function () {
    var diffuseMaps = [];
    var specularMaps = [];

    var probes = this._diffuseLightProbes;
    var len = probes.length;
    for (var i = 0; i < len; ++i)
        diffuseMaps[i] = probes[i].diffuseTexture;

    probes = this._specularLightProbes;
    len = probes.length;
    var mips = [];
    for (i = 0; i < len; ++i) {
        specularMaps[i] = probes[i].specularTexture;
        mips[i] = Math.floor(MathX.log2(specularMaps[i].size));
    }

    if (diffuseMaps.length > 0) this.setTextureArray("hx_diffuseProbeMaps", diffuseMaps);
    if (specularMaps.length > 0) {
        this.setTextureArray("hx_specularProbeMaps", specularMaps);
        this.setUniformArray("hx_specularProbeNumMips", new Float32Array(mips));
    }
};

FixedLitPass.prototype._getUniformLocations = function ()
{
    this._dirLocations = [];
    this._pointLocations = [];
    this._spotLocations = [];

    for (var i = 0; i < this._dirLights.length; ++i) {
        this._dirLocations.push({
            color: this.getUniformLocation("hx_directionalLights[" + i + "].color"),
            direction: this.getUniformLocation("hx_directionalLights[" + i + "].direction"),
            matrices: this.getUniformLocation("hx_directionalLights[" + i + "].shadowMapMatrices[0]"),
            splits: this.getUniformLocation("hx_directionalLights[" + i + "].splitDistances"),
            depthBias: this.getUniformLocation("hx_directionalLights[" + i + "].depthBias"),
            maxShadowDistance: this.getUniformLocation("hx_directionalLights[" + i + "].maxShadowDistance"),
            castShadows: this.getUniformLocation("hx_directionalLights[" + i + "].castShadows")
        });
    }

    for (i = 0; i < this._pointLights.length; ++i) {
        this._pointLocations.push({
            color: this.getUniformLocation("hx_pointLights[" + i + "].color"),
            position: this.getUniformLocation("hx_pointLights[" + i + "].position"),
            radius: this.getUniformLocation("hx_pointLights[" + i + "].radius"),
            rcpRadius: this.getUniformLocation("hx_pointLights[" + i + "].rcpRadius"),
            castShadows: this.getUniformLocation("hx_pointLights[" + i + "].castShadows"),
            depthBias: this.getUniformLocation("hx_pointLights[" + i + "].depthBias"),
            matrix: this.getUniformLocation("hx_pointLights[" + i + "].shadowMapMatrix"),
            tiles: this.getUniformLocation("hx_pointLights[" + i + "].shadowTiles[0]")
        });
    }

    for (i = 0; i < this._spotLights.length; ++i) {
        this._spotLocations.push({
            color: this.getUniformLocation("hx_spotLights[" + i + "].color"),
            position: this.getUniformLocation("hx_spotLights[" + i + "].position"),
            direction: this.getUniformLocation("hx_spotLights[" + i + "].direction"),
            radius: this.getUniformLocation("hx_spotLights[" + i + "].radius"),
            rcpRadius: this.getUniformLocation("hx_spotLights[" + i + "].rcpRadius"),
            angleData: this.getUniformLocation("hx_spotLights[" + i + "].angleData"),
            castShadows: this.getUniformLocation("hx_spotLights[" + i + "].castShadows"),
            matrix: this.getUniformLocation("hx_spotLights[" + i + "].shadowMapMatrix"),
            tile: this.getUniformLocation("hx_spotLights[" + i + "].shadowTile"),
            depthBias: this.getUniformLocation("hx_spotLights[" + i + "].depthBias")
        });
    }
};

export {FixedLitPass};