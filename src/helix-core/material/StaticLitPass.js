/**
 * This material pass renders all lighting in one fragment shader.
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @param lights
 * @constructor
 */
HX.StaticLitPass = function(geometryVertex, geometryFragment, lightingModel, lights, ssao)
{
    this._dirLights = null;
    this._dirLightCasters = null;
    this._pointLights = null;
    this._diffuseLightProbes = null;
    this._specularLightProbes = null;
    this._maxCascades = 0;

    HX.MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel, lights, ssao));
    this._ssaoSlot = this.getTextureSlot("hx_ssao");

    this._assignShadowMaps();
    this._assignLightProbes();
};

HX.StaticLitPass.prototype = Object.create(HX.MaterialPass.prototype);

HX.StaticLitPass.prototype.updateRenderState = function(renderer)
{
    this.setUniform("hx_ambientColor", renderer._renderCollector.ambientColor);
    this._assignDirLights(renderer._camera);
    this._assignDirLightCasters(renderer._camera);
    this._assignPointLights(renderer._camera);
    this._assignLightProbes(renderer._camera);

    HX.MaterialPass.prototype.updateRenderState.call(this, renderer);
};

HX.StaticLitPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel, lights, ssao)
{
    this._dirLights = [];
    this._dirLightCasters = [];
    this._pointLights = [];
    this._diffuseLightProbes = [];
    this._specularLightProbes = [];

    this._maxCascades = 0;

    for (var i = 0; i < lights.length; ++i) {
        var light = lights[i];

        // I don't like typechecking, but do we have a choice? :(
        if (light instanceof HX.DirectionalLight) {
            if (light.castShadows) {
                this._dirLightCasters.push(light);
                if (light.numCascades > this._maxCascades)
                    this._maxCascades = light.numCascades;
            }
            else
                this._dirLights.push(light);
        }
        else if (light instanceof HX.PointLight) {
            this._pointLights.push(light);
        }
        else if (light instanceof HX.LightProbe) {
            if (light.diffuseTexture)
                this._diffuseLightProbes.push(light);
            if (light.specularTexture)
                this._specularLightProbes.push(light);
        }
    }

    var extensions = [];

    var defines = {
        HX_NUM_DIR_LIGHTS: this._dirLights.length,
        HX_NUM_DIR_LIGHT_CASTERS: this._dirLightCasters.length,
        HX_NUM_POINT_LIGHTS: this._pointLights.length,
        HX_NUM_DIFFUSE_PROBES: this._diffuseLightProbes.length,
        HX_NUM_SPECULAR_PROBES: this._specularLightProbes.length,
        HX_MAX_CASCADES: this._maxCascades,
        HX_APPLY_SSAO: ssao? 1 : 0
    };

    // TODO: Allow material to define whether or not to use LODs
    if (HX.EXT_SHADER_TEXTURE_LOD && defines.HX_NUM_SPECULAR_PROBES > 0) {
        defines.HX_TEXTURE_LOD = 1;
        extensions.push("GL_EXT_shader_texture_lod");
    }

    var fragmentShader =
        HX.ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        lightingModel + "\n\n\n" +
        HX.DirectionalLight.SHADOW_FILTER.getGLSL() + "\n" +
        HX.ShaderLibrary.get("directional_light.glsl", defines, extensions) + "\n" +
        HX.ShaderLibrary.get("point_light.glsl") + "\n" +
        HX.ShaderLibrary.get("light_probe.glsl") + "\n" +
        geometryFragment + "\n" +
        HX.ShaderLibrary.get("material_lit_static_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + HX.ShaderLibrary.get("material_lit_static_vertex.glsl", defines);

    return new HX.Shader(vertexShader, fragmentShader);
};

HX.StaticLitPass.prototype._assignDirLights = function(camera)
{
    var lights = this._dirLights;
    if (!lights) return;

    var dir = new HX.Float4();
    var len = lights.length;

    for (var i = 0; i < len; ++i) {
        var light = lights[i];
        camera.viewMatrix.transformVector(light.direction, dir);

        this.setUniform("hx_directionalLights[" + i + "].color", light._scaledIrradiance);
        this.setUniform("hx_directionalLights[" + i + "].direction", dir);
    }
};

HX.StaticLitPass.prototype._assignDirLightCasters = function(camera)
{
    var lights = this._dirLightCasters;
    if (!lights) return;

    var dir = new HX.Float4();
    var len = lights.length;
    var matrix = new HX.Matrix4x4();
    var matrixData = new Float32Array(64);

    for (var i = 0; i < len; ++i) {
        var light = lights[i];
        camera.viewMatrix.transformVector(light.direction, dir);

        this.setUniform("hx_directionalLightCasters[" + i + "].color", light._scaledIrradiance);
        this.setUniform("hx_directionalLightCasters[" + i + "].direction", dir);

        var shadowRenderer = light._shadowMapRenderer;
        var numCascades = shadowRenderer._numCascades;
        var splits = shadowRenderer._splitDistances;
        var k = 0;
        for (var j = 0; j < numCascades; ++j) {
            matrix.multiply(shadowRenderer.getShadowMatrix(j), camera.worldMatrix);
            var m = matrix._m;
            for (var l = 0; l < 16; ++l) {
                matrixData[k++] = m[l];
            }
        }

        this.setUniformArray("hx_directionalLightCasters[" + i + "].shadowMapMatrices", matrixData);
        this.setUniform("hx_directionalLightCasters[" + i + "].splitDistances", splits);
        this.setUniform("hx_directionalLightCasters[" + i + "].depthBias", light.depthBias);
        this.setUniform("hx_directionalLightCasters[" + i + "].maxShadowDistance", splits[numCascades - 1]);
    }
};

HX.StaticLitPass.prototype._assignPointLights = function(camera)
{
    var lights = this._pointLights;
    if(!lights) return;

    var pos = new HX.Float4();
    var len = lights.length;

    for (var i = 0; i < len; ++i) {
        var light = lights[i];
        light.worldMatrix.getColumn(3, pos);
        camera.viewMatrix.transformPoint(pos, pos);

        // TODO: Stop doing this through structs, too many calls ( can easily reduce them to just 3 )
        this.setUniform("hx_pointLights[" + i + "].color", light._scaledIrradiance);
        this.setUniform("hx_pointLights[" + i + "].position", pos);
        this.setUniform("hx_pointLights[" + i + "].radius", light.radius);
    }
};

HX.StaticLitPass.prototype._assignShadowMaps = function()
{
    var lights = this._dirLightCasters;
    var len = lights.length;
    if (len > 0) {
        var shadowMaps = [];

        for (var i = 0; i < len; ++i) {
            var light = lights[i];
            var shadowRenderer = light._shadowMapRenderer;
            shadowMaps[i] = shadowRenderer._shadowMap;
        }

        this.setTextureArray("hx_directionalShadowMaps", shadowMaps);
    }
};

HX.StaticLitPass.prototype._assignLightProbes = function()
{
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
        mips[i] =  Math.floor(HX.log2(specularMaps[i].size));
    }

    if (diffuseMaps.length > 0) this.setTextureArray("hx_diffuseProbeMaps", diffuseMaps);
    if (specularMaps.length > 0) {
        this.setTextureArray("hx_specularProbeMaps", specularMaps);
        this.setUniformArray("hx_specularProbeNumMips", new Float32Array(mips));
    }
};

HX.StaticLitPass.prototype._setSSAOTexture = function(texture)
{
    this._ssaoSlot.texture = texture;
};
