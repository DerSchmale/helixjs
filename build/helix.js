(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('HX', ['exports'], factory) :
	(factory((global.HX = global.HX || {})));
}(this, (function (exports) { 'use strict';

/**
 * ShaderLibrary is an object that will store shader code processed by the build process: contents of glsl files stored
 * in the glsl folder will be stored here and can be retrieved using their original filename.
 *
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
var ShaderLibrary = {
    _files: {},
    /**
     * Retrieves the shader code for a given filename.
     * @param filename The filename of the glsl code to retrieve
     * @param defines (Optional) An object containing variable names that need to be defined with the given value.
     * This should not be used for macros, which should be explicitly prepended
     * @param extensions (Optional) An array of extensions to be required
     * @returns A string containing the shader code from the files with defines prepended
     */
    get: function(filename, defines)
    {
        var defineString = "";

        for (var key in defines) {
            if (defines.hasOwnProperty(key)) {
                defineString += "#define " + key + " " + defines[key] + "\n";
            }
        }

        return defineString + ShaderLibrary._files[filename];
    }
};

ShaderLibrary._files['deferred_ambient_light_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_gbufferAlbedo;\nuniform sampler2D hx_gbufferNormalDepth;\nuniform sampler2D hx_gbufferSpecular;\n\n#ifdef HX_SSAO\nuniform sampler2D hx_ssao;\n#endif\n\nuniform vec3 hx_ambientColor;\n\n\nvoid main()\n{\n// TODO: move this to snippets_deferred file, along with the hx_decodeGBufferSpecular method\n    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);\n\n    gl_FragColor.xyz = hx_ambientColor * data.geometry.color.xyz * data.geometry.occlusion;\n\n#ifdef HX_SSAO\n    gl_FragColor.xyz *= texture2D(hx_ssao, uv).x;\n#endif\n\n    gl_FragColor.w = 1.0;\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['deferred_dir_light_fragment.glsl'] = 'varying vec2 uv;\nvarying vec3 viewDir;\n\nuniform HX_DirectionalLight hx_directionalLight;\n\nuniform sampler2D hx_gbufferAlbedo;\nuniform sampler2D hx_gbufferNormalDepth;\nuniform sampler2D hx_gbufferSpecular;\n\n#ifdef HX_SHADOW_MAP\nuniform sampler2D hx_shadowMap;\n#endif\n\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\n\n\nvoid main()\n{\n// TODO: move this to snippets_deferred file, along with the hx_decodeGBufferSpecular method\n    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);\n\n    float absViewZ = hx_cameraNearPlaneDistance + data.linearDepth * hx_cameraFrustumRange;\n	vec3 viewPosition = viewDir * absViewZ;\n    vec3 viewVector = normalize(viewPosition);\n    vec3 diffuse, specular;\n\n    hx_calculateLight(hx_directionalLight, data.geometry, viewVector, viewPosition, data.normalSpecularReflectance, diffuse, specular);\n\n    gl_FragColor.xyz = diffuse * data.geometry.color.xyz + specular;\n    gl_FragColor.w = 1.0;\n\n    #ifdef HX_SHADOW_MAP\n        gl_FragColor.xyz *= hx_calculateShadows(hx_directionalLight, hx_shadowMap, viewPosition);\n    #endif\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['deferred_dir_light_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n    gl_Position = hx_position;\n}';

ShaderLibrary._files['deferred_point_light_fragment.glsl'] = 'varying vec2 uv;\nvarying vec3 viewDir;\n\nuniform HX_PointLight hx_pointLight;\n\nuniform sampler2D hx_gbufferAlbedo;\nuniform sampler2D hx_gbufferNormalDepth;\nuniform sampler2D hx_gbufferSpecular;\n\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\n\n#ifdef HX_SHADOW_MAP\nuniform samplerCube hx_shadowMap;\n#endif\n\nvoid main()\n{\n    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);\n\n    float absViewZ = hx_cameraNearPlaneDistance + data.linearDepth * hx_cameraFrustumRange;\n\n	vec3 viewPosition = viewDir * absViewZ;\n    vec3 viewVector = normalize(viewPosition);\n    vec3 diffuse, specular;\n\n    hx_calculateLight(hx_pointLight, data.geometry, viewVector, viewPosition, data.normalSpecularReflectance, diffuse, specular);\n\n    gl_FragColor.xyz = diffuse * data.geometry.color.xyz + specular;\n    gl_FragColor.w = 1.0;\n\n    #ifdef HX_SHADOW_MAP\n        gl_FragColor.xyz *= hx_calculateShadows(hx_pointLight, hx_shadowMap, viewPosition);\n    #endif\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['deferred_point_light_vertex.glsl'] = 'attribute vec4 hx_position;\n\n\n#ifdef HX_SPHERE_MESH\nuniform HX_PointLight hx_pointLight;\nuniform mat4 hx_projectionMatrix;\n\n#else\n\nattribute vec2 hx_texCoord;\n#endif\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n#ifdef HX_SPHERE_MESH\n    vec4 viewPos = vec4(hx_position.xyz * hx_pointLight.radius + hx_pointLight.position, 1.0);\n\n    gl_Position = hx_projectionMatrix * viewPos;\n    uv = gl_Position.xy / gl_Position.w * .5 + .5;\n    viewDir = hx_getLinearDepthViewVector(gl_Position.xy / gl_Position.w, hx_inverseProjectionMatrix);\n#else\n    uv = hx_texCoord;\n    gl_Position = hx_position;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n#endif\n}';

ShaderLibrary._files['deferred_probe_fragment.glsl'] = 'varying vec2 uv;\nvarying vec3 viewDir;\n\nuniform sampler2D hx_gbufferAlbedo;\nuniform sampler2D hx_gbufferNormalDepth;\nuniform sampler2D hx_gbufferSpecular;\n\n#ifdef HX_SSAO\nuniform sampler2D hx_ssao;\n#endif\n\nuniform samplerCube hx_diffuseProbeMap;\nuniform samplerCube hx_specularProbeMap;\n\nuniform float hx_specularProbeNumMips;\nuniform mat4 hx_cameraWorldMatrix;\n\n#ifdef HX_LOCAL_PROBE\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\n\nuniform float hx_probeSize;\nuniform vec3 hx_probePosition;\n#endif\n\nvoid main()\n{\n    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);\n\n    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.geometry.normal;\n\n    vec3 viewVector = normalize(viewDir);\n    vec3 reflectedViewDir = reflect(viewVector, data.geometry.normal);\n    vec3 fresnel = hx_fresnelProbe(data.normalSpecularReflectance, reflectedViewDir, data.geometry.normal, data.geometry.roughness);\n    reflectedViewDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;\n\n#ifdef HX_LOCAL_PROBE\n    float absViewZ = hx_cameraNearPlaneDistance + data.linearDepth * hx_cameraFrustumRange;\n    vec3 viewPosition = viewDir * absViewZ;\n    vec3 worldPosition = mat3(hx_cameraWorldMatrix) * viewPosition;\n#endif\n\n    vec3 diffuse = vec3(0.0);\n    vec3 specular = vec3(0.0);\n\n#ifdef HX_DIFFUSE_PROBE\n    vec3 diffRay = worldNormal;\n    #ifdef HX_LOCAL_PROBE\n        diffRay = hx_intersectCubeMap(worldPosition, hx_probePosition, diffRay, hx_probeSize);\n    #endif\n    diffuse = hx_calculateDiffuseProbeLight(hx_diffuseProbeMap, diffRay);\n#endif\n#ifdef HX_SPECULAR_PROBE\n    vec3 specRay = reflectedViewDir;\n    #ifdef HX_LOCAL_PROBE\n        specRay = hx_intersectCubeMap(worldPosition, hx_probePosition, specRay, hx_probeSize);\n    #endif\n    specular = hx_calculateSpecularProbeLight(hx_specularProbeMap, hx_specularProbeNumMips, specRay, fresnel, data.geometry.roughness);\n#endif\n\n    gl_FragColor.xyz = diffuse * data.geometry.color.xyz + specular;\n\n    gl_FragColor.xyz *= data.geometry.occlusion;\n\n    #ifdef HX_SSAO\n    gl_FragColor.xyz *= texture2D(hx_ssao, uv).x;\n    #endif\n\n    gl_FragColor.w = 1.0;\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['deferred_probe_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n    gl_Position = hx_position;\n}';

ShaderLibrary._files['deferred_spot_light_fragment.glsl'] = 'varying vec2 uv;\nvarying vec3 viewDir;\n\nuniform HX_SpotLight hx_spotLight;\n\nuniform sampler2D hx_gbufferAlbedo;\nuniform sampler2D hx_gbufferNormalDepth;\nuniform sampler2D hx_gbufferSpecular;\n\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\n\n#ifdef HX_SHADOW_MAP\nuniform sampler2D hx_shadowMap;\n#endif\n\nvoid main()\n{\n    HX_GBufferData data = hx_parseGBuffer(hx_gbufferAlbedo, hx_gbufferNormalDepth, hx_gbufferSpecular, uv);\n\n    float absViewZ = hx_cameraNearPlaneDistance + data.linearDepth * hx_cameraFrustumRange;\n\n	vec3 viewPosition = viewDir * absViewZ;\n    vec3 viewVector = normalize(viewPosition);\n    vec3 diffuse, specular;\n\n    hx_calculateLight(hx_spotLight, data.geometry, viewVector, viewPosition, data.normalSpecularReflectance, diffuse, specular);\n\n    gl_FragColor.xyz = diffuse * data.geometry.color.xyz + specular;\n    gl_FragColor.w = 1.0;\n\n    #ifdef HX_SHADOW_MAP\n        gl_FragColor.xyz *= hx_calculateShadows(hx_spotLight, hx_shadowMap, viewPosition);\n//        gl_FragColor.xyz = vec3(hx_calculateShadows(hx_spotLight, hx_shadowMap, viewPosition));\n    #endif\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['deferred_spot_light_vertex.glsl'] = 'attribute vec4 hx_position;\n\n#ifdef HX_CONE_MESH\nuniform HX_SpotLight hx_spotLight;\nuniform mat4 hx_viewProjectionMatrix;\nuniform mat4 hx_projectionMatrix;\nuniform mat4 hx_spotLightWorldMatrix;\n#else\n\nattribute vec2 hx_texCoord;\n#endif\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n#ifdef HX_CONE_MESH\n    vec3 localPos = hx_position.xyz;\n    // need to flip z, but also another axis to keep windedness\n    localPos.xz = -localPos.xz;\n    // align to origin, with height 1\n    localPos.z += .5;\n    // adapt to correct radius\n    localPos.xyz *= hx_spotLight.radius;\n    // make sure the base is correctly sized\n    localPos.xy *= hx_spotLight.sinOuterAngle;\n\n    // this just rotates, it does not translate\n    vec4 worldPos = hx_spotLightWorldMatrix * vec4(localPos, 1.0);\n    gl_Position = hx_viewProjectionMatrix * worldPos;\n    gl_Position /= gl_Position.w;\n    uv = gl_Position.xy / gl_Position.w * .5 + .5;\n    viewDir = hx_getLinearDepthViewVector(gl_Position.xy / gl_Position.w, hx_inverseProjectionMatrix);\n#else\n    uv = hx_texCoord;\n    gl_Position = hx_position;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n#endif\n}';

ShaderLibrary._files['debug_bounds_fragment.glsl'] = 'uniform vec4 color;\n\nvoid main()\n{\n    gl_FragColor = color;\n}';

ShaderLibrary._files['debug_bounds_vertex.glsl'] = 'attribute vec4 hx_position;\n\nuniform mat4 hx_wvpMatrix;\n\nvoid main()\n{\n    gl_Position = hx_wvpMatrix * hx_position;\n}';

ShaderLibrary._files['lighting_blinn_phong.glsl'] = '/*// schlick-beckman\nfloat hx_lightVisibility(vec3 normal, vec3 viewDir, float roughness, float nDotL)\n{\n	float nDotV = max(-dot(normal, viewDir), 0.0);\n	float r = roughness * roughness * 0.797896;\n	float g1 = nDotV * (1.0 - r) + r;\n	float g2 = nDotL * (1.0 - r) + r;\n    return .25 / (g1 * g2);\n}*/\n\nfloat hx_blinnPhongDistribution(float roughness, vec3 normal, vec3 halfVector)\n{\n	float roughnessSqr = clamp(roughness * roughness, 0.0001, .9999);\n//	roughnessSqr *= roughnessSqr;\n	float halfDotNormal = max(-dot(halfVector, normal), 0.0);\n	return pow(halfDotNormal, 2.0/roughnessSqr - 2.0) / roughnessSqr;\n}\n\nvoid hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)\n{\n	float nDotL = max(-dot(lightDir, geometry.normal), 0.0);\n	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI\n\n	vec3 halfVector = normalize(lightDir + viewDir);\n\n	float distribution = hx_blinnPhongDistribution(geometry.roughness, geometry.normal, halfVector);\n\n	float halfDotLight = max(dot(halfVector, lightDir), 0.0);\n	float cosAngle = 1.0 - halfDotLight;\n	// to the 5th power\n	vec3 fresnel = normalSpecularReflectance + (1.0 - normalSpecularReflectance)*pow(cosAngle, 5.0);\n\n// / PI factor is encoded in light colour\n	diffuseColor = irradiance;\n	specularColor = irradiance * fresnel * distribution;\n\n//#ifdef HX_VISIBILITY\n//    specularColor *= hx_lightVisibility(normal, lightDir, geometry.roughness, nDotL);\n//#endif\n}';

ShaderLibrary._files['lighting_debug.glsl'] = 'void hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)\n{\n	diffuseColor = vec3(0.0);\n	specularColor = vec3(0.0);\n}';

ShaderLibrary._files['lighting_ggx.glsl'] = '#ifdef HX_VISIBILITY_TERM\nfloat hx_geometryTerm(vec3 normal, vec3 dir, float k)\n{\n    float d = max(-dot(normal, dir), 0.0);\n    return d / (d * (1.0 - k) + k);\n}\n\n// schlick-beckman\nfloat hx_lightVisibility(vec3 normal, vec3 viewDir, vec3 lightDir, float roughness)\n{\n	float k = roughness + 1.0;\n	k = k * k * .125;\n	return hx_geometryTerm(normal, viewDir, k) * hx_geometryTerm(normal, lightDir, k);\n}\n#endif\n\nfloat hx_ggxDistribution(float roughness, vec3 normal, vec3 halfVector)\n{\n    float roughSqr = roughness*roughness;\n    float halfDotNormal = max(-dot(halfVector, normal), 0.0);\n    float denom = (halfDotNormal * halfDotNormal) * (roughSqr - 1.0) + 1.0;\n    return roughSqr / (denom * denom);\n}\n\n// light dir is to the lit surface\n// view dir is to the lit surface\nvoid hx_brdf(in HX_GeometryData geometry, in vec3 lightDir, in vec3 viewDir, in vec3 viewPos, in vec3 lightColor, vec3 normalSpecularReflectance, out vec3 diffuseColor, out vec3 specularColor)\n{\n	float nDotL = max(-dot(lightDir, geometry.normal), 0.0);\n	vec3 irradiance = nDotL * lightColor;	// in fact irradiance / PI\n\n	vec3 halfVector = normalize(lightDir + viewDir);\n\n    float mappedRoughness =  geometry.roughness * geometry.roughness;\n\n	float distribution = hx_ggxDistribution(mappedRoughness, geometry.normal, halfVector);\n\n	float halfDotLight = max(dot(halfVector, lightDir), 0.0);\n	float cosAngle = 1.0 - halfDotLight;\n	vec3 fresnel = normalSpecularReflectance + (1.0 - normalSpecularReflectance) * pow(cosAngle, 5.0);\n\n	diffuseColor = irradiance;\n\n	specularColor = irradiance * fresnel * distribution;\n\n#ifdef HX_VISIBILITY_TERM\n    specularColor *= hx_lightVisibility(geometry.normal, viewDir, lightDir, geometry.roughness);\n#endif\n}';

ShaderLibrary._files['default_geometry_fragment.glsl'] = 'uniform vec3 color;\nuniform vec3 emissiveColor;\nuniform float alpha;\n\n#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP) || defined(METALLIC_ROUGHNESS_MAP) || defined(OCCLUSION_MAP) || defined(EMISSION_MAP)\nvarying vec2 texCoords;\n#endif\n\n#ifdef COLOR_MAP\nuniform sampler2D colorMap;\n#endif\n\n#ifdef OCCLUSION_MAP\nuniform sampler2D occlusionMap;\n#endif\n\n#ifdef EMISSION_MAP\nuniform sampler2D emissionMap;\n#endif\n\n#ifdef MASK_MAP\nuniform sampler2D maskMap;\n#endif\n\n#ifndef HX_SKIP_NORMALS\n    varying vec3 normal;\n\n    #ifdef NORMAL_MAP\n    varying vec3 tangent;\n    varying vec3 bitangent;\n\n    uniform sampler2D normalMap;\n    #endif\n#endif\n\n#ifndef HX_SKIP_SPECULAR\nuniform float roughness;\nuniform float roughnessRange;\nuniform float normalSpecularReflectance;\nuniform float metallicness;\n\n#if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP) || defined(METALLIC_ROUGHNESS_MAP)\nuniform sampler2D specularMap;\n#endif\n\n#endif\n\n#if defined(ALPHA_THRESHOLD)\nuniform float alphaThreshold;\n#endif\n\n#ifdef VERTEX_COLORS\nvarying vec3 vertexColor;\n#endif\n\nHX_GeometryData hx_geometry()\n{\n    HX_GeometryData data;\n\n    vec4 outputColor = vec4(color, alpha);\n\n    #ifdef VERTEX_COLORS\n        outputColor.xyz *= vertexColor;\n    #endif\n\n    #ifdef COLOR_MAP\n        outputColor *= texture2D(colorMap, texCoords);\n    #endif\n\n    #ifdef MASK_MAP\n        outputColor.w *= texture2D(maskMap, texCoords).x;\n    #endif\n\n    #ifdef ALPHA_THRESHOLD\n        if (outputColor.w < alphaThreshold) discard;\n    #endif\n\n    data.color = hx_gammaToLinear(outputColor);\n\n#ifndef HX_SKIP_SPECULAR\n    float metallicnessOut = metallicness;\n    float specNormalReflOut = normalSpecularReflectance;\n    float roughnessOut = roughness;\n#endif\n\n#if defined(HX_SKIP_NORMALS) && defined(NORMAL_ROUGHNESS_MAP) && !defined(HX_SKIP_SPECULAR)\n    vec4 normalSample = texture2D(normalMap, texCoords);\n    roughnessOut -= roughnessRange * (normalSample.w - .5);\n#endif\n\n#ifndef HX_SKIP_NORMALS\n    vec3 fragNormal = normal;\n\n    #ifdef NORMAL_MAP\n        vec4 normalSample = texture2D(normalMap, texCoords);\n        mat3 TBN;\n        TBN[2] = normalize(normal);\n        TBN[0] = normalize(tangent);\n        TBN[1] = normalize(bitangent);\n\n        fragNormal = TBN * (normalSample.xyz - .5);\n\n        #ifdef NORMAL_ROUGHNESS_MAP\n            roughnessOut -= roughnessRange * (normalSample.w - .5);\n        #endif\n    #endif\n\n    #ifdef DOUBLE_SIDED\n        fragNormal *= gl_FrontFacing? 1.0 : -1.0;\n    #endif\n    data.normal = normalize(fragNormal);\n#endif\n\n#ifndef HX_SKIP_SPECULAR\n    #if defined(SPECULAR_MAP) || defined(ROUGHNESS_MAP) || defined(METALLIC_ROUGHNESS_MAP)\n          vec4 specSample = texture2D(specularMap, texCoords);\n\n          #ifdef METALLIC_ROUGHNESS_MAP\n              roughnessOut -= roughnessRange * (specSample.y - .5);\n              metallicnessOut *= specSample.z;\n\n          #else\n              roughnessOut -= roughnessRange * (specSample.x - .5);\n\n              #ifdef SPECULAR_MAP\n                  specNormalReflOut *= specSample.y;\n                  metallicnessOut *= specSample.z;\n              #endif\n          #endif\n    #endif\n\n    data.metallicness = metallicnessOut;\n    data.normalSpecularReflectance = specNormalReflOut;\n    data.roughness = roughnessOut;\n#endif\n\n    data.occlusion = 1.0;\n\n#ifdef OCCLUSION_MAP\n    data.occlusion = texture2D(occlusionMap, texCoords).x;\n#endif\n\n    vec3 emission = emissiveColor;\n#ifdef EMISSION_MAP\n    emission *= texture2D(emissionMap, texCoords).xyz;\n#endif\n\n    data.emission = hx_gammaToLinear(emission);\n    return data;\n}';

ShaderLibrary._files['default_geometry_vertex.glsl'] = 'attribute vec4 hx_position;\n\n// morph positions are offsets re the base position!\n#ifdef HX_USE_MORPHING\nattribute vec3 hx_morphPosition0;\nattribute vec3 hx_morphPosition1;\nattribute vec3 hx_morphPosition2;\nattribute vec3 hx_morphPosition3;\n#if HX_NUM_MORPH_TARGETS > 4\nattribute vec3 hx_morphPosition4;\nattribute vec3 hx_morphPosition5;\nattribute vec3 hx_morphPosition6;\nattribute vec3 hx_morphPosition7;\n#endif\n\nuniform float hx_morphWeights[HX_NUM_MORPH_TARGETS];\n#endif\n\n#ifdef HX_USE_SKINNING\nattribute vec4 hx_jointIndices;\nattribute vec4 hx_jointWeights;\n\n// WebGL doesn\'t support mat4x3 and I don\'t want to split the uniform either\n#ifdef HX_USE_SKINNING_TEXTURE\nuniform sampler2D hx_skinningTexture;\n#else\nuniform vec4 hx_skinningMatrices[HX_MAX_SKELETON_JOINTS * 3];\n#endif\n#endif\n\nuniform mat4 hx_wvpMatrix;\nuniform mat4 hx_worldViewMatrix;\n\n#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP) || defined(OCCLUSION_MAP) || defined(EMISSION_MAP)\nattribute vec2 hx_texCoord;\nvarying vec2 texCoords;\n#endif\n\n#ifdef VERTEX_COLORS\nattribute vec3 hx_vertexColor;\nvarying vec3 vertexColor;\n#endif\n\n#ifndef HX_SKIP_NORMALS\nattribute vec3 hx_normal;\nvarying vec3 normal;\n\nuniform mat3 hx_normalWorldViewMatrix;\n#ifdef NORMAL_MAP\nattribute vec4 hx_tangent;\n\nvarying vec3 tangent;\nvarying vec3 bitangent;\n#endif\n#endif\n\nvoid hx_geometry()\n{\n    vec4 morphedPosition = hx_position;\n\n    #ifndef HX_SKIP_NORMALS\n    vec3 morphedNormal = hx_normal;\n    #endif\n\n// TODO: Abstract this in functions for easier reuse in other materials\n#ifdef HX_USE_MORPHING\n    morphedPosition.xyz += hx_morphPosition0 * hx_morphWeights[0];\n    morphedPosition.xyz += hx_morphPosition1 * hx_morphWeights[1];\n    morphedPosition.xyz += hx_morphPosition2 * hx_morphWeights[2];\n    morphedPosition.xyz += hx_morphPosition3 * hx_morphWeights[3];\n    #if HX_NUM_MORPH_TARGETS > 4\n        morphedPosition.xyz += hx_morphPosition4 * hx_morphWeights[4];\n        morphedPosition.xyz += hx_morphPosition5 * hx_morphWeights[5];\n        morphedPosition.xyz += hx_morphPosition6 * hx_morphWeights[6];\n        morphedPosition.xyz += hx_morphPosition7 * hx_morphWeights[7];\n    #endif\n#endif\n\n#ifdef HX_USE_SKINNING\n    mat4 skinningMatrix = hx_getSkinningMatrix(0);\n\n    vec4 animPosition = morphedPosition * skinningMatrix;\n\n    #ifndef HX_SKIP_NORMALS\n        vec3 animNormal = morphedNormal * mat3(skinningMatrix);\n\n        #ifdef NORMAL_MAP\n        vec3 animTangent = hx_tangent.xyz * mat3(skinningMatrix);\n        #endif\n    #endif\n#else\n    vec4 animPosition = morphedPosition;\n\n    #ifndef HX_SKIP_NORMALS\n        vec3 animNormal = morphedNormal;\n\n        #ifdef NORMAL_MAP\n        vec3 animTangent = hx_tangent.xyz;\n        #endif\n    #endif\n#endif\n\n    // TODO: Should gl_position be handled by the shaders if we only return local position?\n    gl_Position = hx_wvpMatrix * animPosition;\n\n#ifndef HX_SKIP_NORMALS\n    normal = normalize(hx_normalWorldViewMatrix * animNormal);\n\n    #ifdef NORMAL_MAP\n        tangent = mat3(hx_worldViewMatrix) * animTangent;\n        bitangent = cross(tangent, normal) * hx_tangent.w;\n    #endif\n#endif\n\n#if defined(COLOR_MAP) || defined(NORMAL_MAP)|| defined(SPECULAR_MAP)|| defined(ROUGHNESS_MAP) || defined(MASK_MAP) || defined(OCCLUSION_MAP) || defined(EMISSION_MAP)\n    texCoords = hx_texCoord;\n#endif\n\n#ifdef VERTEX_COLORS\n    vertexColor = hx_vertexColor;\n#endif\n}';

ShaderLibrary._files['default_skybox_fragment.glsl'] = 'varying vec3 viewWorldDir;\n\nuniform samplerCube hx_skybox;\n\nHX_GeometryData hx_geometry()\n{\n    HX_GeometryData data;\n    data.color = textureCube(hx_skybox, viewWorldDir);\n    data.emission = vec3(0.0);\n    data.color = hx_gammaToLinear(data.color);\n    return data;\n}';

ShaderLibrary._files['default_skybox_vertex.glsl'] = 'attribute vec4 hx_position;\n\nuniform vec3 hx_cameraWorldPosition;\nuniform float hx_cameraFarPlaneDistance;\nuniform mat4 hx_viewProjectionMatrix;\n\nvarying vec3 viewWorldDir;\n\n// using 2D quad for rendering skyboxes rather than 3D cube causes jittering of the skybox\nvoid hx_geometry()\n{\n    viewWorldDir = hx_position.xyz;\n    vec4 pos = hx_position;\n    // use a decent portion of the frustum to prevent FP issues\n    pos.xyz = pos.xyz * hx_cameraFarPlaneDistance + hx_cameraWorldPosition;\n    pos = hx_viewProjectionMatrix * pos;\n    // make sure it\'s drawn behind everything else, so z = 1.0\n    pos.z = pos.w;\n    gl_Position = pos;\n}';

ShaderLibrary._files['material_apply_gbuffer_fragment.glsl'] = 'uniform vec2 hx_rcpRenderTargetResolution;\n\nuniform sampler2D hx_lightAccumulation;\n\nvoid main()\n{\n    HX_GeometryData data = hx_geometry();\n    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;\n    gl_FragColor = texture2D(hx_lightAccumulation, screenUV);\n    gl_FragColor.xyz += data.emission;\n}';

ShaderLibrary._files['material_apply_gbuffer_vertex.glsl'] = 'void main()\n{\n    hx_geometry();\n}';

ShaderLibrary._files['material_dir_shadow_fragment.glsl'] = 'void main()\n{\n    // geometry is really only used for kil instructions if necessary\n    // hopefully the compiler optimizes the rest out for us\n    HX_GeometryData data = hx_geometry();\n    gl_FragColor = hx_dir_getShadowMapValue(gl_FragCoord.z);\n}';

ShaderLibrary._files['material_fwd_all_fragment.glsl'] = 'varying vec3 hx_viewPosition;\n\nuniform vec3 hx_ambientColor;\n\n#if HX_NUM_DIR_LIGHTS > 0\nuniform HX_DirectionalLight hx_directionalLights[HX_NUM_DIR_LIGHTS];\n#endif\n\n#if HX_NUM_DIR_LIGHT_CASTERS > 0\nuniform HX_DirectionalLight hx_directionalLightCasters[HX_NUM_DIR_LIGHT_CASTERS];\n\nuniform sampler2D hx_directionalShadowMaps[HX_NUM_DIR_LIGHT_CASTERS];\n#endif\n\n#if HX_NUM_POINT_LIGHTS > 0\nuniform HX_PointLight hx_pointLights[HX_NUM_POINT_LIGHTS];\n#endif\n\n\n#if HX_NUM_POINT_LIGHT_CASTERS > 0\nuniform HX_PointLight hx_pointLightCasters[HX_NUM_POINT_LIGHT_CASTERS];\n\nuniform samplerCube hx_pointShadowMaps[HX_NUM_POINT_LIGHT_CASTERS];\n#endif\n\n#if HX_NUM_SPOT_LIGHTS > 0\nuniform HX_SpotLight hx_spotLights[HX_NUM_SPOT_LIGHTS];\n#endif\n\n#if HX_NUM_SPOT_LIGHT_CASTERS > 0\nuniform HX_SpotLight hx_spotLightCasters[HX_NUM_SPOT_LIGHT_CASTERS];\n\nuniform sampler2D hx_spotShadowMaps[HX_NUM_SPOT_LIGHT_CASTERS];\n#endif\n\n#if HX_NUM_DIFFUSE_PROBES > 0 || HX_NUM_SPECULAR_PROBES > 0\nuniform mat4 hx_cameraWorldMatrix;\n#endif\n\n#if HX_NUM_DIFFUSE_PROBES > 0\nuniform samplerCube hx_diffuseProbeMaps[HX_NUM_DIFFUSE_PROBES];\n#endif\n\n#if HX_NUM_SPECULAR_PROBES > 0\nuniform samplerCube hx_specularProbeMaps[HX_NUM_SPECULAR_PROBES];\nuniform float hx_specularProbeNumMips[HX_NUM_SPECULAR_PROBES];\n#endif\n\n#ifdef HX_SSAO\nuniform sampler2D hx_ssao;\n\nuniform vec2 hx_rcpRenderTargetResolution;\n#endif\n\n\nvoid main()\n{\n    HX_GeometryData data = hx_geometry();\n\n    // update the colours\n    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);\n    data.color.xyz *= 1.0 - data.metallicness;\n\n    vec3 diffuseAccum = vec3(0.0);\n    vec3 specularAccum = vec3(0.0);\n    vec3 viewVector = normalize(hx_viewPosition);\n\n    float ao = data.occlusion;\n\n    #ifdef HX_SSAO\n        vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;\n        ao = texture2D(hx_ssao, screenUV).x;\n    #endif\n\n    #if HX_NUM_DIR_LIGHTS > 0\n    for (int i = 0; i < HX_NUM_DIR_LIGHTS; ++i) {\n        vec3 diffuse, specular;\n        hx_calculateLight(hx_directionalLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n        diffuseAccum += diffuse;\n        specularAccum += specular;\n    }\n    #endif\n\n    #if HX_NUM_DIR_LIGHT_CASTERS > 0\n    for (int i = 0; i < HX_NUM_DIR_LIGHT_CASTERS; ++i) {\n        vec3 diffuse, specular;\n        hx_calculateLight(hx_directionalLightCasters[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n        float shadow = hx_calculateShadows(hx_directionalLightCasters[i], hx_directionalShadowMaps[i], hx_viewPosition);\n        diffuseAccum += diffuse * shadow;\n        specularAccum += specular * shadow;\n    }\n    #endif\n\n\n    #if HX_NUM_POINT_LIGHTS > 0\n    for (int i = 0; i < HX_NUM_POINT_LIGHTS; ++i) {\n        vec3 diffuse, specular;\n        hx_calculateLight(hx_pointLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n        diffuseAccum += diffuse;\n        specularAccum += specular;\n    }\n    #endif\n\n    #if HX_NUM_POINT_LIGHT_CASTERS > 0\n    for (int i = 0; i < HX_NUM_POINT_LIGHT_CASTERS; ++i) {\n        vec3 diffuse, specular;\n        hx_calculateLight(hx_pointLightCasters[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n        float shadow = hx_calculateShadows(hx_pointLightCasters[i], hx_pointShadowMaps[i], hx_viewPosition);\n        diffuseAccum += diffuse * shadow;\n        specularAccum += specular * shadow;\n    }\n    #endif\n\n    #if HX_NUM_SPOT_LIGHTS > 0\n    for (int i = 0; i < HX_NUM_SPOT_LIGHTS; ++i) {\n        vec3 diffuse, specular;\n        hx_calculateLight(hx_spotLights[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n        diffuseAccum += diffuse;\n        specularAccum += specular;\n    }\n    #endif\n\n    #if HX_NUM_SPOT_LIGHT_CASTERS > 0\n    for (int i = 0; i < HX_NUM_SPOT_LIGHT_CASTERS; ++i) {\n        vec3 diffuse, specular;\n        hx_calculateLight(hx_spotLightCasters[i], data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n        float shadow = hx_calculateShadows(hx_spotLightCasters[i], hx_spotShadowMaps[i], hx_viewPosition);\n        diffuseAccum += diffuse * shadow;\n        specularAccum += specular * shadow;\n    }\n    #endif\n\n// TODO: add support for local probes\n\n    #if HX_NUM_DIFFUSE_PROBES > 0\n    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.normal;\n    for (int i = 0; i < HX_NUM_DIFFUSE_PROBES; ++i) {\n        diffuseAccum += hx_calculateDiffuseProbeLight(hx_diffuseProbeMaps[i], worldNormal) * ao;\n    }\n    #endif\n\n    #if HX_NUM_SPECULAR_PROBES > 0\n    vec3 reflectedViewDir = reflect(viewVector, data.normal);\n    vec3 fresnel = hx_fresnelProbe(specularColor, reflectedViewDir, data.normal, data.roughness);\n\n    reflectedViewDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;\n\n   for (int i = 0; i < HX_NUM_SPECULAR_PROBES; ++i) {\n        specularAccum += hx_calculateSpecularProbeLight(hx_specularProbeMaps[i], hx_specularProbeNumMips[i], reflectedViewDir, fresnel, data.roughness) * ao;\n    }\n    #endif\n\n    gl_FragColor = vec4((diffuseAccum + hx_ambientColor * ao) * data.color.xyz + specularAccum + data.emission, data.color.w);\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['material_fwd_all_vertex.glsl'] = 'varying vec3 hx_viewPosition;\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    hx_geometry();\n    // we need to do an unprojection here to be sure to have skinning - or anything like that - support\n    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;\n}';

ShaderLibrary._files['material_fwd_base_fragment.glsl'] = 'uniform vec3 hx_ambientColor;\n\n#ifdef HX_SSAO\nuniform sampler2D hx_ssao;\n#endif\n\nuniform vec2 hx_rcpRenderTargetResolution;\n\nvoid main()\n{\n    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;\n\n    HX_GeometryData data = hx_geometry();\n    // simply override with emission\n    gl_FragColor = data.color;\n    #ifdef HX_SSAO\n    float ssao = texture2D(hx_ssao, screenUV).x;\n    #else\n    float ssao = 1.0;\n    #endif\n    gl_FragColor.xyz = gl_FragColor.xyz * hx_ambientColor * ssao + data.emission;\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['material_fwd_base_vertex.glsl'] = 'void main()\n{\n    hx_geometry();\n}';

ShaderLibrary._files['material_fwd_dir_fragment.glsl'] = 'varying vec3 hx_viewPosition;\n\nuniform HX_DirectionalLight hx_directionalLight;\n\n#ifdef HX_SHADOW_MAP\nuniform sampler2D hx_shadowMap;\n#endif\n\nvoid main()\n{\n    HX_GeometryData data = hx_geometry();\n\n    vec3 viewVector = normalize(hx_viewPosition);\n    vec3 diffuse, specular;\n\n    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);\n    data.color.xyz *= 1.0 - data.metallicness;\n\n    hx_calculateLight(hx_directionalLight, data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n\n    gl_FragColor = vec4(diffuse * data.color.xyz + specular, data.color.w);\n\n    #ifdef HX_SHADOW_MAP\n        gl_FragColor.xyz *= hx_calculateShadows(hx_directionalLight, hx_shadowMap, hx_viewPosition);\n    #endif\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['material_fwd_dir_vertex.glsl'] = 'varying vec3 hx_viewPosition;\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    hx_geometry();\n    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;\n}';

ShaderLibrary._files['material_fwd_point_fragment.glsl'] = 'varying vec3 hx_viewPosition;\n\nuniform HX_PointLight hx_pointLight;\n\n#ifdef HX_SHADOW_MAP\nuniform samplerCube hx_shadowMap;\n#endif\n\nvoid main()\n{\n    HX_GeometryData data = hx_geometry();\n\n    vec3 viewVector = normalize(hx_viewPosition);\n    vec3 diffuse, specular;\n\n    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);\n    data.color.xyz *= 1.0 - data.metallicness;\n\n    hx_calculateLight(hx_pointLight, data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n\n    gl_FragColor = vec4(diffuse * data.color.xyz + specular, data.color.w);\n\n    #ifdef HX_SHADOW_MAP\n        gl_FragColor.xyz *= hx_calculateShadows(hx_pointLight, hx_shadowMap, hx_viewPosition);\n    #endif\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['material_fwd_point_vertex.glsl'] = 'varying vec3 hx_viewPosition;\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    hx_geometry();\n    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;\n}';

ShaderLibrary._files['material_fwd_probe_fragment.glsl'] = 'varying vec3 hx_viewPosition;\nvarying vec3 hx_worldPosition;\n\nuniform samplerCube hx_diffuseProbeMap;\nuniform samplerCube hx_specularProbeMap;\nuniform float hx_specularProbeNumMips;\n\nuniform mat4 hx_cameraWorldMatrix;\n\n#ifdef HX_SSAO\nuniform vec2 hx_rcpRenderTargetResolution;\nuniform sampler2D hx_ssao;\n#endif\n\nuniform float hx_probeSize;\nuniform vec3 hx_probePosition;\nuniform float hx_probeLocal;\n\nvoid main()\n{\n    HX_GeometryData data = hx_geometry();\n\n    vec3 viewVector = normalize(hx_viewPosition);\n\n    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);\n    data.color.xyz *= 1.0 - data.metallicness;\n\n    // TODO: We should be able to change the base of TBN in vertex shader\n    vec3 worldNormal = mat3(hx_cameraWorldMatrix) * data.normal;\n    vec3 reflectedViewDir = reflect(viewVector, data.normal);\n    vec3 fresnel = hx_fresnelProbe(specularColor, reflectedViewDir, data.normal, data.roughness);\n    reflectedViewDir = mat3(hx_cameraWorldMatrix) * reflectedViewDir;\n    vec3 diffRay = hx_intersectCubeMap(hx_worldPosition, hx_probePosition, worldNormal, hx_probeSize);\n    vec3 specRay = hx_intersectCubeMap(hx_worldPosition, hx_probePosition, reflectedViewDir, hx_probeSize);\n    diffRay = mix(worldNormal, diffRay, hx_probeLocal);\n    specRay = mix(reflectedViewDir, specRay, hx_probeLocal);\n    vec3 diffuse = hx_calculateDiffuseProbeLight(hx_diffuseProbeMap, diffRay);\n    vec3 specular = hx_calculateSpecularProbeLight(hx_specularProbeMap, hx_specularProbeNumMips, specRay, fresnel, data.roughness);\n\n    gl_FragColor = vec4((diffuse * data.color.xyz + specular) * data.occlusion, data.color.w);\n\n    #ifdef HX_SSAO\n    vec2 screenUV = gl_FragCoord.xy * hx_rcpRenderTargetResolution;\n    gl_FragColor.xyz *= texture2D(hx_ssao, screenUV).x;\n    #endif\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['material_fwd_probe_vertex.glsl'] = 'varying vec3 hx_viewPosition;\nvarying vec3 hx_worldPosition;\nuniform mat4 hx_inverseProjectionMatrix;\nuniform mat4 hx_worldMatrix;\n\nvoid main()\n{\n    hx_geometry();\n    hx_worldPosition = (hx_worldMatrix * gl_Position).xyz;\n    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;\n}';

ShaderLibrary._files['material_fwd_spot_fragment.glsl'] = 'varying vec3 hx_viewPosition;\n\nuniform HX_SpotLight hx_spotLight;\n\n#ifdef HX_SHADOW_MAP\nuniform sampler2D hx_shadowMap;\n#endif\n\nvoid main()\n{\n    HX_GeometryData data = hx_geometry();\n\n    vec3 viewVector = normalize(hx_viewPosition);\n    vec3 diffuse, specular;\n\n    vec3 specularColor = mix(vec3(data.normalSpecularReflectance), data.color.xyz, data.metallicness);\n    data.color.xyz *= 1.0 - data.metallicness;\n\n    hx_calculateLight(hx_spotLight, data, viewVector, hx_viewPosition, specularColor, diffuse, specular);\n\n    gl_FragColor = vec4(diffuse * data.color.xyz + specular, data.color.w);\n\n    #ifdef HX_SHADOW_MAP\n        gl_FragColor.xyz *= hx_calculateShadows(hx_spotLight, hx_shadowMap, hx_viewPosition);\n    #endif\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['material_fwd_spot_vertex.glsl'] = 'varying vec3 hx_viewPosition;\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    hx_geometry();\n    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;\n}';

ShaderLibrary._files['material_gbuffer_albedo_fragment.glsl'] = 'void main()\n{\n    HX_GeometryData data = hx_geometry();\n    gl_FragColor.xyz = data.color.xyz;\n    gl_FragColor.w = data.occlusion;\n}';

ShaderLibrary._files['material_gbuffer_albedo_vertex.glsl'] = 'void main()\n{\n    hx_geometry();\n}';

ShaderLibrary._files['material_gbuffer_full_fragment.glsl'] = '#drawbuffers\n\nvarying float hx_linearDepth;\n\nvoid main()\n{\n    HX_GeometryData data = hx_geometry();\n    gl_FragData[0] = vec4(data.color.xyz, data.occlusion);\n    gl_FragData[1].xy = hx_encodeNormal(data.normal);\n    gl_FragData[1].zw = hx_floatToRG8(hx_linearDepth);\n    gl_FragData[2].x = data.metallicness;\n    gl_FragData[2].y = data.normalSpecularReflectance * 5.0;  // better use of available range\n    gl_FragData[2].z = data.roughness;\n    gl_FragData[2].w = 1.0;\n}';

ShaderLibrary._files['material_gbuffer_full_vertex.glsl'] = 'varying float hx_linearDepth;\n\nuniform float hx_rcpCameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\n\nvoid main()\n{\n    hx_geometry();\n\n    hx_linearDepth = (gl_Position.w - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;\n}';

ShaderLibrary._files['material_gbuffer_normal_depth_fragment.glsl'] = 'varying float hx_linearDepth;\n\nvoid main()\n{\n    HX_GeometryData data = hx_geometry();\n    gl_FragColor.xy = hx_encodeNormal(data.normal);\n    gl_FragColor.zw = hx_floatToRG8(hx_linearDepth);\n}';

ShaderLibrary._files['material_gbuffer_normal_depth_vertex.glsl'] = 'varying float hx_linearDepth;\n\nuniform float hx_rcpCameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\n\nvoid main()\n{\n    hx_geometry();\n\n    hx_linearDepth = (gl_Position.w - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;\n}';

ShaderLibrary._files['material_gbuffer_specular_fragment.glsl'] = 'void main()\n{\n    HX_GeometryData data = hx_geometry();\n    gl_FragColor.x = data.metallicness;\n    gl_FragColor.y = data.normalSpecularReflectance * 5.0;  // better use of available range\n    gl_FragColor.z = data.roughness;\n    gl_FragColor.w = 1.0;\n}';

ShaderLibrary._files['material_gbuffer_specular_vertex.glsl'] = 'void main()\n{\n    hx_geometry();\n}';

ShaderLibrary._files['material_point_shadow_fragment.glsl'] = 'varying vec3 hx_viewPosition;\n\nuniform float hx_rcpRadius;\n\nvoid main()\n{\n    // geometry is really only used for kil instructions if necessary\n    // hopefully the compiler optimizes the rest out for us\n    HX_GeometryData data = hx_geometry();\n\n    gl_FragColor = hx_point_getShadowMapValue(length(hx_viewPosition) * hx_rcpRadius);\n}';

ShaderLibrary._files['material_point_shadow_vertex.glsl'] = 'varying vec3 hx_viewPosition;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    hx_geometry();\n    hx_viewPosition = (hx_inverseProjectionMatrix * gl_Position).xyz;\n}';

ShaderLibrary._files['material_spot_shadow_fragment.glsl'] = 'void main()\n{\n    // geometry is really only used for kil instructions if necessary\n    // hopefully the compiler optimizes the rest out for us\n    HX_GeometryData data = hx_geometry();\n\n    // should we store distance instead of shadow value?\n    gl_FragColor = hx_spot_getShadowMapValue(gl_FragCoord.z);\n}';

ShaderLibrary._files['material_unlit_fragment.glsl'] = 'void main()\n{\n    HX_GeometryData data = hx_geometry();\n    gl_FragColor = data.color;\n    gl_FragColor.xyz += data.emission;\n\n\n    #ifdef HX_GAMMA_CORRECT_LIGHTS\n        gl_FragColor = hx_linearToGamma(gl_FragColor);\n    #endif\n}';

ShaderLibrary._files['material_unlit_vertex.glsl'] = 'void main()\n{\n    hx_geometry();\n}';

ShaderLibrary._files['directional_light.glsl'] = 'struct HX_DirectionalLight\n{\n    vec3 color;\n    vec3 direction; // in view space?\n\n    mat4 shadowMapMatrices[4];\n    vec4 splitDistances;\n    float depthBias;\n    float maxShadowDistance;    // = light.splitDistances[light.numCascades - 1]\n};\n\nvoid hx_calculateLight(HX_DirectionalLight light, HX_GeometryData geometry, vec3 viewVector, vec3 viewPosition, vec3 normalSpecularReflectance, out vec3 diffuse, out vec3 specular)\n{\n	hx_brdf(geometry, light.direction, viewVector, viewPosition, light.color, normalSpecularReflectance, diffuse, specular);\n}\n\nmat4 hx_getShadowMatrix(HX_DirectionalLight light, vec3 viewPos)\n{\n    #if HX_NUM_SHADOW_CASCADES > 1\n        // not very efficient :(\n        for (int i = 0; i < HX_NUM_SHADOW_CASCADES - 1; ++i) {\n            if (viewPos.z < light.splitDistances[i])\n                return light.shadowMapMatrices[i];\n        }\n        return light.shadowMapMatrices[HX_NUM_SHADOW_CASCADES - 1];\n    #else\n        return light.shadowMapMatrices[0];\n    #endif\n}\n\nfloat hx_calculateShadows(HX_DirectionalLight light, sampler2D shadowMap, vec3 viewPos)\n{\n    mat4 shadowMatrix = hx_getShadowMatrix(light, viewPos);\n    vec4 shadowMapCoord = shadowMatrix * vec4(viewPos, 1.0);\n    float shadow = hx_dir_readShadow(shadowMap, shadowMapCoord, light.depthBias);\n\n    // this can occur when modelInstance.castShadows = false, or using inherited bounds\n    bool isOutside = max(shadowMapCoord.x, shadowMapCoord.y) > 1.0 || min(shadowMapCoord.x, shadowMapCoord.y) < 0.0;\n    if (isOutside) shadow = 1.0;\n\n    // this makes sure that anything beyond the last cascade is unshadowed\n    return max(shadow, float(viewPos.z > light.maxShadowDistance));\n}';

ShaderLibrary._files['light_probe.glsl'] = '#define HX_PROBE_K0 .00098\n#define HX_PROBE_K1 .9921\n\n/*\nvar minRoughness = 0.0014;\nvar maxPower = 2.0 / (minRoughness * minRoughness) - 2.0;\nvar maxMipFactor = (exp2(-10.0/Math.sqrt(maxPower)) - HX_PROBE_K0)/HX_PROBE_K1;\nvar HX_PROBE_SCALE = 1.0 / maxMipFactor\n*/\n\n#define HX_PROBE_SCALE\n\nvec3 hx_calculateDiffuseProbeLight(samplerCube texture, vec3 normal)\n{\n	return hx_gammaToLinear(textureCube(texture, normal).xyz);\n}\n\nvec3 hx_calculateSpecularProbeLight(samplerCube texture, float numMips, vec3 reflectedViewDir, vec3 fresnelColor, float roughness)\n{\n    #ifdef HX_TEXTURE_LOD\n    // knald method:\n        float power = 2.0/(roughness * roughness) - 2.0;\n        float factor = (exp2(-10.0/sqrt(power)) - HX_PROBE_K0)/HX_PROBE_K1;\n//        float mipLevel = numMips * (1.0 - clamp(factor * HX_PROBE_SCALE, 0.0, 1.0));\n        float mipLevel = numMips * (1.0 - clamp(factor, 0.0, 1.0));\n        vec4 specProbeSample = textureCubeLodEXT(texture, reflectedViewDir, mipLevel);\n    #else\n        vec4 specProbeSample = textureCube(texture, reflectedViewDir);\n    #endif\n	return hx_gammaToLinear(specProbeSample.xyz) * fresnelColor;\n}';

ShaderLibrary._files['point_light.glsl'] = 'struct HX_PointLight\n{\n    vec3 color;\n    vec3 position;\n    float radius;\n    float rcpRadius;\n\n    float depthBias;\n    mat4 shadowMapMatrix;\n};\n\nvoid hx_calculateLight(HX_PointLight light, HX_GeometryData geometry, vec3 viewVector, vec3 viewPosition, vec3 normalSpecularReflectance, out vec3 diffuse, out vec3 specular)\n{\n    vec3 direction = viewPosition - light.position;\n    float attenuation = dot(direction, direction);  // distance squared\n    float distance = sqrt(attenuation);\n    // normalize\n    direction /= distance;\n    attenuation = max((1.0 - distance * light.rcpRadius) / attenuation, 0.0);\n	hx_brdf(geometry, direction, viewVector, viewPosition, light.color * attenuation, normalSpecularReflectance, diffuse, specular);\n}\n\n#ifdef HX_FRAGMENT_SHADER\nfloat hx_calculateShadows(HX_PointLight light, samplerCube shadowMap, vec3 viewPos)\n{\n    vec3 dir = viewPos - light.position;\n    // go from view space back to world space, as a vector\n    dir = mat3(light.shadowMapMatrix) * dir;\n    return hx_point_readShadow(shadowMap, dir, light.rcpRadius, light.depthBias);\n}\n#endif';

ShaderLibrary._files['spot_light.glsl'] = 'struct HX_SpotLight\n{\n    vec3 color;\n    vec3 position;\n    vec3 direction;\n    float radius;\n    float rcpRadius;\n    vec2 angleData;    // cos(inner), rcp(cos(outer) - cos(inner))\n    float sinOuterAngle;    // only used in deferred, hence separate\n\n    mat4 shadowMapMatrix;\n    float depthBias;\n};\n\nvoid hx_calculateLight(HX_SpotLight light, HX_GeometryData geometry, vec3 viewVector, vec3 viewPosition, vec3 normalSpecularReflectance, out vec3 diffuse, out vec3 specular)\n{\n    vec3 direction = viewPosition - light.position;\n    float attenuation = dot(direction, direction);  // distance squared\n    float distance = sqrt(attenuation);\n    // normalize\n    direction /= distance;\n\n    float cosAngle = dot(light.direction, direction);\n\n    attenuation = max((1.0 - distance * light.rcpRadius) / attenuation, 0.0);\n    attenuation *=  saturate((cosAngle - light.angleData.x) * light.angleData.y);\n\n	hx_brdf(geometry, direction, viewVector, viewPosition, light.color * attenuation, normalSpecularReflectance, diffuse, specular);\n}\n\n#ifdef HX_FRAGMENT_SHADER\nfloat hx_calculateShadows(HX_SpotLight light, sampler2D shadowMap, vec3 viewPos)\n{\n    return hx_spot_readShadow(shadowMap, viewPos, light.shadowMapMatrix, light.depthBias);\n}\n#endif';

ShaderLibrary._files['bloom_composite_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D bloomTexture;\nuniform sampler2D hx_backbuffer;\nuniform float strength;\n\nvoid main()\n{\n	gl_FragColor = texture2D(hx_backbuffer, uv) + texture2D(bloomTexture, uv) * strength;\n}';

ShaderLibrary._files['bloom_composite_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	   uv = hx_texCoord;\n	   gl_Position = hx_position;\n}';

ShaderLibrary._files['bloom_threshold_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_backbuffer;\n\nuniform float threshold;\n\nvoid main()\n{\n        vec4 color = texture2D(hx_backbuffer, uv);\n        float originalLuminance = .05 + hx_luminance(color);\n        float targetLuminance = max(originalLuminance - threshold, 0.0);\n        gl_FragColor = color * targetLuminance / originalLuminance;\n}\n';

ShaderLibrary._files['default_post_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	gl_Position = hx_position;\n}';

ShaderLibrary._files['fog_fragment.glsl'] = 'varying vec2 uv;\nvarying vec3 viewDir;\n\nuniform vec3 tint;\nuniform float density;\nuniform float startDistance;\nuniform float heightFallOff;\n\nuniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\nuniform vec3 hx_cameraWorldPosition;\n\nuniform sampler2D hx_gbufferNormalDepth;\nuniform sampler2D hx_backbuffer;\n\nvoid main()\n{\n    vec4 normalDepth = texture2D(hx_gbufferNormalDepth, uv);\n	vec4 color = texture2D(hx_backbuffer, uv);\n	float depth = hx_decodeLinearDepth(normalDepth);\n	// do not fog up skybox\n	if (normalDepth.z == 1.0 && normalDepth.w == 1.0) depth = 0.0;\n	float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n	vec3 viewVec = viewDir * absViewZ;\n	float fogFactor = max(length(viewVec) - startDistance, 0.0);// * exp(-heightFallOff * hx_cameraWorldPosition.y);\n//    if( abs( viewVec.y ) > 0.1 )\n//	{\n		float t = heightFallOff * (viewVec.y + hx_cameraWorldPosition.y);\n		fogFactor *= saturate(( 1.0 - exp( -t ) ) / t);\n//	}\n\n	float fog = clamp(exp(-fogFactor * density), 0.0, 1.0);\n	color.xyz = mix(tint, color.xyz, fog);\n	gl_FragColor = color;\n}';

ShaderLibrary._files['fog_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\nuniform mat4 hx_cameraWorldMatrix;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    viewDir = mat3(hx_cameraWorldMatrix) * hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n    gl_Position = hx_position;\n}';

ShaderLibrary._files['fxaa_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_backbuffer;\nuniform vec2 hx_rcpRenderTargetResolution;\nuniform float edgeThreshold;\nuniform float edgeThresholdMin;\nuniform float edgeSharpness;\n\nfloat luminanceHint(vec4 color)\n{\n	return .30/.59 * color.r + color.g;\n}\n\nvoid main()\n{\n	vec4 center = texture2D(hx_backbuffer, uv);\n	vec2 halfRes = vec2(hx_rcpRenderTargetResolution.x, hx_rcpRenderTargetResolution.y) * .5;\n	float topLeftLum = luminanceHint(texture2D(hx_backbuffer, uv + vec2(-halfRes.x, halfRes.y)));\n	float bottomLeftLum = luminanceHint(texture2D(hx_backbuffer, uv + vec2(-halfRes.x, -halfRes.y)));\n	float topRightLum = luminanceHint(texture2D(hx_backbuffer, uv + vec2(halfRes.x, halfRes.y)));\n	float bottomRightLum = luminanceHint(texture2D(hx_backbuffer, uv + vec2(halfRes.x, -halfRes.y)));\n\n	float centerLum = luminanceHint(center);\n	float minLum = min(min(topLeftLum, bottomLeftLum), min(topRightLum, bottomRightLum));\n	float maxLum = max(max(topLeftLum, bottomLeftLum), max(topRightLum, bottomRightLum));\n	float range = max(centerLum, maxLum) - min(centerLum, minLum);\n	float threshold = max(edgeThresholdMin, maxLum * edgeThreshold);\n	float applyFXAA = range < threshold? 0.0 : 1.0;\n\n	float diagDiff1 = bottomLeftLum - topRightLum;\n	float diagDiff2 = bottomRightLum - topLeftLum;\n	vec2 dir1 = normalize(vec2(diagDiff1 + diagDiff2, diagDiff1 - diagDiff2));\n	vec4 sampleNeg1 = texture2D(hx_backbuffer, uv - halfRes * dir1);\n	vec4 samplePos1 = texture2D(hx_backbuffer, uv + halfRes * dir1);\n\n	float minComp = min(abs(dir1.x), abs(dir1.y)) * edgeSharpness;\n	vec2 dir2 = clamp(dir1.xy / minComp, -2.0, 2.0) * 2.0;\n	vec4 sampleNeg2 = texture2D(hx_backbuffer, uv - hx_rcpRenderTargetResolution * dir2);\n	vec4 samplePos2 = texture2D(hx_backbuffer, uv + hx_rcpRenderTargetResolution * dir2);\n	vec4 tap1 = sampleNeg1 + samplePos1;\n	vec4 fxaa = (tap1 + sampleNeg2 + samplePos2) * .25;\n	float fxaaLum = luminanceHint(fxaa);\n	if ((fxaaLum < minLum) || (fxaaLum > maxLum))\n		fxaa = tap1 * .5;\n	gl_FragColor = mix(center, fxaa, applyFXAA);\n}';

ShaderLibrary._files['gaussian_blur_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sourceTexture;\n\nuniform vec2 stepSize;\n\nuniform float gaussianWeights[NUM_WEIGHTS];\n\nvoid main()\n{\n	vec4 total = texture2D(sourceTexture, uv) * gaussianWeights[0];\n    vec2 offset = vec2(0.0);\n\n	for (int i = 1; i <= RADIUS; ++i) {\n		offset += stepSize;\n	    vec4 s = texture2D(sourceTexture, uv + offset) + texture2D(sourceTexture, uv - offset);\n		total += s * gaussianWeights[i];\n	}\n\n	gl_FragColor = total;\n}';

ShaderLibrary._files['gaussian_blur_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n	uv = hx_texCoord;\n	gl_Position = hx_position;\n}';

ShaderLibrary._files['post_viewpos_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n    gl_Position = hx_position;\n}';

ShaderLibrary._files['ssr_fragment.glsl'] = '#derivatives\n\nuniform sampler2D hx_gbufferColor;\nuniform sampler2D hx_gbufferNormals;\nuniform sampler2D hx_gbufferSpecular;\nuniform sampler2D hx_gbufferDepth;\nuniform sampler2D hx_dither2D;\nuniform vec2 hx_renderTargetResolution;\n\nuniform sampler2D hx_frontbuffer;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\n\nuniform vec2 ditherTextureScale;\nuniform float hx_cameraNearPlaneDistance;\nuniform float hx_cameraFrustumRange;\nuniform float hx_rcpCameraFrustumRange;\nuniform mat4 hx_projectionMatrix;\n\nuniform float maxDistance;\nuniform float stepSize;\nuniform float maxRoughness;\n\n// all in viewspace\n// 0 is start, 1 is end\nfloat raytrace(in vec3 ray0, in vec3 rayDir, out float hitZ, out vec2 hitUV)\n{\n    vec4 dither = hx_sampleDefaultDither(hx_dither2D, uv * ditherTextureScale);\n    // Clip to the near plane\n	float rayLength = ((ray0.z + rayDir.z * maxDistance) > -hx_cameraNearPlaneDistance) ?\n						(-hx_cameraNearPlaneDistance - ray0.z) / rayDir.z : maxDistance;\n\n    vec3 ray1 = ray0 + rayDir * rayLength;\n\n    // only need the w component for perspective correct interpolation\n    // need to get adjusted ray end\'s uv value\n    vec4 hom0 = hx_projectionMatrix * vec4(ray0, 1.0);\n    vec4 hom1 = hx_projectionMatrix * vec4(ray1, 1.0);\n    float rcpW0 = 1.0 / hom0.w;\n    float rcpW1 = 1.0 / hom1.w;\n\n    hom0 *= rcpW0;\n    hom1 *= rcpW1;\n\n    // expressed in pixels, so we can snap to 1\n    // need to figure out the ratio between 1 pixel and the entire line \"width\" (if primarily vertical, it\'s actually height)\n\n    // line dimensions in pixels:\n\n    vec2 pixelSize = (hom1.xy - hom0.xy) * hx_renderTargetResolution * .5;\n\n    // line-\"width\" = max(abs(pixelSize.x), abs(pixelSize.y))\n    // ratio pixel/width = 1 / max(abs(pixelSize.x), abs(pixelSize.y))\n\n    float stepRatio = 1.0 / max(abs(pixelSize.x), abs(pixelSize.y)) * stepSize;\n\n    vec2 uvEnd = hom1.xy * .5 + .5;\n\n    vec2 dUV = (uvEnd - uv) * stepRatio;\n    hitUV = uv;\n\n    // linear depth\n    float rayDepth = (-ray0.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange;\n    float rayPerspDepth0 = rayDepth * rcpW0;\n    float rayPerspDepth1 = (-ray1.z - hx_cameraNearPlaneDistance) * hx_rcpCameraFrustumRange * rcpW1;\n    float rayPerspDepth = rayPerspDepth0;\n    // could probably optimize this:\n    float dRayD = (rayPerspDepth1 - rayPerspDepth0) * stepRatio;\n\n    float rcpW = rcpW0;\n    float dRcpW = (rcpW1 - rcpW0) * stepRatio;\n    float sceneDepth = rayDepth;\n\n    float amount = 0.0;\n\n    hitUV += dUV * dither.z;\n    rayPerspDepth += dRayD * dither.z;\n    rcpW += dRcpW * dither.z;\n\n    float sampleCount;\n    for (int i = 0; i < NUM_SAMPLES; ++i) {\n        rayDepth = rayPerspDepth / rcpW;\n\n        sceneDepth = hx_sampleLinearDepth(hx_gbufferDepth, hitUV);\n\n        if (rayDepth > sceneDepth + .001) {\n            amount = float(sceneDepth < 1.0);\n            sampleCount = float(i);\n            break;\n        }\n\n        hitUV += dUV;\n        rayPerspDepth += dRayD;\n        rcpW += dRcpW;\n    }\n\n    hitZ = -hx_cameraNearPlaneDistance - sceneDepth * hx_cameraFrustumRange;\n\n    amount *= clamp((1.0 - (sampleCount - float(NUM_SAMPLES)) / float(NUM_SAMPLES)) * 5.0, 0.0, 1.0);\n    return amount;\n}\n\nvoid main()\n{\n    vec4 colorSample = hx_gammaToLinear(texture2D(hx_gbufferColor, uv));\n    vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n    float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);\n    vec3 normalSpecularReflectance;\n    float roughness;\n    float metallicness;\n    hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);\n    vec3 normal = hx_decodeNormal(texture2D(hx_gbufferNormals, uv));\n    vec3 reflDir = reflect(normalize(viewDir), normal);\n\n    vec3 fresnel = hx_fresnel(normalSpecularReflectance, reflDir, normal);\n    // not physically correct, but attenuation is required to look good\n\n    // step for every pixel\n\n    float absViewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n    vec3 viewSpacePos = absViewZ * viewDir;\n\n    float hitZ = 0.0;\n    vec2 hitUV;\n    float amount = raytrace(viewSpacePos, reflDir, hitZ, hitUV);\n    float fadeFactor = 1.0 - clamp(reflDir.z * 2.0, 0.0, 1.0);\n\n    vec2 borderFactors = abs(hitUV * 2.0 - 1.0);\n    borderFactors = (1.0 - borderFactors) * 10.0;\n    fadeFactor *= clamp(borderFactors.x, 0.0, 1.0) * clamp(borderFactors.y, 0.0, 1.0);\n\n    float diff = viewSpacePos.z - hitZ;\n    fadeFactor *= hx_linearStep(-1.0, 0.0, diff);\n    fadeFactor *= hx_linearStep(maxRoughness, 0.0, roughness);\n\n    vec4 reflColor = texture2D(hx_frontbuffer, hitUV);\n\n    float amountUsed = amount * fadeFactor;\n    gl_FragColor = vec4(fresnel * reflColor.xyz, amountUsed);\n}\n\n';

ShaderLibrary._files['ssr_stencil_fragment.glsl'] = 'uniform sampler2D hx_gbufferSpecular;\n\nvarying vec2 uv;\n\nuniform float maxRoughness;\n\nvoid main()\n{\n    vec4 specularSample = texture2D(hx_gbufferSpecular, uv);\n    if (specularSample.x > maxRoughness)\n        discard;\n}\n\n';

ShaderLibrary._files['tonemap_filmic_fragment.glsl'] = 'void main()\n{\n	vec4 color = hx_getToneMapScaledColor();\n	vec3 x = max(vec3(0.0), color.xyz - 0.004);\n\n	// this has pow 2.2 gamma included, not valid if using fast gamma correction\n	//gl_FragColor = vec4((x * (6.2 * x + .5))/(x * (6.2 * x + 1.7) + 0.06), 1.0);\n\n    #ifdef HX_ACES\n    // ACES -> this desaturates less\n    	float a = 2.51;\n        float b = 0.03;\n        float c = 2.43;\n        float d = 0.59;\n        float e = 0.14;\n    #else\n    // Jim Hejl and Richard Burgess-Dawson\n        float a = 6.2;\n        float b = .5;\n        float c = 6.2;\n        float d = 1.7;\n        float e = 0.06;\n    #endif\n	gl_FragColor = vec4(clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0), 1.0);\n}';

ShaderLibrary._files['tonemap_reference_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D hx_backbuffer;\n\nvoid main()\n{\n	vec4 color = texture2D(hx_backbuffer, uv);\n	float lum = clamp(hx_luminance(color), 0.0, 1000.0);\n	float l = log(1.0 + lum);\n	gl_FragColor = vec4(l, l, l, 1.0);\n}';

ShaderLibrary._files['tonemap_reinhard_fragment.glsl'] = 'void main()\n{\n	vec4 color = hx_getToneMapScaledColor();\n	float lum = hx_luminance(color);\n	gl_FragColor = color / (1.0 + lum);\n}';

ShaderLibrary._files['blend_color_copy_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nuniform vec4 blendColor;\n\nvoid main()\n{\n    // extractChannel comes from a macro\n   gl_FragColor = texture2D(sampler, uv) * blendColor;\n}\n';

ShaderLibrary._files['copy_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n    // extractChannel comes from a macro\n   gl_FragColor = vec4(extractChannels(texture2D(sampler, uv)));\n\n#ifndef COPY_ALPHA\n   gl_FragColor.a = 1.0;\n#endif\n}\n';

ShaderLibrary._files['copy_to_gamma_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D sampler;\n\nvoid main()\n{\n   gl_FragColor = hx_linearToGamma(texture2D(sampler, uv));\n}';

ShaderLibrary._files['copy_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    gl_Position = hx_position;\n}';

ShaderLibrary._files['null_fragment.glsl'] = 'void main()\n{\n   gl_FragColor = vec4(1.0);\n}\n';

ShaderLibrary._files['null_vertex.glsl'] = 'attribute vec4 hx_position;\n\nvoid main()\n{\n    gl_Position = hx_position;\n}';

ShaderLibrary._files['dir_shadow_esm.glsl'] = 'vec4 hx_dir_getShadowMapValue(float depth)\n{\n    // I wish we could write exp directly, but precision issues (can\'t encode real floats)\n    return vec4(exp(HX_ESM_CONSTANT * depth));\n// so when blurring, we\'ll need to do ln(sum(exp())\n//    return vec4(depth);\n}\n\nfloat hx_dir_readShadow(sampler2D shadowMap, vec4 shadowMapCoord, float depthBias)\n{\n    float shadowSample = texture2D(shadowMap, shadowMapCoord.xy).x;\n    shadowMapCoord.z += depthBias;\n//    float diff = shadowSample - shadowMapCoord.z;\n//    return saturate(HX_ESM_DARKENING * exp(HX_ESM_CONSTANT * diff));\n    return saturate(HX_ESM_DARKENING * shadowSample * exp(-HX_ESM_CONSTANT * shadowMapCoord.z));\n}';

ShaderLibrary._files['dir_shadow_hard.glsl'] = 'vec4 hx_dir_getShadowMapValue(float depth)\n{\n    return hx_floatToRGBA8(depth);\n}\n\nfloat hx_dir_readShadow(sampler2D shadowMap, vec4 shadowMapCoord, float depthBias)\n{\n    float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy));\n    float diff = shadowMapCoord.z - shadowSample - depthBias;\n    return float(diff < 0.0);\n}';

ShaderLibrary._files['dir_shadow_pcf.glsl'] = '#ifdef HX_DIR_PCF_DITHER_SHADOWS\n    uniform sampler2D hx_dither2D;\n    uniform vec2 hx_dither2DTextureScale;\n#endif\n\nuniform vec2 hx_poissonDisk[32];\n\nvec4 hx_dir_getShadowMapValue(float depth)\n{\n    return hx_floatToRGBA8(depth);\n}\n\nfloat hx_dir_readShadow(sampler2D shadowMap, vec4 shadowMapCoord, float depthBias)\n{\n    float shadowTest = 0.0;\n\n    #ifdef HX_DIR_PCF_DITHER_SHADOWS\n        vec4 dither = hx_sampleDefaultDither(hx_dither2D, gl_FragCoord.xy * hx_dither2DTextureScale);\n        dither = vec4(dither.x, -dither.y, dither.y, dither.x) * HX_DIR_PCF_SOFTNESS;  // add radius scale\n    #else\n        vec4 dither = vec4(HX_DIR_PCF_SOFTNESS);\n    #endif\n\n    for (int i = 0; i < HX_DIR_PCF_NUM_SHADOW_SAMPLES; ++i) {\n        vec2 offset;\n        offset.x = dot(dither.xy, hx_poissonDisk[i]);\n        offset.y = dot(dither.zw, hx_poissonDisk[i]);\n        float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy + offset));\n        float diff = shadowMapCoord.z - shadowSample - depthBias;\n        shadowTest += float(diff < 0.0);\n    }\n\n    return shadowTest * HX_DIR_PCF_RCP_NUM_SHADOW_SAMPLES;\n}';

ShaderLibrary._files['dir_shadow_vsm.glsl'] = '#derivatives\n\nvec4 hx_dir_getShadowMapValue(float depth)\n{\n    float dx = dFdx(depth);\n    float dy = dFdy(depth);\n    float moment2 = depth * depth + 0.25*(dx*dx + dy*dy);\n\n    #if defined(HX_HALF_FLOAT_TEXTURES_LINEAR) || defined(HX_FLOAT_TEXTURES_LINEAR)\n    return vec4(depth, moment2, 0.0, 1.0);\n    #else\n    return vec4(hx_floatToRG8(depth), hx_floatToRG8(moment2));\n    #endif\n}\n\nfloat hx_dir_readShadow(sampler2D shadowMap, vec4 shadowMapCoord, float depthBias)\n{\n    vec4 s = texture2D(shadowMap, shadowMapCoord.xy);\n    #if defined(HX_HALF_FLOAT_TEXTURES_LINEAR) || defined(HX_FLOAT_TEXTURES_LINEAR)\n    vec2 moments = s.xy;\n    #else\n    vec2 moments = vec2(hx_RG8ToFloat(s.xy), hx_RG8ToFloat(s.zw));\n    #endif\n    shadowMapCoord.z += depthBias;\n\n    float variance = moments.y - moments.x * moments.x;\n    variance = max(variance, HX_DIR_VSM_MIN_VARIANCE);\n\n    float diff = shadowMapCoord.z - moments.x;\n    float upperBound = 1.0;\n\n    // transparents could be closer to the light than casters\n    if (diff > 0.0)\n        upperBound = variance / (variance + diff*diff);\n\n    return saturate((upperBound - HX_DIR_VSM_LIGHT_BLEED_REDUCTION) * HX_DIR_VSM_RCP_LIGHT_BLEED_REDUCTION_RANGE);\n}';

ShaderLibrary._files['esm_blur_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D source;\nuniform vec2 direction; // this is 1/pixelSize\n\nfloat readValue(vec2 coord)\n{\n    float v = texture2D(source, coord).x;\n    return v;\n//    return exp(HX_ESM_CONSTANT * v);\n}\n\nvoid main()\n{\n    float total = readValue(uv);\n\n	for (int i = 1; i <= RADIUS; ++i) {\n	    vec2 offset = direction * float(i);\n		total += readValue(uv + offset) + readValue(uv - offset);\n	}\n\n//	gl_FragColor = vec4(log(total * RCP_NUM_SAMPLES) / HX_ESM_CONSTANT);\n	gl_FragColor = vec4(total * RCP_NUM_SAMPLES);\n}';

ShaderLibrary._files['point_shadow_hard.glsl'] = 'vec4 hx_point_getShadowMapValue(float distance)\n{\n    return hx_floatToRGBA8(distance);\n}\n\nfloat hx_point_readShadow(samplerCube shadowMap, vec3 worldDir, float rcpRadius, float depthBias)\n{\n    // in world direction, because rendering cube map in view space introduces temporal aliasing\n\n    float dist = length(worldDir);\n    worldDir /= dist;\n    float shadowSample = hx_RGBA8ToFloat(textureCube(shadowMap, worldDir));\n    float diff = dist * rcpRadius - shadowSample - depthBias;\n    return float(diff < 0.0);\n}';

ShaderLibrary._files['point_shadow_pcf.glsl'] = '#ifdef HX_POINT_PCF_DITHER_SHADOWS\n    uniform sampler2D hx_dither2D;\n    uniform vec2 hx_dither2DTextureScale;\n#endif\n\nuniform vec2 hx_poissonDisk[32];\n\nvec4 hx_point_getShadowMapValue(float distance)\n{\n    return hx_floatToRGBA8(distance);\n}\n\n#ifdef HX_FRAGMENT_SHADER\nfloat hx_point_readShadow(samplerCube shadowMap, vec3 worldDir, float rcpRadius, float depthBias)\n{\n    // in world direction, because rendering cube map in view space introduces temporal aliasing\n    float dist = length(worldDir);\n    worldDir /= dist;\n\n    // get the basis perpendicular to the sample vector to distribute the sphere samples correctly\n    float shadowTest = 0.0;\n    vec3 xDir = cross(worldDir, vec3(0.0, 1.0, 0.0));\n    vec3 yDir = cross(xDir, worldDir);\n\n    #ifdef HX_POINT_PCF_DITHER_SHADOWS\n        vec4 dither = hx_sampleDefaultDither(hx_dither2D, gl_FragCoord.xy * hx_dither2DTextureScale);\n        dither = vec4(dither.x, -dither.y, dither.y, dither.x) * HX_POINT_PCF_SOFTNESS;  // add radius scale\n    #else\n        vec4 dither = vec4(HX_POINT_PCF_SOFTNESS);\n    #endif\n\n    vec3 offset = vec3(0.0);\n    for (int i = 0; i < HX_POINT_PCF_NUM_SHADOW_SAMPLES; ++i) {\n        offset.x = dot(dither.xy, hx_poissonDisk[i]);\n        offset.y = dot(dither.zw, hx_poissonDisk[i]);\n        vec3 coord = worldDir + xDir * offset.x + yDir * offset.y;\n        float shadowSample = hx_RGBA8ToFloat(textureCube(shadowMap, coord));\n        float diff = dist * rcpRadius - shadowSample - depthBias;\n        shadowTest += float(diff < 0.0);\n    }\n\n\n    return shadowTest * HX_POINT_PCF_RCP_NUM_SHADOW_SAMPLES;\n}\n#endif';

ShaderLibrary._files['spot_shadow_hard.glsl'] = 'vec4 hx_spot_getShadowMapValue(float depth)\n{\n    return hx_floatToRGBA8(depth);\n}\n\nfloat hx_spot_readShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias)\n{\n    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);\n    shadowMapCoord /= shadowMapCoord.w;\n    shadowMapCoord.xyz = shadowMapCoord.xyz * .5 + .5;\n    float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy));\n    float diff = shadowMapCoord.z - shadowSample - depthBias;\n    return float(diff < 0.0);\n}';

ShaderLibrary._files['spot_shadow_pcf.glsl'] = '#ifdef HX_SPOT_PCF_DITHER_SHADOWS\n    uniform sampler2D hx_dither2D;\n    uniform vec2 hx_dither2DTextureScale;\n#endif\n\nuniform vec2 hx_poissonDisk[32];\n\nvec4 hx_spot_getShadowMapValue(float depth)\n{\n    return hx_floatToRGBA8(depth);\n}\n\n#ifdef HX_FRAGMENT_SHADER\nfloat hx_spot_readShadow(sampler2D shadowMap, vec3 viewPos, mat4 shadowMapMatrix, float depthBias)\n{\n    vec4 shadowMapCoord = shadowMapMatrix * vec4(viewPos, 1.0);\n    shadowMapCoord /= shadowMapCoord.w;\n    shadowMapCoord.xyz = shadowMapCoord.xyz * .5 + .5;\n    float shadowTest = 0.0;\n\n    #ifdef HX_SPOT_PCF_DITHER_SHADOWS\n        vec4 dither = hx_sampleDefaultDither(hx_dither2D, gl_FragCoord.xy * hx_dither2DTextureScale);\n        dither = vec4(dither.x, -dither.y, dither.y, dither.x) * HX_SPOT_PCF_SOFTNESS;  // add radius scale\n    #else\n        vec4 dither = vec4(HX_SPOT_PCF_SOFTNESS);\n    #endif\n\n    for (int i = 0; i < HX_SPOT_PCF_NUM_SHADOW_SAMPLES; ++i) {\n        vec2 offset;\n        offset.x = dot(dither.xy, hx_poissonDisk[i]);\n        offset.y = dot(dither.zw, hx_poissonDisk[i]);\n        float shadowSample = hx_RGBA8ToFloat(texture2D(shadowMap, shadowMapCoord.xy + offset));\n        float diff = shadowMapCoord.z - shadowSample - depthBias;\n        shadowTest += float(diff < 0.0);\n    }\n\n    return shadowTest * HX_SPOT_PCF_RCP_NUM_SHADOW_SAMPLES;\n}\n#endif';

ShaderLibrary._files['vsm_blur_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D source;\nuniform vec2 direction; // this is 1/pixelSize\n\nvec2 readValues(vec2 coord)\n{\n    vec4 s = texture2D(source, coord);\n    #if defined(HX_HALF_FLOAT_TEXTURES_LINEAR) || defined(HX_FLOAT_TEXTURES_LINEAR)\n    return s.xy;\n    #else\n    return vec2(hx_RG8ToFloat(s.xy), hx_RG8ToFloat(s.zw));\n    #endif\n}\n\nvoid main()\n{\n    vec2 total = readValues(uv);\n\n	for (int i = 1; i <= RADIUS; ++i) {\n	    vec2 offset = direction * float(i);\n		total += readValues(uv + offset) + readValues(uv - offset);\n	}\n\n    total *= RCP_NUM_SAMPLES;\n\n#if defined(HX_HALF_FLOAT_TEXTURES_LINEAR) || defined(HX_FLOAT_TEXTURES_LINEAR)\n    gl_FragColor = vec4(total, 0.0, 1.0);\n#else\n	gl_FragColor.xy = hx_floatToRG8(total.x);\n	gl_FragColor.zw = hx_floatToRG8(total.y);\n#endif\n}';

ShaderLibrary._files['snippets_general.glsl'] = '#define HX_LOG_10 2.302585093\n\nfloat saturate(float value)\n{\n    return clamp(value, 0.0, 1.0);\n}\n\nvec2 saturate(vec2 value)\n{\n    return clamp(value, 0.0, 1.0);\n}\n\nvec3 saturate(vec3 value)\n{\n    return clamp(value, 0.0, 1.0);\n}\n\nvec4 saturate(vec4 value)\n{\n    return clamp(value, 0.0, 1.0);\n}\n\n// Only for 0 - 1\nvec4 hx_floatToRGBA8(float value)\n{\n    vec4 enc = value * vec4(1.0, 255.0, 65025.0, 16581375.0);\n    // cannot fract first value or 1 would not be encodable\n    enc.yzw = fract(enc.yzw);\n    return enc - enc.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);\n}\n\nfloat hx_RGBA8ToFloat(vec4 rgba)\n{\n    return dot(rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));\n}\n\nvec2 hx_floatToRG8(float value)\n{\n    vec2 enc = vec2(1.0, 255.0) * value;\n    enc.y = fract(enc.y);\n    enc.x -= enc.y / 255.0;\n    return enc;\n}\n\nfloat hx_RG8ToFloat(vec2 rg)\n{\n    return dot(rg, vec2(1.0, 1.0/255.0));\n}\n\nvec2 hx_encodeNormal(vec3 normal)\n{\n    vec2 data;\n    float p = sqrt(-normal.z*8.0 + 8.0);\n    data = normal.xy / p + .5;\n    return data;\n}\n\nvec3 hx_decodeNormal(vec4 data)\n{\n    vec3 normal;\n    data.xy = data.xy*4.0 - 2.0;\n    float f = dot(data.xy, data.xy);\n    float g = sqrt(1.0 - f * .25);\n    normal.xy = data.xy * g;\n    normal.z = -(1.0 - f * .5);\n    return normal;\n}\n\nfloat hx_log10(float val)\n{\n    return log(val) / HX_LOG_10;\n}\n\nvec4 hx_gammaToLinear(vec4 color)\n{\n    #if defined(HX_GAMMA_CORRECTION_PRECISE)\n        color.x = pow(color.x, 2.2);\n        color.y = pow(color.y, 2.2);\n        color.z = pow(color.z, 2.2);\n    #elif defined(HX_GAMMA_CORRECTION_FAST)\n        color.xyz *= color.xyz;\n    #endif\n    return color;\n}\n\nvec3 hx_gammaToLinear(vec3 color)\n{\n    #if defined(HX_GAMMA_CORRECTION_PRECISE)\n        color.x = pow(color.x, 2.2);\n        color.y = pow(color.y, 2.2);\n        color.z = pow(color.z, 2.2);\n    #elif defined(HX_GAMMA_CORRECTION_FAST)\n        color.xyz *= color.xyz;\n    #endif\n    return color;\n}\n\nvec4 hx_linearToGamma(vec4 linear)\n{\n    #if defined(HX_GAMMA_CORRECTION_PRECISE)\n        linear.x = pow(linear.x, 0.454545);\n        linear.y = pow(linear.y, 0.454545);\n        linear.z = pow(linear.z, 0.454545);\n    #elif defined(HX_GAMMA_CORRECTION_FAST)\n        linear.xyz = sqrt(linear.xyz);\n    #endif\n    return linear;\n}\n\nvec3 hx_linearToGamma(vec3 linear)\n{\n    #if defined(HX_GAMMA_CORRECTION_PRECISE)\n        linear.x = pow(linear.x, 0.454545);\n        linear.y = pow(linear.y, 0.454545);\n        linear.z = pow(linear.z, 0.454545);\n    #elif defined(HX_GAMMA_CORRECTION_FAST)\n        linear.xyz = sqrt(linear.xyz);\n    #endif\n    return linear;\n}\n\n/*float hx_sampleLinearDepth(sampler2D tex, vec2 uv)\n{\n    return hx_RGBA8ToFloat(texture2D(tex, uv));\n}*/\n\nfloat hx_decodeLinearDepth(vec4 samp)\n{\n    return hx_RG8ToFloat(samp.zw);\n}\n\nvec3 hx_getFrustumVector(vec2 position, mat4 unprojectionMatrix)\n{\n    vec4 unprojNear = unprojectionMatrix * vec4(position, -1.0, 1.0);\n    vec4 unprojFar = unprojectionMatrix * vec4(position, 1.0, 1.0);\n    return unprojFar.xyz/unprojFar.w - unprojNear.xyz/unprojNear.w;\n}\n\n// view vector with z = 1, so we can use nearPlaneDist + linearDepth * (farPlaneDist - nearPlaneDist) as a scale factor to find view space position\nvec3 hx_getLinearDepthViewVector(vec2 position, mat4 unprojectionMatrix)\n{\n    vec4 unproj = unprojectionMatrix * vec4(position, 0.0, 1.0);\n    unproj /= unproj.w;\n    return unproj.xyz / unproj.z;\n}\n\n// THIS IS FOR NON_LINEAR DEPTH!\nfloat hx_depthToViewZ(float depthSample, mat4 projectionMatrix)\n{\n//    z = projectionMatrix[3][2] / (d * 2.0 - 1.0 + projectionMatrix[2][2])\n    return projectionMatrix[3][2] / (depthSample * 2.0 - 1.0 + projectionMatrix[2][2]);\n}\n\nvec3 hx_getNormalSpecularReflectance(float metallicness, float insulatorNormalSpecularReflectance, vec3 color)\n{\n    return mix(vec3(insulatorNormalSpecularReflectance), color, metallicness);\n}\n\nvec3 hx_fresnel(vec3 normalSpecularReflectance, vec3 lightDir, vec3 halfVector)\n{\n    float cosAngle = 1.0 - max(dot(halfVector, lightDir), 0.0);\n    // to the 5th power\n    float power = pow(cosAngle, 5.0);\n    return normalSpecularReflectance + (1.0 - normalSpecularReflectance) * power;\n}\n\n// https://seblagarde.wordpress.com/2011/08/17/hello-world/\nvec3 hx_fresnelProbe(vec3 normalSpecularReflectance, vec3 lightDir, vec3 normal, float roughness)\n{\n    float cosAngle = 1.0 - max(dot(normal, lightDir), 0.0);\n    // to the 5th power\n    float power = pow(cosAngle, 5.0);\n    float gloss = (1.0 - roughness) * (1.0 - roughness);\n    vec3 bound = max(vec3(gloss), normalSpecularReflectance);\n    return normalSpecularReflectance + (bound - normalSpecularReflectance) * power;\n}\n\n\nfloat hx_luminance(vec4 color)\n{\n    return dot(color.xyz, vec3(.30, 0.59, .11));\n}\n\nfloat hx_luminance(vec3 color)\n{\n    return dot(color, vec3(.30, 0.59, .11));\n}\n\n// linear variant of smoothstep\nfloat hx_linearStep(float lower, float upper, float x)\n{\n    return clamp((x - lower) / (upper - lower), 0.0, 1.0);\n}\n\nvec4 hx_sampleDefaultDither(sampler2D ditherTexture, vec2 uv)\n{\n    vec4 s = texture2D(ditherTexture, uv);\n\n    #ifndef HX_FLOAT_TEXTURES\n    s = s * 2.0 - 1.0;\n    #endif\n\n    return s;\n}\n\nvec3 hx_intersectCubeMap(vec3 rayOrigin, vec3 cubeCenter, vec3 rayDir, float cubeSize)\n{\n    vec3 t = (cubeSize * sign(rayDir) - (rayOrigin - cubeCenter)) / rayDir;\n    float minT = min(min(t.x, t.y), t.z);\n    return rayOrigin + minT * rayDir;\n}\n\n// sadly, need a parameter due to a bug in Internet Explorer / Edge. Just pass in 0.\n#ifdef HX_USE_SKINNING_TEXTURE\n#define HX_RCP_MAX_SKELETON_JOINTS 1.0 / float(HX_MAX_SKELETON_JOINTS - 1)\nmat4 hx_getSkinningMatrixImpl(vec4 weights, vec4 indices, sampler2D tex)\n{\n    mat4 m = mat4(0.0);\n    for (int i = 0; i < 4; ++i) {\n        mat4 t;\n        float index = indices[i] * HX_RCP_MAX_SKELETON_JOINTS;\n        t[0] = texture2D(tex, vec2(index, 0.0));\n        t[1] = texture2D(tex, vec2(index, 0.5));\n        t[2] = texture2D(tex, vec2(index, 1.0));\n        t[3] = vec4(0.0, 0.0, 0.0, 1.0);\n        m += weights[i] * t;\n    }\n    return m;\n}\n#define hx_getSkinningMatrix(v) hx_getSkinningMatrixImpl(hx_jointWeights, hx_jointIndices, hx_skinningTexture)\n#else\n#define hx_getSkinningMatrix(v) ( hx_jointWeights.x * mat4(hx_skinningMatrices[int(hx_jointIndices.x) * 3], hx_skinningMatrices[int(hx_jointIndices.x) * 3 + 1], hx_skinningMatrices[int(hx_jointIndices.x) * 3 + 2], vec4(0.0, 0.0, 0.0, 1.0)) + hx_jointWeights.y * mat4(hx_skinningMatrices[int(hx_jointIndices.y) * 3], hx_skinningMatrices[int(hx_jointIndices.y) * 3 + 1], hx_skinningMatrices[int(hx_jointIndices.y) * 3 + 2], vec4(0.0, 0.0, 0.0, 1.0)) + hx_jointWeights.z * mat4(hx_skinningMatrices[int(hx_jointIndices.z) * 3], hx_skinningMatrices[int(hx_jointIndices.z) * 3 + 1], hx_skinningMatrices[int(hx_jointIndices.z) * 3 + 2], vec4(0.0, 0.0, 0.0, 1.0)) + hx_jointWeights.w * mat4(hx_skinningMatrices[int(hx_jointIndices.w) * 3], hx_skinningMatrices[int(hx_jointIndices.w) * 3 + 1], hx_skinningMatrices[int(hx_jointIndices.w) * 3 + 2], vec4(0.0, 0.0, 0.0, 1.0)) )\n#endif';

ShaderLibrary._files['snippets_geometry.glsl'] = 'struct HX_GeometryData\n{\n    vec4 color;\n    vec3 normal;\n    float metallicness;\n    float normalSpecularReflectance;\n    float roughness;\n    float occlusion;\n    vec3 emission;\n    vec4 data;  // this can be anything the lighting model requires (only works with forward rendering)\n};\n\n// used for parsing deferred passes\nstruct HX_GBufferData\n{\n    HX_GeometryData geometry;\n\n    // extra decoding stuff\n    vec3 normalSpecularReflectance;\n    float linearDepth;\n};\n\nHX_GBufferData hx_parseGBuffer(sampler2D albedoTex, sampler2D normalDepthTex, sampler2D specularTex, vec2 uv)\n{\n    HX_GBufferData data;\n    vec4 albedoSample = texture2D(albedoTex, uv);\n    vec4 normalDepthSample = texture2D(normalDepthTex, uv);\n    vec4 specularSample = texture2D(specularTex, uv);\n    data.geometry.normal = hx_decodeNormal(normalDepthSample);\n    data.geometry.metallicness = specularSample.x;\n    data.geometry.normalSpecularReflectance = specularSample.y * .2;\n    data.geometry.roughness = max(specularSample.z, .01);\n    data.geometry.color = vec4(albedoSample.xyz * (1.0 - data.geometry.metallicness), 1.0);\n    data.geometry.occlusion = albedoSample.w;\n    data.normalSpecularReflectance = hx_getNormalSpecularReflectance(specularSample.x, data.geometry.normalSpecularReflectance, albedoSample.xyz);\n    data.linearDepth = hx_RG8ToFloat(normalDepthSample.zw);\n    return data;\n}';

ShaderLibrary._files['snippets_tonemap.glsl'] = 'varying vec2 uv;\n\n#ifdef HX_ADAPTIVE\nuniform sampler2D hx_luminanceMap;\nuniform float hx_luminanceMipLevel;\n#endif\n\nuniform float hx_exposure;\nuniform float hx_key;\n\nuniform sampler2D hx_backbuffer;\n\n\nvec4 hx_getToneMapScaledColor()\n{\n    #ifdef HX_ADAPTIVE\n    float referenceLuminance = exp(texture2DLodEXT(hx_luminanceMap, uv, hx_luminanceMipLevel).x) - 1.0;\n    referenceLuminance = clamp(referenceLuminance, .08, 1000.0);\n	float exposure = hx_key / referenceLuminance * hx_exposure;\n	#else\n	float exposure = hx_exposure;\n	#endif\n    return texture2D(hx_backbuffer, uv) * exposure;\n}';

ShaderLibrary._files['2d_to_cube_vertex.glsl'] = '// position to write to\nattribute vec4 hx_position;\n\n// the corner of the cube map\nattribute vec3 corner;\n\nvarying vec3 direction;\n\nvoid main()\n{\n    direction = corner;\n    gl_Position = hx_position;\n}\n';

ShaderLibrary._files['equirectangular_to_cube_fragment.glsl'] = '#define RECIPROCAL_PI2 0.15915494\n\nvarying vec3 direction;\n\nuniform sampler2D source;\n\nvoid main()\n{\n    vec3 dir = normalize(direction);\n    vec2 uv;\n    uv.x = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;\n	uv.y = dir.y * 0.5 + 0.5;\n    gl_FragColor = texture2D(source, uv);\n}\n';

ShaderLibrary._files['greyscale_to_rgba8.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D source;\n\nvoid main()\n{\n    gl_FragColor = hx_floatToRGBA8(texture2D(source, uv).x);\n}\n';

ShaderLibrary._files['smooth_heightmap_fragment.glsl'] = 'varying vec2 uv;\n\nuniform sampler2D reference;    // the source (8 bit) texture\nuniform sampler2D source;\n\nuniform vec2 stepSize;\n\nvoid main()\n{\n    float gauss[4];\n    gauss[0] = 0.201788613113303;\n    gauss[1] = 0.17755834971394;\n    gauss[2] = 0.120969095455128;\n    gauss[3] = 0.063811162332456;\n    float refHeight = texture2D(reference, uv).x;\n    float total = hx_RGBA8ToFloat(texture2D(source, uv)) * gauss[0];\n    float totalWeight = gauss[0];\n    float currentWeightL = 1.0;\n    float currentWeightR = 1.0;\n    vec2 offset = vec2(0.0);\n\n\n    for (int i = 0; i < 3; ++i) {\n        offset += stepSize;\n        float refLeft = texture2D(reference, uv - offset).x;\n        float refRight = texture2D(reference, uv + offset).x;\n        float heightLeft = hx_RGBA8ToFloat(texture2D(source, uv - offset));\n        float heightRight = hx_RGBA8ToFloat(texture2D(source, uv + offset));\n        // smooth out over N pixels that have the same reference height in the source image\n        currentWeightL = max(currentWeightL - abs(refLeft - refHeight) * 5.0, 0.0);\n        currentWeightR = max(currentWeightR - abs(refRight - refHeight) * 5.0, 0.0);\n        totalWeight += (currentWeightL + currentWeightR) * gauss[i + 1];\n        total += (heightLeft * currentWeightL + heightRight * currentWeightR) *  gauss[i + 1];\n    }\n\n    gl_FragColor = hx_floatToRGBA8(total / totalWeight);\n//    gl_FragColor = hx_floatToRGBA8(refHeight);\n}\n';

ShaderLibrary._files['ao_blur_fragment.glsl'] = 'varying vec2 uv1;\nvarying vec2 uv2;\nvarying vec2 uv3;\nvarying vec2 uv4;\n\nuniform sampler2D source;\n\nvoid main()\n{\n    vec4 total = texture2D(source, uv1) + texture2D(source, uv2) + texture2D(source, uv3) + texture2D(source, uv4);\n	gl_FragColor = total * .25;\n}';

ShaderLibrary._files['ao_blur_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nvarying vec2 uv1;\nvarying vec2 uv2;\nvarying vec2 uv3;\nvarying vec2 uv4;\n\nuniform vec2 pixelSize;\n\nvoid main()\n{\n	uv1 = hx_texCoord + vec2(-1.5, .5) * pixelSize;\n	uv2 = hx_texCoord + vec2(.5, .5) * pixelSize;\n	uv3 = hx_texCoord + vec2(.5, -1.5) * pixelSize;\n	uv4 = hx_texCoord + vec2(-1.5, -1.5) * pixelSize;\n	gl_Position = hx_position;\n}';

ShaderLibrary._files['hbao_fragment.glsl'] = 'uniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\nuniform vec2 hx_rcpRenderTargetResolution;\nuniform mat4 hx_projectionMatrix;\n\nuniform float strengthPerRay;\nuniform float halfSampleRadius;\nuniform float bias;\nuniform float rcpFallOffDistance;\nuniform vec2 ditherScale;\n\nuniform sampler2D hx_gbufferNormalDepth;\nuniform sampler2D sampleDirTexture;\nuniform sampler2D ditherTexture;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\nvarying vec3 frustumCorner;\n\nvec3 getViewPos(vec2 sampleUV)\n{\n    vec4 smp = texture2D(hx_gbufferNormalDepth, sampleUV);\n    float depth = hx_decodeLinearDepth(smp);\n    float viewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;\n    vec3 viewPos = frustumCorner * vec3(sampleUV * 2.0 - 1.0, 1.0);\n    return viewPos * viewZ;\n}\n\n// Retrieves the occlusion factor for a particular sample\nfloat getSampleOcclusion(vec2 sampleUV, vec3 centerViewPos, vec3 centerNormal, vec3 tangent, inout float topOcclusion)\n{\n    vec3 sampleViewPos = getViewPos(sampleUV);\n\n    // get occlusion factor based on candidate horizon elevation\n    vec3 horizonVector = sampleViewPos - centerViewPos;\n    float horizonVectorLength = length(horizonVector);\n\n    float occlusion;\n\n    // If the horizon vector points away from the tangent, make an estimate\n    if (dot(tangent, horizonVector) < 0.0)\n        occlusion = .5;\n    else\n        occlusion = dot(centerNormal, horizonVector) / horizonVectorLength;\n\n    // this adds occlusion only if angle of the horizon vector is higher than the previous highest one without branching\n    float diff = max(occlusion - topOcclusion, 0.0);\n    topOcclusion = max(occlusion, topOcclusion);\n\n    // attenuate occlusion contribution using distance function 1 - (d/f)^2\n    float distanceFactor = 1.0 - saturate(horizonVectorLength * rcpFallOffDistance);\n    return diff * distanceFactor;\n}\n\n// Retrieves the occlusion for a given ray\nfloat getRayOcclusion(vec2 direction, float jitter, vec2 projectedRadii, vec3 centerViewPos, vec3 centerNormal)\n{\n    // calculate the nearest neighbour sample along the direction vector\n    vec2 texelSizedStep = direction * hx_rcpRenderTargetResolution;\n    direction *= projectedRadii;\n\n    // gets the tangent for the current ray, this will be used to handle opposing horizon vectors\n    // Tangent is corrected with respect to face normal by projecting it onto the tangent plane defined by the normal\n    vec3 tangent = getViewPos(uv + texelSizedStep) - centerViewPos;\n    tangent -= dot(centerNormal, tangent) * centerNormal;\n\n    vec2 stepUV = direction.xy / float(NUM_SAMPLES_PER_RAY - 1);\n\n    // jitter the starting position for ray marching between the nearest neighbour and the sample step size\n    vec2 jitteredOffset = mix(texelSizedStep, stepUV, jitter);\n    //stepUV *= 1.0 + jitter * .1;\n    vec2 sampleUV = uv + jitteredOffset;\n\n    // top occlusion keeps track of the occlusion contribution of the last found occluder.\n    // set to bias value to avoid near-occluders\n    float topOcclusion = bias;\n    float occlusion = 0.0;\n\n    // march!\n    for (int step = 0; step < NUM_SAMPLES_PER_RAY; ++step) {\n        occlusion += getSampleOcclusion(sampleUV, centerViewPos, centerNormal, tangent, topOcclusion);\n        sampleUV += stepUV;\n    }\n\n    return occlusion;\n}\n\nvoid main()\n{\n    vec4 normalDepth = texture2D(hx_gbufferNormalDepth, uv);\n    vec3 centerNormal = hx_decodeNormal(normalDepth);\n    float centerDepth = hx_decodeLinearDepth(normalDepth);\n    float viewZ = hx_cameraNearPlaneDistance + centerDepth * hx_cameraFrustumRange;\n    vec3 centerViewPos = viewZ * viewDir;\n\n    // clamp z to a minimum, so the radius does not get excessively large in screen-space\n    float projRadius = halfSampleRadius / max(centerViewPos.z, 7.0);\n    vec2 projectedRadii = projRadius * vec2(hx_projectionMatrix[0][0], hx_projectionMatrix[1][1]);\n\n    // do not take more steps than there are pixels\n    float totalOcclusion = 0.0;\n\n    vec2 randomFactors = texture2D(ditherTexture, uv * ditherScale).xy;\n\n    vec2 rayUV = vec2(0.0);\n    for (int i = 0; i < NUM_RAYS; ++i) {\n        rayUV.x = (float(i) + randomFactors.x) / float(NUM_RAYS);\n        vec2 sampleDir = texture2D(sampleDirTexture, rayUV).xy * 2.0 - 1.0;\n        totalOcclusion += getRayOcclusion(sampleDir, randomFactors.y, projectedRadii, centerViewPos, centerNormal);\n    }\n\n    totalOcclusion = 1.0 - clamp(strengthPerRay * totalOcclusion, 0.0, 1.0);\n    gl_FragColor = vec4(vec3(totalOcclusion), 1.0);\n}';

ShaderLibrary._files['hbao_vertex.glsl'] = 'attribute vec4 hx_position;\nattribute vec2 hx_texCoord;\n\nuniform mat4 hx_inverseProjectionMatrix;\n\nvarying vec2 uv;\nvarying vec3 viewDir;\nvarying vec3 frustumCorner;\n\nvoid main()\n{\n    uv = hx_texCoord;\n    viewDir = hx_getLinearDepthViewVector(hx_position.xy, hx_inverseProjectionMatrix);\n    frustumCorner = hx_getLinearDepthViewVector(vec2(1.0, 1.0), hx_inverseProjectionMatrix);\n    gl_Position = hx_position;\n}';

ShaderLibrary._files['ssao_fragment.glsl'] = 'uniform mat4 hx_projectionMatrix;\nuniform mat4 hx_cameraWorldMatrix;\nuniform float hx_cameraFrustumRange;\nuniform float hx_cameraNearPlaneDistance;\n\nuniform vec2 ditherScale;\nuniform float strengthPerSample;\nuniform float rcpFallOffDistance;\nuniform float sampleRadius;\nuniform vec3 samples[NUM_SAMPLES]; // w contains bias\n\nuniform sampler2D ditherTexture;\nuniform sampler2D hx_gbufferNormalDepth;\n\nvarying vec2 uv;\n\nvoid main()\n{\n    vec4 normalDepth = texture2D(hx_gbufferNormalDepth, uv);\n    vec3 centerNormal = hx_decodeNormal(normalDepth);\n    float centerDepth = hx_decodeLinearDepth(normalDepth);\n    float totalOcclusion = 0.0;\n    vec3 dither = texture2D(ditherTexture, uv * ditherScale).xyz;\n    vec3 randomPlaneNormal = normalize(dither - .5);\n    float w = hx_cameraNearPlaneDistance + centerDepth * hx_cameraFrustumRange;\n    vec3 sampleRadii;\n    sampleRadii.xy = sampleRadius * .5 / w * vec2(hx_projectionMatrix[0][0], hx_projectionMatrix[1][1]);\n    sampleRadii.z = sampleRadius;\n\n    for (int i = 0; i < NUM_SAMPLES; ++i) {\n        vec3 sampleOffset = reflect(samples[i], randomPlaneNormal);\n        vec3 normOffset = normalize(sampleOffset);\n        float cosFactor = dot(normOffset, centerNormal);\n        float sign = sign(cosFactor);\n        sampleOffset *= sign;\n        cosFactor *= sign;\n\n        vec3 scaledOffset = sampleOffset * sampleRadii;\n\n        vec2 samplePos = uv + scaledOffset.xy;\n        normalDepth = texture2D(hx_gbufferNormalDepth, samplePos);\n        float occluderDepth = hx_decodeLinearDepth(normalDepth);\n\n        // can ignore nearDist\n        float occluderZ = hx_cameraFrustumRange * occluderDepth;\n        float sampleZ = centerDepth * hx_cameraFrustumRange + scaledOffset.z;\n\n        float distanceFactor = 1.0 - (sampleZ - occluderZ) * rcpFallOffDistance;\n\n        float sampleOcclusion = float(occluderZ < sampleZ);\n        totalOcclusion += sampleOcclusion * distanceFactor * cosFactor;\n    }\n    gl_FragColor = vec4(vec3(1.0 - totalOcclusion * strengthPerSample), 1.0);\n}';

/**
 * Some utilities for Arrays.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var ArrayUtils = {
    /**
     * Randomizes the order of the elements in the array.
     */
    shuffle: function(array)
    {
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    },

    /**
     * Loops over a collection (Array or Object) and calls a function(obj, key).
     */
    forEach: function(obj, func)
    {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                func(obj[key], key);
            }
        }
    }
};

/**
 * @classdesc
 * <p>Signal provides an implementation of the Observer pattern. Functions can be bound to the Signal, and they will be
 * called when the Signal is dispatched. This implementation allows for keeping scope.</p>
 * <p>When dispatch has an object passed to it, this is called the "payload" and will be passed as a parameter to the
 * listener functions</p>
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Signal()
{
    this._listeners = [];
    this._lookUp = {};
}

/**
 * Signals keep "this" of the caller, because having this refer to the signal itself would be silly
 */
Signal.prototype =
{
    /**
     * Binds a function as a listener to the Signal
     * @param {function(*):void} listener A function to be called when the function is dispatched.
     * @param {Object} [thisRef] If provided, the object that will become "this" in the function. Used in a class as such:
     *
     * @example
     * signal.bind(this.methodFunction, this);
     */
    bind: function(listener, thisRef)
    {
        this._lookUp[listener] = this._listeners.length;
        var callback = thisRef? listener.bind(thisRef) : listener;
        this._listeners.push(callback);
    },

    /**
     * Removes a function as a listener.
     */
    unbind: function(listener)
    {
        var index = this._lookUp[listener];
        this._listeners.splice(index, 1);
        delete this._lookUp[listener];
    },

    /**
     * Dispatches the signal, causing all the listening functions to be called.
     * @param [payload] An optional object to be passed in as a parameter to the listening functions. Can be used to provide data.
     */
    dispatch: function(payload)
    {
        var len = this._listeners.length;
        for (var i = 0; i < len; ++i)
            this._listeners[i](payload);
    },

    /**
     * Returns whether there are any functions bound to the Signal or not.
     */
    get hasListeners()
    {
        return this._listeners.length > 0;
    }
};

/**
 * Encapsulates behaviour to handle frames and time differences.
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FrameTicker()
{
    this._isRunning = false;
    this._dt = 0;
    this._currentTime = 0;
    this._tickFunc = this._tick.bind(this);
    this.onTick = new Signal();
}

FrameTicker.prototype = {

    /**
     * Starts automatically calling a callback function every animation frame.
     * @param callback Function to call when a frame needs to be processed.
     */
    start: function() {
        if (this._isRunning) return;
        this._currentTime = 0;
        this._isRunning = true;
        requestAnimationFrame(this._tickFunc);
    },

    /**
     * Stops calling the function.
     */
    stop: function() {
        this._isRunning = false;
    },

    /**
     * @returns {number} The time passed in between two frames
     */
    get dt() { return this._dt; },
    get time() { return this._currentTime; },

    /**
     * @private
     */
    _tick: function(time) {
        if (!this._isRunning) return;

        requestAnimationFrame(this._tickFunc);

        // difference with previous currentTime
        // var currentTime = (performance || Date).now();
        if (this._currentTime === 0)
            this._dt = 16;
        else
            this._dt = time - this._currentTime;

        this._currentTime = time;

        this.onTick.dispatch(this._dt);
    }
};

/**
 * @classdesc
 * Color is an object representing an RGBA color. It can contain HDR values (> 1).
 *
 * @param rOrHex The red component of the colour or a hexadecimal representation of the entire colour.
 * @param g The green component of the colour or omitted in favor of the hexadecimal representation.
 * @param b The blue component of the colour or omitted in favor of the hexadecimal representation.
 * @param a The alpha component of the colour or omitted in favor of the hexadecimal representation.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Color(rOrHex, g, b, a)
{
    /**
     * The green component of the colour.
     * @type {number}
     */
    this.r = 0.0;

    /**
     * The green component of the colour.
     * @type {number}
     */
    this.g = 0.0;

    /**
     * The blue component of the colour.
     * @type {number}
     */
    this.b = 0.0;

    /**
     * The alpha component of the colour.
     * @type {number}
     */
    this.a = 1.0;
    this.set(rOrHex, g, b, a);
}

/**
 * Linearly interpolates between two Colors.
 * @param {Color} a The first color to interpolate from.
 * @param {Color} b The second color to interpolate to.
 * @param {Number} t The interpolation factor.
 * @param {Color} [target] An optional target color. If not provided, a new Color object will be created and returned.
 * @returns {Color} The interpolated color.
 */
Color.lerp = function(a, b, t, target)
{
    target = target || new Color();
    var ar = a.r, ag = a.g, ab = a.b, aa = a.a;

    target.r = ar + (b.r - ar) * t;
    target.g = ag + (b.g - ag) * t;
    target.b = ab + (b.b - ab) * t;
    target.a = aa + (b.a - aa) * t;
    return target;
};

Color.prototype =
{
    /**
     * Sets the color values directly.
     * @param rOrHex The red component of the colour or a hexadecimal representation of the entire colour.
     * @param g The green component of the colour or omitted in favor of the hexadecimal representation.
     * @param b The blue component of the colour or omitted in favor of the hexadecimal representation.
     * @param a The alpha component of the colour or omitted in favor of the hexadecimal representation.
     */
    set: function (rOrHex, g, b, a)
    {
        if (rOrHex === undefined) {
            this.a = 1.0;
            this.r = 1.0;
            this.g = 1.0;
            this.b = 1.0;
        }
        else if (g === undefined) {
            this.a = 1.0;
            this.r = ((rOrHex & 0xff0000) >>> 16) / 255.0;
            this.g = ((rOrHex & 0x00ff00) >>> 8) / 255.0;
            this.b = (rOrHex & 0x0000ff) / 255.0;
        }
        else {
            this.r = rOrHex;
            this.g = g;
            this.b = b;
            this.a = a === undefined ? 1.0 : a;
        }
    },

    /**
     * Scales all components (except alpha).
     */
    scale: function(s)
    {
        this.r *= s;
        this.g *= s;
        this.b *= s;
    },

    /**
     * Returns a numerical representation of the entire colour. Only works for non-HDR color values.
     */
    hex: function ()
    {
        var r = (Math.min(this.r, 1.0) * 0xff);
        var g = (Math.min(this.g, 1.0) * 0xff);
        var b = (Math.min(this.b, 1.0) * 0xff);

        return (r << 16) | (g << 8) | b;
    },

    /**
     * Returns the luminance value of the color.
     */
    luminance: function ()
    {
        return this.r * .30 + this.g * 0.59 + this.b * .11;
    },

    /**
     * Converts the color from gamma space to linear space.
     * @param [target] An optional target Color. If not provided, a new Color object will be created and returned.
     * @returns {Color} The Color in linear space.
     *
     * @see {@link http://www.kinematicsoup.com/news/2016/6/15/gamma-and-linear-space-what-they-are-how-they-differ}
     */
    gammaToLinear: function (target)
    {
        target = target || new Color();

        if (META.OPTIONS.usePreciseGammaCorrection) {
            target.r = Math.pow(this.r, 2.2);
            target.g = Math.pow(this.g, 2.2);
            target.b = Math.pow(this.b, 2.2);
        }
        else {
            target.r = this.r * this.r;
            target.g = this.g * this.g;
            target.b = this.b * this.b;
        }
        target.a = this.a;

        return target;
    },

    /**
     * Converts the color from linear space to gamma space.
     * @param [target] An optional target Color. If not provided, a new Color object will be created and returned.
     * @returns {Color} The Color in linear space.
     *
     * @see {@link http://www.kinematicsoup.com/news/2016/6/15/gamma-and-linear-space-what-they-are-how-they-differ}
     */
    linearToGamma: function (target)
    {
        target = target || new Color();

        if (META.OPTIONS.usePreciseGammaCorrection) {
            target.r = Math.pow(this.r, .454545);
            target.g = Math.pow(this.g, .454545);
            target.b = Math.pow(this.b, .454545);
        }
        else {
            target.r = Math.sqrt(this.r);
            target.g = Math.sqrt(this.g);
            target.b = Math.sqrt(this.b);
        }
        target.a = this.a;

        return target;
    },

    /**
     * Copies the values from another Color object.
     */
    copyFrom: function (color)
    {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        this.a = color.a;
    },

    /**
     * @ignore
     */
    toString: function ()
    {
        return "Color(" + this.r + ", " + this.g + ", " + this.b + ", " + this.a + ")";
    },

    /**
     * Returns a copy of this Color.
     */
    clone: function ()
    {
        var color = new Color();
        color.r = this.r;
        color.g = this.g;
        color.b = this.b;
        color.a = this.a;
        return color;
    }
};

/**
 * Preset for black with alpha 1
 */
Color.BLACK = new Color(0, 0, 0, 1);
/**
 * Preset for black with alpha 0
 */
Color.ZERO = new Color(0, 0, 0, 0);
/**
 * Preset for red
 */
Color.RED = new Color(1, 0, 0, 1);
/**
 * Preset for green
 */
Color.GREEN = new Color(0, 1, 0, 1);
/**
 * Preset for blue
 */
Color.BLUE = new Color(0, 0, 1, 1);
/**
 * Preset for yellow
 */
Color.YELLOW = new Color(1, 1, 0, 1);
/**
 * Preset for magenta
 */
Color.MAGENTA = new Color(1, 0, 1, 1);
/**
 * Preset for cyan
 */
Color.CYAN = new Color(0, 1, 1, 1);
/**
 * Preset for white
 */
Color.WHITE = new Color(1, 1, 1, 1);

// Just contains some convenience methods and GL management stuff that shouldn't be called directly
// Will become an abstraction layer
// properties to keep track of render state
var _numActiveAttributes = 0;
var _depthMask = true;
var _colorMask = true;
var _cullMode = null;
var _invertCullMode = false;
var _depthTest = null;
var _blendState = null;
var _renderTarget = null;

// this is so that effects can push states on the stack
// the renderer at the root just pushes one single state and invalidates that constantly
var _stencilState = null;

var _glStats =
    {
        numDrawCalls: 0,
        numTriangles: 0,
        numClears: 0
    };

var _clearGLStats = function ()
{
    _glStats.numDrawCalls = 0;
    _glStats.numTriangles = 0;
    _glStats.numClears = 0;
};

var gl = null;


/**
 * GL forms a bridge to native WebGL. It's used to keep track of certain states. If the method is in here, use it instead of the raw gl calls.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var GL = {
    gl: null,

    _setGL: function (value)
    {
        GL.gl = gl = value;
    },

    /**
     * Clears the current render target.
     *
     * @param [clearMask] One of {@linkcode ClearMask}. If omitted, all planes will be cleared.
     */
    clear: function (clearMask)
    {
        if (clearMask === undefined)
            clearMask = ClearMask.COMPLETE;

        gl.clear(clearMask);
        ++_glStats.numClears;
    },

    /**
     * Draws elements for the current index buffer bound.
     * @param elementType One of {@linkcode ElementType}.
     * @param numIndices The amount of indices in the index buffer
     * @param offset The first index to start drawing from.
     * @param [indexType] The data type of the index buffer/
     */
    drawElements: function (elementType, numIndices, offset, indexType)
    {
        indexType = indexType || gl.UNSIGNED_SHORT;
        ++_glStats.numDrawCalls;
        _glStats.numTriangles += numIndices / 3;
        gl.drawElements(elementType, numIndices, indexType, offset * 2);
    },


    /**
     * Sets the viewport to render into.
     * @param {*} rect Any object with a width and height property, so it can be a {@linkcode Rect} or even a {linkcode FrameBuffer}. If x and y are present, it will use these too.
     */
    setViewport: function (rect)
    {
        if (rect)
            gl.viewport(rect.x || 0, rect.y || 0, rect.width, rect.height);
        else
            gl.viewport(0, 0, META.TARGET_CANVAS.width, META.TARGET_CANVAS.height);
    },

    /**
     * Gets the current render target.
     */
    getCurrentRenderTarget: function ()
    {
        return _renderTarget;
    },

    /**
     * Specifies whether or not to write color. Uses all channels for efficiency (and the current lack of need for
     * anything else).
     */
    setColorMask: function(value)
    {
        if (value === _colorMask) return;
        _colorMask = value;
        gl.colorMask(value, value, value, value);
    },

    /**
     * Sets the current render target. It's recommended to clear afterwards for certain platforms.
     */
    setRenderTarget: function (frameBuffer)
    {
        _renderTarget = frameBuffer;

        var target = _renderTarget;

        if (target) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, target._fbo);

            if (target._numColorTextures > 1)
                capabilities.EXT_DRAW_BUFFERS.drawBuffersWEBGL(target._drawBuffers);
        }
        else
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        GL.setViewport(frameBuffer);
    },

    /**
     * Enables a given count of vertex attributes.
     */
    enableAttributes: function (count)
    {
        var numActiveAttribs = _numActiveAttributes;
        var i;

        if (numActiveAttribs < count) {
            for (i = numActiveAttribs; i < count; ++i)
                gl.enableVertexAttribArray(i);
        }
        else if (numActiveAttribs > count) {
            // bug in WebGL/ANGLE? When rendering to a render target, disabling vertex attrib array 1 causes errors when using only up to the index below o_O
            // so for now + 1
            count += 1;
            for (i = count; i < numActiveAttribs; ++i) {
                gl.disableVertexAttribArray(i);
            }
        }

        _numActiveAttributes = count;
    },

    /**
     * Sets the clear color.
     */
    setClearColor: function (color)
    {
        color = color instanceof Color ? color : new Color(color);
        gl.clearColor(color.r, color.g, color.b, color.a);
    },

    /**
     * Sets the cull mode.
     */
    setCullMode: function (value)
    {
        if (_cullMode === value) return;

        if (value === CullMode.NONE)
            gl.disable(gl.CULL_FACE);
        else {
            // was disabled before
            if (_cullMode === CullMode.NONE)
                gl.enable(gl.CULL_FACE);

            var cullMode = value;

            if (_invertCullMode) {
                if (cullMode === CullMode.BACK)
                    cullMode = CullMode.FRONT;
                else if (cullMode === CullMode.FRONT)
                    cullMode = CullMode.BACK;
            }

            gl.cullFace(cullMode);
        }

        _cullMode = value;
    },

    setInvertCulling: function(value)
    {
        if (_invertCullMode === value) return;
        _invertCullMode = value;

        // just make sure it gets assigned next time
        _cullMode = CullMode.NONE;
    },

    /**
     * Sets the depth mask.
     */
    setDepthMask: function (value)
    {
        if (_depthMask === value) return;
        _depthMask = value;
        gl.depthMask(_depthMask);
    },

    /**
     * Sets the depth test.
     */
    setDepthTest: function (value)
    {
        if (_depthTest === value) return;
        _depthTest = value;

        if (_depthTest === Comparison.DISABLED)
            gl.disable(gl.DEPTH_TEST);
        else {
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(_depthTest);
        }
    },

    /**
     * Sets the blend state.
     *
     * @see {@linkcode BlendState}
     */
    setBlendState: function (value)
    {
        if (_blendState === value) return;
        _blendState = value;

        var blendState = _blendState;
        if (!blendState || blendState.enabled === false)
            gl.disable(gl.BLEND);
        else {
            gl.enable(gl.BLEND);

            if (blendState.alphaSrcFactor === null || blendState.alphaSrcFactor === undefined)
                gl.blendFunc(blendState.srcFactor, blendState.dstFactor);
            else
                gl.blendFuncSeparate(blendState.srcFactor, blendState.dstFactor, blendState.alphaSrcFactor, blendState.alphaDstFactor);

            if (blendState.alphaOperator === null || blendState.alphaOperator === undefined)
                gl.blendEquation(blendState.operator);
            else
                gl.blendEquationSeparate(blendState.operator, blendState.alphaOperator);

            var color = blendState.color;
            if (color)
                gl.blendColor(color.r, color.g, color.b, color.a);
        }
    },

    /**
     * Sets a new stencil reference value for the current stencil state. This prevents resetting an entire state.
     */
    updateStencilReferenceValue: function (value)
    {
        var currentState = _stencilState;

        if (!currentState || currentState.reference === value) return;

        currentState.reference = value;

        gl.stencilFunc(currentState.comparison, value, currentState.readMask);
    },

    /**
     * Sets a new stencil state.
     *
     * @see {@linkcode StencilState}
     */
    setStencilState: function (value)
    {
        _stencilState = value;

        var stencilState = _stencilState;
        if (!stencilState || stencilState.enabled === false) {
            gl.disable(gl.STENCIL_TEST);
            gl.stencilFunc(Comparison.ALWAYS, 0, 0xff);
            gl.stencilOp(StencilOp.KEEP, StencilOp.KEEP, StencilOp.KEEP);
        }
        else {
            gl.enable(gl.STENCIL_TEST);
            gl.stencilFunc(stencilState.comparison, stencilState.reference, stencilState.readMask);
            gl.stencilOp(stencilState.onStencilFail, stencilState.onDepthFail, stencilState.onPass);
            gl.stencilMask(stencilState.writeMask);
        }
    },

    /**
     * Just inlined to reduce function calls in the render loop
     *
     * @ignore
     */
    setMaterialPassState: function(cullMode, depthTest, depthMask, colorMask, blendState)
    {
        if (_cullMode !== cullMode) {
            if (cullMode === CullMode.NONE)
                gl.disable(gl.CULL_FACE);
            else {
                // was disabled before
                if (_cullMode === CullMode.NONE)
                    gl.enable(gl.CULL_FACE);

                var cullModeEff = cullMode;

                if (_invertCullMode) {
                    if (cullModeEff === CullMode.BACK)
                        cullModeEff = CullMode.FRONT;
                    else if (cullModeEff === CullMode.FRONT)
                        cullModeEff = CullMode.BACK;
                }

                gl.cullFace(cullModeEff);
            }

            _cullMode = cullMode;
        }

        if (_depthTest !== depthTest) {
            _depthTest = depthTest;

            if (_depthTest === Comparison.DISABLED)
                gl.disable(gl.DEPTH_TEST);
            else {
                gl.enable(gl.DEPTH_TEST);
                gl.depthFunc(_depthTest);
            }
        }

        if (_depthMask !== depthMask) {
            _depthMask = depthMask;
            gl.depthMask(_depthMask);
        }

        if (colorMask !== _colorMask) {
            _colorMask = colorMask;
            gl.colorMask(colorMask, colorMask, colorMask, colorMask);
        }

        if (_blendState !== blendState) {
            _blendState = blendState;

            if (!blendState || blendState.enabled === false)
                gl.disable(gl.BLEND);
            else {
                gl.enable(gl.BLEND);
                if (blendState.alphaSrcFactor === null || blendState.alphaSrcFactor === undefined)
                    gl.blendFunc(blendState.srcFactor, blendState.dstFactor);
                else 
                    gl.blendFuncSeparate(blendState.srcFactor, blendState.dstFactor, blendState.alphaSrcFactor, blendState.alphaDstFactor);

                if (blendState.alphaOperator === null || blendState.alphaOperator === undefined)
                    gl.blendEquation(blendState.operator);
                else
                    gl.blendEquationSeparate(blendState.operator, blendState.alphaOperator);

                var color = blendState.color;
                if (color)
                    gl.blendColor(color.r, color.g, color.b, color.a);
            }
        }
    }
};

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ShadowFilter()
{
    this._blurShader = null;
    this._numBlurPasses = 1;
    this._cullMode = CullMode.FRONT;
}

ShadowFilter.prototype =
{
    get cullMode() {
        return this._cullMode;
    },

    set cullMode(value) {
        this._cullMode = value;
    },

    getShadowMapFormat: function()
    {
        return TextureFormat.RGBA;
    },

    getShadowMapDataType: function()
    {
        return DataType.UNSIGNED_BYTE;
    },

    getGLSL: function()
    {
        throw new Error("Abstract method called");
    },

    get blurShader()
    {
        if (!this._blurShader)
            this._blurShader = this._createBlurShader();

        return this._blurShader;
    },

    // only for those methods that use a blurShader
    get numBlurPasses()
    {
        return this._numBlurPasses;
    },

    set numBlurPasses(value)
    {
        this._numBlurPasses = value;
    },

    init: function()
    {

    },

    _createBlurShader: function()
    {

    },

    _invalidateBlurShader: function()
    {
        if (this._blurShader)
            this._blurShader = null;
    }
};

/**
 * @classdesc
 * HardDirectionalShadowFilter is a shadow filter for directional lights that doesn't apply any filtering at all.
 *
 * @see {@linkcode InitOptions#directionalShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HardDirectionalShadowFilter()
{
    ShadowFilter.call(this);
}

HardDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype);

/**
 * @ignore
 */
HardDirectionalShadowFilter.prototype.getGLSL = function()
{
    return ShaderLibrary.get("dir_shadow_hard.glsl");
};

/**
 * <p>LightingModel defines a lighting model to be used by a {@Material}. A default lighting model can be assigned to
 * {@linkcode InitOptions#defaultLightingModel}, which will mean any material will use it by default. In addition,
 * any material using the deferred lighting model without a {@linkcode BlendState} will use the deferred rendering path,
 * potentially increasing the performance for heavily lit scenes.</p>
 *
 * <p>You can add pass your own lighting models as a string into a material, as long as the glsl code contains the
 * hx_brdf function</p>
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 *
 */
var LightingModel =
{
    /** No lighting applied when rendering */
    Unlit: null,
    /** Normalized Blinn-Phong shading applied */
    BlinnPhong: ShaderLibrary.get("lighting_blinn_phong.glsl"),
    /** GGX shading applied */
    GGX: ShaderLibrary.get("lighting_ggx.glsl"),
    /** Full GGX shading applied (includes visibility term) */
    GGX_FULL: "#define HX_VISIBILITY_TERM\n" + ShaderLibrary.get("lighting_ggx.glsl"),
    /** Empty brdf */
    DEBUG: ShaderLibrary.get("lighting_debug.glsl")
};

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
var GLSLIncludes = {

    GENERAL:
        "precision highp float;\n\n" +
        ShaderLibrary.get("snippets_general.glsl") + "\n\n"
};

/**
 * @classdesc
 * Float2 is a class describing 2-dimensional points.
 *
 * @constructor
 * @param x The x-coordinate
 * @param y The y-coordinate
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Float2(x, y)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
}

/**
 * Adds 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The sum of a and b.
 */
Float2.add = function(a, b, target)
{
    target = target || new Float2();
    target.x = a.x + b.x;
    target.y = a.y + b.y;
    return target;
};

/**
 * Subtracts 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The difference of a and b.
 */
Float2.subtract = function(a, b, target)
{
    target = target || new Float2();
    target.x = a.x - b.x;
    target.y = a.y - b.y;
    return target;
};

/**
 * Multiplies a vector with a scalar.
 *
 * @param a
 * @param s
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The product of a * s
 */
Float2.scale = function(a, s, target)
{
    target = target || new Float2();
    target.x = a.x * s;
    target.y = a.y * s;
    return target;
};

Float2.prototype =
{

    /**
     * Sets the components explicitly.
     */
    set: function(x, y)
    {
        this.x = x;
        this.y = y;
    },

    /**
     * Returns the dot product with another vector.
     */
    dot: function(a)
    {
        return a.x * this.x + a.y * this.y;
    },

    /**
     * The squared length of the vector.
     */
    get lengthSqr()
    {
        return this.x * this.x + this.y * this.y;
    },

    /**
     * The length of the vector.
     */
    get length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },

    /**
     * Normalizes the vector.
     */
    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
    },

    /**
     * Returns a copy of this object.
     */
    clone: function()
    {
        return new Float2(this.x, this.y);
    },

    /**
     * Adds a vector to this one in place.
     */
    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
    },

    /**
     * Subtracts a vector from this one in place.
     */
    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
    },

    /**
     * Multiplies the components of this vector with a scalar.
     */
    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
    },

    /**
     * Negates the components of this vector.
     */
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
    },

    /**
     * Copies the negative of a vector
     */
    negativeOf: function(v)
    {
        this.x = -v.x;
        this.y = -v.y;
    },

    /**
     * Sets the components of this vector to their absolute values.
     */
    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
    },

    /**
     * Sets the euclidian coordinates based on polar coordinates
     * @param radius The radius coordinate
     * @param angle The angle coordinate
     */
    fromPolarCoordinates: function(radius, angle)
    {
        this.x = radius*Math.cos(angle);
        this.y = radius*Math.sin(angle);
    },

    /**
     * Copies the values from a different Float2
     */
    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
    },

    /**
     * Returns the distance between this and another point.
     */
    distanceTo: function(a)
    {
        var dx = a.x - this.x;
        var dy = a.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Returns the squared distance between this and another point.
     */
    squareDistanceTo: function(a)
    {
        var dx = a.x - this.x;
        var dy = a.y - this.y;
        return dx * dx + dy * dy;
    },

    /**
     * Linearly interpolates two vectors.
     * @param {Float2} a The first vector to interpolate from.
     * @param {Float2} b The second vector to interpolate to.
     * @param {Number} t The interpolation factor.
     */
    lerp: function(a, b, t)
    {
        var ax = a.x, ay = a.y;

        this.x = ax + (b.x - ax) * t;
        this.y = ay + (b.y - ay) * t;
    },

    /**
     * Replaces the components' values if those of the other Float2 are higher, respectively
     */
    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
    },

    /**
     * Replaces the components' values if those of the other Float2 are lower, respectively
     */
    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
    },

    /**
     * Returns the angle between this and another vector.
     */
    angle: function(a)
    {
        return Math.acos(this.dot(a) / (this.length * a.length));
    },

    /**
     * Returns the angle between two vectors, assuming they are normalized
     */
    angleNormalized: function(a)
    {
        return Math.acos(this.dot(a));
    }
};

/**
 * A preset for the origin
 */
Float2.ZERO = new Float2(0, 0);

/**
 * A preset for the X-axis
 */
Float2.X_AXIS = new Float2(1, 0);

/**
 * A preset for the Y-axis
 */
Float2.Y_AXIS = new Float2(0, 1);

/**
 * @classdesc
 * PoissonDisk is a class that allows generating 2D points in a poisson distribution.
 *
 * @constructor
 * @param [mode] Whether the points should be contained in a square ({@linkcode PoissonDisk#SQUARE}) or a circle ({@linkcode PoissonDisk#CIRCULAR}). Defaults to circular.
 * @param [initialDistance]
 * @param [decayFactor]
 * @param [maxTests]
 *
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PoissonDisk(mode, initialDistance, decayFactor, maxTests)
{
    this._mode = mode === undefined? PoissonDisk.CIRCULAR : mode;
    this._initialDistance = initialDistance || 1.0;
    this._decayFactor = decayFactor || .99;
    this._maxTests = maxTests || 20000;
    this._currentDistance = 0;
    this._points = null;
    this.reset();
}

/**
 * Generates points in a square.
 */
PoissonDisk.SQUARE = 0;

/**
 * Generates points in a circle.
 */
PoissonDisk.CIRCULAR = 1;

/**
 * @ignore
 */
PoissonDisk._initDefault = function()
{
    PoissonDisk.DEFAULT = new PoissonDisk();
    PoissonDisk.DEFAULT.generatePoints(64);
    PoissonDisk.DEFAULT_FLOAT32 = new Float32Array(64 * 2);

    var diskPoints = PoissonDisk.DEFAULT.getPoints();

    for (var i = 0; i < 64; ++i) {
        var p = diskPoints[i];
        PoissonDisk.DEFAULT_FLOAT32[i * 2] = p.x;
        PoissonDisk.DEFAULT_FLOAT32[i * 2 + 1] = p.y;
    }
};

PoissonDisk.prototype =
{
    /**
     * Gets all points currently generated.
     */
    getPoints: function()
    {
        return this._points;
    },

    /**
     * Clears all generated points.
     */
    reset : function()
    {
        this._currentDistance = this._initialDistance;
        this._points = [];
    },

    /**
     * Generates new points and add them to the set. This does not return a set of points.
     * @param numPoints The amount of points to generate.
     */
    generatePoints: function(numPoints)
    {
        for (var i = 0; i < numPoints; ++i)
            this.generatePoint();
    },

    /**
     * Generates a single point and adds it to the set.
     */
    generatePoint: function()
    {
        for (;;) {
            var testCount = 0;
            var sqrDistance = this._currentDistance*this._currentDistance;

            while (testCount++ < this._maxTests) {
                var candidate = this._getCandidate();
                if (this._isValid(candidate, sqrDistance)) {
                    this._points.push(candidate);
                    return candidate;
                }
            }
            this._currentDistance *= this._decayFactor;
        }
    },

    /**
     * @ignore
     * @private
     */
    _getCandidate: function()
    {
        for (;;) {
            var x = Math.random() * 2.0 - 1.0;
            var y = Math.random() * 2.0 - 1.0;
            if (this._mode === PoissonDisk.SQUARE || (x * x + y * y <= 1))
                return new Float2(x, y);
        }
    },

    /**
     * @ignore
     * @private
     */
    _isValid: function(candidate, sqrDistance)
    {
        var len = this._points.length;
        for (var i = 0; i < len; ++i) {
            var p = this._points[i];
            var dx = candidate.x - p.x;
            var dy = candidate.y - p.y;
            if (dx*dx + dy*dy < sqrDistance)
                return false;
        }

            return true;
    }
};

/**
 * @classdesc
 * Float4 is a class describing 4-dimensional homogeneous points. These can represent points (w == 1), vectors (w == 0),
 * points in homogeneous projective space, or planes (a, b, c = x, y, z), (w = d).
 *
 * @constructor
 * @param x The x-coordinate
 * @param y The y-coordinate
 * @param z The z-coordinate
 * @param w The w-coordinate
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Float4(x, y, z, w)
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w === undefined? 1 : w;
}

/**
 * Adds 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The sum of a and b.
 */
Float4.add = function(a, b, target)
{
    target = target || new Float4();
    target.x = a.x + b.x;
    target.y = a.y + b.y;
    target.z = a.z + b.z;
    target.w = a.w + b.w;
    return target;
};

/**
 * Subtracts 2 vectors.
 *
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The difference of a and b.
 */
Float4.subtract = function(a, b, target)
{
    target = target || new Float4();
    target.x = a.x - b.x;
    target.y = a.y - b.y;
    target.z = a.z - b.z;
    target.w = a.w - b.w;
    return target;
};

/**
 * Multiplies a vector with a scalar. The w-coordinate is not scaled, since that's generally not what is desired.
 *
 * @param a
 * @param s
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The product of a * s
 */
Float4.scale = function(a, s, target)
{
    target = target || new Float4();
    target.x = a.x * s;
    target.y = a.y * s;
    target.z = a.z * s;
    return target;
};

/**
 * Multiplies a vector with a scalar, including the w-coordinate.
 * @param a
 * @param s
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The product of a * s
 */
Float4.scale4 = function(a, s, target)
{
    target = target || new Float4();
    target.x = a.x * s;
    target.y = a.y * s;
    target.z = a.z * s;
    target.w = a.w * s;
    return target;
};

/**
 * Returns the 3-component dot product of 2 vectors.
 * @param a
 * @param b
 * @param [target] An optional target object. If omitted, a new object will be created.
 * @returns The product of a x b
 */
Float4.cross = function(a, b, target)
{
    target = target || new Float4();
    // safe to use either a and b parameter
    var ax = a.x, ay = a.y, az = a.z;
    var bx = b.x, by = b.y, bz = b.z;

    target.x = ay*bz - az*by;
    target.y = az*bx - ax*bz;
    target.z = ax*by - ay*bx;
    return target;
};

Float4.prototype =
{
    /**
     * Sets the components explicitly.
     */
    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w === undefined? this.w : w;
    },

    /**
     * The squared length of the vector.
     */
    get lengthSqr()
    {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    },

    /**
     * The length of the vector.
     */
    get length()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    },

    /**
     * Normalizes the vector.
     */
    normalize: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
    },

    /**
     * Normalizes the vector as if it were a plane.
     */
    normalizeAsPlane: function()
    {
        var rcpLength = 1.0/this.length;
        this.x *= rcpLength;
        this.y *= rcpLength;
        this.z *= rcpLength;
        this.w *= rcpLength;
    },

    /**
     * Returns a copy of this object.
     */
    clone: function()
    {
        return new Float4(this.x, this.y, this.z, this.w);
    },

    /**
     * Adds a vector to this one in place.
     */
    add: function(v)
    {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
    },

    /**
     * Adds a scalar multiple of another vector in place.
     * @param v The vector to scale and add.
     * @param s The scale to apply to v
     */
    addScaled: function(v, s)
    {
        this.x += v.x * s;
        this.y += v.y * s;
        this.z += v.z * s;
        this.w += v.w * s;
    },

    /**
     * Subtracts a vector from this one in place.
     */
    subtract: function(v)
    {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
    },

    /**
     * Multiplies the components of this vector with a scalar, except the w-component.
     */
    scale: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        //this.w *= s;
    },

    /**
     * Multiplies the components of this vector with a scalar, including the w-component.
     */
    scale4: function(s)
    {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w *= s;
    },

    /**
     * Negates the components of this vector.
     */
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    /**
     * Copies the negative of a vector
     */
    negativeOf: function(a)
    {
        this.x = -a.x;
        this.y = -a.y;
        this.z = -a.z;
        this.w = -a.w;
    },

    /**
     * Project a point in homogeneous projective space to carthesian 3D space by dividing by w
     */
    homogeneousProject: function()
    {
        var rcpW = 1.0/this.w;
        this.x *= rcpW;
        this.y *= rcpW;
        this.z *= rcpW;
        this.w = 1.0;
    },

    /**
     * Sets the components of this vector to their absolute values.
     */
    abs: function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        this.w = Math.abs(this.w);
    },

    /**
     * Sets the euclidian coordinates based on spherical coordinates
     * @param radius The radius coordinate
     * @param azimuthalAngle The azimuthal coordinate
     * @param polarAngle The polar coordinate
     */
    fromSphericalCoordinates: function(radius, azimuthalAngle, polarAngle)
    {
        this.x = radius*Math.sin(polarAngle)*Math.cos(azimuthalAngle);
        this.y = radius*Math.cos(polarAngle);
        this.z = radius*Math.sin(polarAngle)*Math.sin(azimuthalAngle);
        this.w = 0.0;
    },

    /**
     * Copies the values from a different Float4
     */
    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
    },

    /**
     * Replaces the components' values if those of the other Float2 are higher, respectively
     */
    maximize: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
        if (b.w > this.w) this.w = b.w;
    },

    /**
     * Replaces the components' values if those of the other Float2 are higher, respectively. Excludes the w-component.
     */
    maximize3: function(b)
    {
        if (b.x > this.x) this.x = b.x;
        if (b.y > this.y) this.y = b.y;
        if (b.z > this.z) this.z = b.z;
    },

    /**
     * Replaces the components' values if those of the other Float2 are lower, respectively
     */
    minimize: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
        if (b.w < this.w) this.w = b.w;
    },

    /**
     * Replaces the components' values if those of the other Float2 are lower, respectively. Excludes the w-component.
     */
    minimize3: function(b)
    {
        if (b.x < this.x) this.x = b.x;
        if (b.y < this.y) this.y = b.y;
        if (b.z < this.z) this.z = b.z;
    },

    /**
     * Generates a plane representation from the normal vector and a point contained in the plane.
     * @param normal The vector normal to the plane.
     * @param point A point contained in the plane.
     */
    planeFromNormalAndPoint: function(normal, point)
    {
        var nx = normal.x, ny = normal.y, nz = normal.z;
        this.x = nx;
        this.y = ny;
        this.z = nz;
        this.w = -(point.x * nx + point.y * ny + point.z * nz);
    },

    /**
     * Returns the angle between this and another vector.
     */
    angle: function(a)
    {
        return Math.acos(this.dot3(a) / (this.length * a.length));
    },

    /**
     * Returns the angle between two vectors, assuming they are normalized
     */
    angleNormalized: function(a)
    {
        return Math.acos(this.dot3(a));
    },

    /**
     * Returns the distance to a point.
     */
    distanceTo: function(a)
    {
        var dx = a.x - this.x;
        var dy = a.y - this.y;
        var dz = a.z - this.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    /**
     * Returns the squared distance to a point.
     */
    squareDistanceTo: function(a)
    {
        var dx = a.x - this.x;
        var dy = a.y - this.y;
        var dz = a.z - this.z;
        return dx * dx + dy * dy + dz * dz;
    },

    /**
     * Returns the 3-component dot product of 2 vectors.
     */
    dot3: function(a)
    {
        return a.x * this.x + a.y * this.y + a.z * this.z;
    },

    /**
     * Returns the 3-component dot product of 2 vectors.
     */
    dot: function(a)
    {
        return a.x * this.x + a.y * this.y + a.z * this.z;
    },

    /**
     * Returns the 4-component dot product of 2 vectors. This can be useful for signed distances to a plane.
     */
    dot4: function(a)
    {
        return a.x * this.x + a.y * this.y + a.z * this.z + a.w * this.w;
    },

    /**
     * Linearly interpolates two vectors.
     * @param {Float4} a The first vector to interpolate from.
     * @param {Float4} b The second vector to interpolate to.
     * @param {Number} t The interpolation factor.
     * @returns {Float4} The interpolated value.
     */
    lerp: function(a, b, factor)
    {
        var ax = a.x, ay = a.y, az = a.z, aw = a.w;

        this.x = ax + (b.x - ax) * factor;
        this.y = ay + (b.y - ay) * factor;
        this.z = az + (b.z - az) * factor;
        this.w = aw + (b.w - aw) * factor;
    },

    /**
     * Store the cross product of two vectors.
     */
    cross: function(a, b)
    {
        // safe to use either a and b parameter
        var ax = a.x, ay = a.y, az = a.z;
        var bx = b.x, by = b.y, bz = b.z;

        this.x = ay*bz - az*by;
        this.y = az*bx - ax*bz;
        this.z = ax*by - ay*bx;
        return this;
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "Float4(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }
};

/**
 * A preset for the origin point (w = 1)
 */
Float4.ORIGIN_POINT = new Float4(0, 0, 0, 1);

/**
 * A preset for the zero vector (w = 0)
 */
Float4.ZERO = new Float4(0, 0, 0, 0);

/**
 * A preset for the X-axis
 */
Float4.X_AXIS = new Float4(1, 0, 0, 0);

/**
 * A preset for the Y-axis
 */
Float4.Y_AXIS = new Float4(0, 1, 0, 0);

/**
 * A preset for the Z-axis
 */
Float4.Z_AXIS = new Float4(0, 0, 1, 0);

/**
 * @classdesc
 * PoissonSphere is a class that allows generating 3D points in a poisson distribution.
 *
 * @constructor
 * @param [mode] Whether the points should be contained in a square ({@linkcode PoissonSphere#BOX}) or a circle ({@linkcode PoissonSphere#SPHERICAL}). Defaults to spherical.
 * @param [initialDistance]
 * @param [decayFactor]
 * @param [maxTests]
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PoissonSphere(mode, initialDistance, decayFactor, maxTests)
{
    this._mode = mode === undefined? PoissonSphere.SPHERICAL : mode;
    this._initialDistance = initialDistance || 1.0;
    this._decayFactor = decayFactor || .99;
    this._maxTests = maxTests || 20000;
    this._currentDistance = 0;
    this._points = null;
    this.reset();
}

/**
 * Generates points in a box.
 */
PoissonSphere.BOX = 0;

/**
 * Generates points in a sphere.
 */
PoissonSphere.SPHERICAL = 1;

/**
 * @ignore
 * @private
 */
PoissonSphere._initDefault = function()
{
    PoissonSphere.DEFAULT = new PoissonSphere();
    PoissonSphere.DEFAULT.generatePoints(64);
    PoissonSphere.DEFAULT_FLOAT32 = new Float32Array(64 * 3);

    var spherePoints = PoissonSphere.DEFAULT.getPoints();

    for (var i = 0; i < 64; ++i) {
        var p = spherePoints[i];
        PoissonSphere.DEFAULT_FLOAT32[i * 3] = p.x;
        PoissonSphere.DEFAULT_FLOAT32[i * 3 + 1] = p.y;
        PoissonSphere.DEFAULT_FLOAT32[i * 3 + 2] = p.z;
    }
};

PoissonSphere.prototype =

    /**
     * Gets all points currently generated.
     */{
    getPoints: function()
    {
        return this._points;
    },

    /**
     * Clears all generated points.
     */
    reset : function()
    {
        this._currentDistance = this._initialDistance;
        this._points = [];
    },

    /**
     * Generates new points and add them to the set. This does not return a set of points.
     * @param numPoints The amount of points to generate.
     */
    generatePoints: function(numPoints)
    {
        for (var i = 0; i < numPoints; ++i)
            this.generatePoint();
    },

    /**
     * Generates a single point and adds it to the set.
     */
    generatePoint: function()
    {
        for (;;) {
            var testCount = 0;
            var sqrDistance = this._currentDistance*this._currentDistance;

            while (testCount++ < this._maxTests) {
                var candidate = this._getCandidate();
                if (this._isValid(candidate, sqrDistance)) {
                    this._points.push(candidate);
                    return candidate;
                }
            }
            this._currentDistance *= this._decayFactor;
        }
    },

    /**
     * @ignore
     * @private
     */
    _getCandidate: function()
    {
        for (;;) {
            var x = Math.random() * 2.0 - 1.0;
            var y = Math.random() * 2.0 - 1.0;
            var z = Math.random() * 2.0 - 1.0;
            if (this._mode === PoissonSphere.BOX || (x * x + y * y + z * z <= 1))
                return new Float4(x, y, z, 0.0);
        }
    },

    /**
     * @ignore
     * @private
     */
    _isValid: function(candidate, sqrDistance)
    {
        var len = this._points.length;
        for (var i = 0; i < len; ++i) {
            var p = this._points[i];
            var dx = candidate.x - p.x;
            var dy = candidate.y - p.y;
            var dz = candidate.z - p.z;
            if (dx*dx + dy*dy + dz*dz < sqrDistance)
                return false;
        }

        return true;
    }
};

var RCP_LOG_OF_2 = 1.0 / Math.log(2);

/**
 * Some extra Math functionality for your enjoyment.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var MathX = {
    /**
     * The factor to convert degrees to radians.
     */
    DEG_TO_RAD: Math.PI / 180.0,

    /**
     * The factor to convert radians to degrees.
     */
    RAD_TO_DEG: 180.0 / Math.PI,

    /**
     * Returns the sign of a given value.
     * @returns {number} -1 if v < 0, 0 if v == 0, 1 if v > 1
     */
    sign: function(v)
    {
        return  v === 0.0? 0.0 :
            v > 0.0? 1.0 : -1.0;
    },

    /**
     * Verifies whether the value is a power of 2.
     */
    isPowerOfTwo: function(value)
    {
        return value? ((value & -value) === value) : false;
    },

    /**
     * Return the base-2 logarithm.
     */
    log2: function(value)
    {
        return Math.log(value) * RCP_LOG_OF_2;
    },

    /**
     * Clamps a value to a minimum and maximum.
     */
    clamp: function(value, min, max)
    {
        return  value < min?    min :
            value > max?    max :
                value;
    },

    /**
     * Clamps a value to 0 and 1
     */
    saturate: function(value)
    {
        return MathX.clamp(value, 0.0, 1.0);
    },

    /**
     * Linearly interpolates a number.
     */
    lerp: function(a, b, factor)
    {
        return a + (b - a) * factor;
    },

    /**
     * Returns 0 if x < lower, 1 if x > lower, and linearly interpolates in between.
     */
    linearStep: function(lower, upper, x)
    {
        return MathX.saturate((x - lower) / (upper - lower));
    },

    /**
     * Estimates the radius of a gaussian curve.
     * @param variance The variance of the gaussian curve.
     * @param epsilon The minimum value of the curve to still be considered within the radius.
     */
    estimateGaussianRadius: function (variance, epsilon)
    {
        return Math.sqrt(-2.0 * variance * Math.log(epsilon));
    }
};

/**
 * @classdesc
 * Quaternion is a class to represent (in our case) rotations.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Quaternion()
{
    // x, y, z, w allowed to be accessed publicly for simplicity, changing this does not violate invariant. Ever.
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.w = 1;
}

Quaternion.prototype =
{
    /**
     * Initializes as an axis/angle rotation
     */
    fromAxisAngle: function (axis, radians)
    {
        var halfAngle = radians * .5;
        var factor = Math.sin(halfAngle) / axis.length;
        this.x = axis.x * factor;
        this.y = axis.y * factor;
        this.z = axis.z * factor;
        this.w = Math.cos(halfAngle);
    },

    /**
     * Initializes from Tait-Bryan angles
     */
    fromPitchYawRoll: function(pitch, yaw, roll)
    {
        var mtx = new Matrix4x4();
        // wasteful. improve.
        mtx.fromRotationPitchYawRoll(pitch, yaw, roll);
        this.fromMatrix(mtx);
    },

    /**
     * Initializes from Euler angles
     */
    fromEuler: function(x, y, z)
    {
        var cx = Math.cos(x * 0.5), cy = Math.cos(y * 0.5), cz = Math.cos(z * 0.5);
        var sx = Math.sin(x * 0.5), sy = Math.sin(y * 0.5), sz = Math.sin(z * 0.5);

        this.x = sx*cy*cz + cx*sy*sz;
        this.y = cx*sy*cz - sx*cy*sz;
        this.z = cx*cy*sz + sx*sy*cz;
        this.w = cx*cy*cz - sx*sy*sz;
    },

    /**
     * Stores the rotation as Euler angles in a Float4 object
     */
    toEuler: function(target)
    {
        target = target || new Float4();

        var x = this.x, y = this.y, z = this.z, w = this.w;
        var xx = x * x, yy = y * y, zz = z * z, ww = w * w;

        target.x = Math.atan2( -2*(y*z - w*x), ww - xx - yy + zz );
        target.y = Math.asin ( 2*(x*z + w*y) );
        target.z = Math.atan2( -2*(x*y - w*z), ww + xx - yy - zz );

        return target;
    },

    /**
     * Initializes from a rotation matrix
     */
    fromMatrix: function(m)
    {
        var m00 = m._m[0];
        var m11 = m._m[5];
        var m22 = m._m[10];
        var trace = m00 + m11 + m22;
        var s;

        if (trace > 0.0) {
            trace += 1.0;
            s = 1.0/Math.sqrt(trace)*.5;
            this.x = s*(m._m[6] - m._m[9]);
            this.y = s*(m._m[8] - m._m[2]);
            this.z = s*(m._m[1] - m._m[4]);
            this.w = s*trace;
        }
        else if (m00 > m11 && m00 > m22) {
            trace = m00 - m11 - m22 + 1.0;
            s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*trace;
            this.y = s*(m._m[1] + m._m[4]);
            this.z = s*(m._m[8] + m._m[2]);
            this.w = s*(m._m[6] - m._m[9]);
        }
        else if (m11 > m22) {
            trace = m11 - m00 - m22 + 1.0;
            s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[1] + m._m[4]);
            this.y = s*trace;
            this.z = s*(m._m[6] + m._m[9]);
            this.w = s*(m._m[8] - m._m[2]);
        }
        else {
            trace = m22 - m00 - m11 + 1.0;
            s = 1.0/Math.sqrt(trace)*.5;

            this.x = s*(m._m[8] + m._m[2]);
            this.y = s*(m._m[6] + m._m[9]);
            this.z = s*trace;
            this.w = s*(m._m[1] - m._m[4]);
        }

        // this is to prevent non-normalized due to rounding errors
        this.normalize();
    },

    /**
     * Rotates a Float4 point.
     *
     * @param {Float4} [target] An optional target object. If not provided, a new object will be created and returned.
     */
    rotate: function(v, target)
    {
        target = target || new Float4();

        var vx = v.x, vy = v.y, vz = v.z;
        var x = this.x, y = this.y, z = this.z, w = this.w;

        // p*q'
        var w1 = - x * vx - y * vy - z * vz;
        var x1 = w * vx + y * vz - z * vy;
        var y1 = w * vy - x * vz + z * vx;
        var z1 = w * vz + x * vy - y * vx;

        target.x = -w1 * x + x1 * w - y1 * z + z1 * y;
        target.y = -w1 * y + x1 * z + y1 * w - z1 * x;
        target.z = -w1 * z - x1 * y + y1 * x + z1 * w;
        target.w = v.w;
        return target;
    },

    /**
     * Negates all the components. This results in the same net rotation, but with different orientation
     */
    negate: function()
    {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
    },

    /**
     * Sets all components explicitly
     */
    set: function(x, y, z, w)
    {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    },

    /**
     * Copies all components from another quaternion
     */
    copyFrom: function(b)
    {
        this.x = b.x;
        this.y = b.y;
        this.z = b.z;
        this.w = b.w;
    },

    /**
     * Gets the quaternion's squared norm
     */
    get normSquared()
    {
        return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
    },

    /**
     * Gets the quaternion's norm
     */
    get norm()
    {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
    },

    /**
     * Normalizes the quaternion.
     */
    normalize : function()
    {
        var rcpNorm = 1.0/Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w);
        this.x *= rcpNorm;
        this.y *= rcpNorm;
        this.z *= rcpNorm;
        this.w *= rcpNorm;
    },

    /**
     * Converts to the conjugate.
     */
    conjugate: function()
    {
        this.x = -q.x;
        this.y = -q.y;
        this.z = -q.z;
    },

    /**
     * inverts the quaternion.
     */
    invert: function ()
    {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        var rcpSqrNorm = 1.0 / (x*x + y*y + z*z + w*w);
        this.x = -x*rcpSqrNorm;
        this.y = -y*rcpSqrNorm;
        this.z = -z*rcpSqrNorm;
        this.w = w*rcpSqrNorm;
    },

    /**
     * Multiplies two quaternions and stores it in the current.
     */
    multiply: function(a, b)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        this.x = w1*x2 + x1*w2 + y1*z2 - z1*y2;
        this.y = w1*y2 - x1*z2 + y1*w2 + z1*x2;
        this.z = w1*z2 + x1*y2 - y1*x2 + z1*w2;
        this.w = w1*w2 - x1*x2 - y1*y2 - z1*z2;
    },

    /**
     * Post-multiplies another quaternion to this one.
     */
    append: function(q)
    {
        this.multiply(q, this);
    },

    /**
     * Pre-multiplies another quaternion to this one.
     */
    prepend: function(q)
    {
        this.multiply(this, q);
    },

    /**
     * Linearly interpolates two quaternions.
     * @param {Quaternion} a The first vector to interpolate from.
     * @param {Quaternion} b The second vector to interpolate to.
     * @param {Number} t The interpolation factor.
     */
    lerp: function(a, b, factor)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;

        // use shortest direction
        if (w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2 < 0) {
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
        }

        this.x = x1 + factor * (x2 - x1);
        this.y = y1 + factor * (y2 - y1);
        this.z = z1 + factor * (z2 - z1);
        this.w = w1 + factor * (w2 - w1);

        this.normalize();
    },

    /**
     * Spherical-linearly interpolates two quaternions.
     * @param {Quaternion} a The first vector to interpolate from.
     * @param {Quaternion} b The second vector to interpolate to.
     * @param {Number} t The interpolation factor.
     */
    slerp: function(a, b, factor)
    {
        var w1 = a.w, x1 = a.x, y1 = a.y, z1 = a.z;
        var w2 = b.w, x2 = b.x, y2 = b.y, z2 = b.z;
        var dot = w1*w2 + x1*x2 + y1*y2 + z1*z2;

        // shortest direction
        if (dot < 0.0) {
            dot = -dot;
            w2 = -w2;
            x2 = -x2;
            y2 = -y2;
            z2 = -z2;
        }

        if (dot < 0.95) {
            // interpolate angle linearly
            var angle = Math.acos(dot);
            var interpolatedAngle = factor*angle;

            var x = x2 - x1*dot;
            var y = y2 - y1*dot;
            var z = z2 - z1*dot;
            var w = w2 - w1*dot;
            var rcpNorm = 1.0/Math.sqrt(x*x + y*y + z*z + w*w);
            x *= rcpNorm;
            y *= rcpNorm;
            z *= rcpNorm;
            w *= rcpNorm;

            var cos = Math.cos(interpolatedAngle);
            var sin = Math.sin(interpolatedAngle);
            this.x = x1 * cos + x * sin;
            this.y = y1 * cos + y * sin;
            this.z = z1 * cos + z * sin;
            this.w = w1 * cos + w * sin;
        }
        else {
            // nearly identical angle, interpolate linearly
            this.x = x1 + factor * (x2 - x1);
            this.y = y1 + factor * (y2 - y1);
            this.z = z1 + factor * (z2 - z1);
            this.w = w1 + factor * (w2 - w1);
            this.normalize();
        }

        return this;
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "Quaternion(" + this.x + ", " + this.y + ", " + this.z + ", " + this.w + ")";
    }
};

/**
 *
 * PropertyListener allows listening to changes to other objects' properties. When a change occurs, the onChange signal will be dispatched.
 * It's a bit hackish, but it prevents having to dispatch signals in performance-critical classes such as Float4.
 *
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PropertyListener()
{
    this._enabled = true;
    this.onChange = new Signal();
    this._targets = [];
}

PropertyListener.prototype =
{
    /**
     * If false, prevents the PropertyListener from dispatching change events.
     */
    get enabled()
    {
        return this._enabled;
    },

    set enabled(value)
    {
        this._enabled = value;
    },

    /**
     * Starts listening to changes for an object's property for changes.
     * @param targetObj The target object to monitor.
     * @param propertyName The name of the property for which we'll be listening.
     */
    add: function(targetObj, propertyName)
    {
        var index = this._targets.length;
        this._targets.push(
            {
                object: targetObj,
                propertyName: propertyName,
                value: targetObj[propertyName]
            }
        );

        var wrapper = this;
        var target = wrapper._targets[index];
        Object.defineProperty(targetObj, propertyName, {
            get: function() {
                return target.value;
            },
            set: function(val) {
                if (val !== target.value) {
                    target.value = val;
                    if (wrapper._enabled)
                        wrapper.onChange.dispatch();
                }
            }
        });
    },

    /**
     * Stops listening to a property for changes.
     * @param targetObj The object to stop monitoring.
     * @param propertyName The name of the property for which we'll be listening.
     */
    remove: function(targetObj, propertyName)
    {
        for (var i = 0; i < this._targets.length; ++i) {
            var target = this._targets[i];
            if (target.object === targetObj && target.propertyName === propertyName) {
                delete target.object[target.propertyName];
                target.object[target.propertyName] = target.value;
                this._targets.splice(i--, 1);
            }
        }
    }
};

/**
 * @classdesc
 * Transform is a class to describe an object's transformation through position, rotation (as a quaternion) and scale.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Transform()
{
    this._position = new Float4(0.0, 0.0, 0.0, 1.0);
    this._rotation = new Quaternion();
    this._scale = new Float4(1.0, 1.0, 1.0, 1.0);
    this._matrix = new Matrix4x4();

    this._changeListener = new PropertyListener();
    this._changeListener.add(this._position, "x");
    this._changeListener.add(this._position, "y");
    this._changeListener.add(this._position, "z");
    this._changeListener.add(this._rotation, "x");
    this._changeListener.add(this._rotation, "y");
    this._changeListener.add(this._rotation, "z");
    this._changeListener.add(this._rotation, "w");
    this._changeListener.add(this._scale, "x");
    this._changeListener.add(this._scale, "y");
    this._changeListener.add(this._scale, "z");
    this._changeListener.onChange.bind(this._invalidateMatrix, this);
}

Transform.prototype =
{
    /**
     * The position of the object.
     */
    get position() {
        return this._position;
    },


    set position(value) {
        // make sure position object never changes
        this._position.copyFrom(value);
    },

    /**
     * The rotation of the object.
     */
    get rotation() {
        return this._rotation;
    },

    set rotation(value) {
        // make sure position object never changes
        this._rotation.copyFrom(value);
    },

    /**
     * The scale of the object.
     */
    get scale() {
        return this._scale;
    },

    set scale(value) {
        // make sure position object never changes
        this._scale.copyFrom(value);
    },

    /**
     * Orients the object in such a way as to face the target point.
     */
    lookAt: function(target)
    {
        this._matrix.lookAt(target, this._position, Float4.Y_AXIS);
        this._matrix.appendScale(this._scale);
        this._applyMatrix();
    },

    /**
     * Copies the state of another Transform object
     */
    copyTransform: function(transform)
    {
        this._changeListener.enabled = false;
        this._position.copyFrom(transform.position);
        this._rotation.copyFrom(transform.rotation);
        this._scale.copyFrom(transform.scale);
        this._changeListener.enabled = true;
        this._invalidateMatrix();
    },

    /**
     * The matrix representing the transform.
     */
    get matrix()
    {
        if (this._matrixInvalid)
            this._updateMatrix();

        return this._matrix;
    },

    set matrix(value)
    {
        this._matrix.copyFrom(value);
        this._applyMatrix();
    },

    /**
     * @ignore
     */
    _invalidateMatrix: function ()
    {
        this._matrixInvalid = true;
    },

    /**
     * @ignore
     */
    _updateMatrix: function()
    {
        this._matrix.compose(this);
        this._matrixInvalid = false;
    },

    /**
     * @ignore
     */
    _applyMatrix: function()
    {
        this._matrixInvalid = false;
        // matrix decompose will trigger property updates, so disable this
        this._changeListener.enabled = false;
        this._matrix.decompose(this);
        this._changeListener.enabled = true;
    }
};

/**
 * @classdec
 * Matrix4x4 object represents a 4D matrix (generally an affine transformation or a projection). The elements are stored
 * in column-major order. Vector multiplication is in column format (ie v' = M x v)
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 *
 */
function Matrix4x4(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33)
{
    if (m00 !== undefined && isNaN(m00)) {
        this._m = new Float32Array(m00);
    }
    else {
        var m = this._m = new Float32Array(16);

        m[0] = m00 === undefined ? 1 : 0;
        m[1] = m10 || 0;
        m[2] = m20 || 0;
        m[3] = m30 || 0;
        m[4] = m01 || 0;
        m[5] = m11 === undefined ? 1 : 0;
        m[6] = m21 || 0;
        m[7] = m31 || 0;
        m[8] = m02 || 0;
        m[9] = m12 || 0;
        m[10] = m22 === undefined ? 1 : 0;
        m[11] = m32 || 0;
        m[12] = m03 || 0;
        m[13] = m13 || 0;
        m[14] = m23 || 0;
        m[15] = m33 === undefined ? 1 : 0;
    }
}

Matrix4x4.prototype =
{
    /**
     * Transforms a Float4 object (use for homogeneous general case of Float4, perspective or when "type" (w) of Float4 is unknown)
     *
     * @param v The Float4 object to transform.
     * @param [target] An optional target. If not provided, a new object will be created and returned.
     */
    transform: function (v, target)
    {
        target = target || new Float4();
        var x = v.x, y = v.y, z = v.z, w = v.w;
        var m = this._m;

        target.x = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
        target.y = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
        target.z = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
        target.w = m[3] * x + m[7] * y + m[11] * z + m[15] * w;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a point. Slightly faster than transform for points.
     *
     * @param v The Float4 object to transform.
     * @param [target] An optional target. If not provided, a new object will be created and returned.
     */
    transformPoint: function (v, target)
    {
        target = target || new Float4();
        var x = v.x, y = v.y, z = v.z;
        var m = this._m;

        target.x = m[0] * x + m[4] * y + m[8] * z + m[12];
        target.y = m[1] * x + m[5] * y + m[9] * z + m[13];
        target.z = m[2] * x + m[6] * y + m[10] * z + m[14];
        target.w = 1.0;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation). Slightly faster than transform for vectors.
     *
     * @param v The Float4 object to transform.
     * @param [target] An optional target. If not provided, a new object will be created and returned.
     */
    transformVector: function (v, target)
    {
        target = target || new Float4();
        var x = v.x, y = v.y, z = v.z;

        var m = this._m;
        target.x = m[0] * x + m[4] * y + m[8] * z;
        target.y = m[1] * x + m[5] * y + m[9] * z;
        target.z = m[2] * x + m[6] * y + m[10] * z;
        target.w = 0.0;

        return target;
    },

    /**
     * Transforms a Float4 object, treating it as a vector (ie: disregarding translation) containing a size (so always abs)! Slightly faster than transform for vectors.
     *
     * @param v The Float4 object to transform.
     * @param [target] An optional target. If not provided, a new object will be created and returned.
     */
    transformExtent: function (v, target)
    {
        target = target || new Float4();
        var x = v.x, y = v.y, z = v.z;

        var m = this._m;
        var m00 = m[0], m10 = m[1], m20 = m[2];
        var m01 = m[4], m11 = m[5], m21 = m[6];
        var m02 = m[8], m12 = m[9], m22 = m[10];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;

        target.x = m00 * x + m01 * y + m02 * z;
        target.y = m10 * x + m11 * y + m12 * z;
        target.z = m20 * x + m21 * y + m22 * z;
        target.w = 0.0;

        return target;
    },

    /**
     * Copies its elements from another matrix.
     */
    copyFrom: function(a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] = mm[0];
        m[1] = mm[1];
        m[2] = mm[2];
        m[3] = mm[3];
        m[4] = mm[4];
        m[5] = mm[5];
        m[6] = mm[6];
        m[7] = mm[7];
        m[8] = mm[8];
        m[9] = mm[9];
        m[10] = mm[10];
        m[11] = mm[11];
        m[12] = mm[12];
        m[13] = mm[13];
        m[14] = mm[14];
        m[15] = mm[15];
    },

    /**
     * Initializes the matrix as a rotation matrix based on a quaternion.
     */
    fromQuaternion: function (q)
    {
        var x = q.x, y = q.y, z = q.z, w = q.w;

        var m = this._m;
        m[0] = 1 - 2 * (y * y + z * z);
        m[1] = 2 * (x * y + w * z);
        m[2] = 2 * (x * z - w * y);
        m[3] = 0;
        m[4] = 2 * (x * y - w * z);
        m[5] = 1 - 2 * (x * x + z * z);
        m[6] = 2 * (y * z + w * x);
        m[7] = 0;
        m[8] = 2 * (x * z + w * y);
        m[9] = 2 * (y * z - w * x);
        m[10] = 1 - 2 * (x * x + y * y);
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    /**
     * Multiplies two matrix objects and stores the result in this one
     *
     * @param a
     * @param b
     */
    multiply: function (a, b)
    {
        var am = a._m, bm = b._m;
        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2], a_m30 = am[3];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6], a_m31 = am[7];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10], a_m32 = am[11];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14], a_m33 = am[15];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2], b_m30 = bm[3];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6], b_m31 = bm[7];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10], b_m32 = bm[11];
        var b_m03 = bm[12], b_m13 = bm[13], b_m23 = bm[14], b_m33 = bm[15];

        var m = this._m;
        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20 + a_m03 * b_m30;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20 + a_m13 * b_m30;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20 + a_m23 * b_m30;
        m[3] = a_m30 * b_m00 + a_m31 * b_m10 + a_m32 * b_m20 + a_m33 * b_m30;
        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21 + a_m03 * b_m31;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21 + a_m13 * b_m31;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21 + a_m23 * b_m31;
        m[7] = a_m30 * b_m01 + a_m31 * b_m11 + a_m32 * b_m21 + a_m33 * b_m31;
        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22 + a_m03 * b_m32;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22 + a_m13 * b_m32;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22 + a_m23 * b_m32;
        m[11] = a_m30 * b_m02 + a_m31 * b_m12 + a_m32 * b_m22 + a_m33 * b_m32;
        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03 * b_m33;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13 * b_m33;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23 * b_m33;
        m[15] = a_m30 * b_m03 + a_m31 * b_m13 + a_m32 * b_m23 + a_m33 * b_m33;
    },

    /**
     * Multiplies two matrix objects, assuming they're affine transformations, and stores the result in this one
     *
     * @param a
     * @param b
     */
    multiplyAffine: function (a, b)
    {
        var am = a._m, bm = b._m;
        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10];
        var b_m03 = bm[12], b_m13 = bm[13], b_m23 = bm[14];

        var m = this._m;
        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23 + a_m03;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23 + a_m13;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23 + a_m23;

    },

    /**
     * Initializes the matrix as a rotation matrix around a given axis
     *
     * @param axis The axis around which the rotation takes place.
     * @param radians The angle of rotation
     */
    fromRotationAxisAngle: function (axis, radians)
    {
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;


        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var m = this._m;
        m[0] = oneMinCos * x * x + cos;
        m[1] = oneMinCos * x * y + sin * z;
        m[2] = oneMinCos * x * z - sin * y;
        m[3] = 0;
        m[4] = oneMinCos * x * y - sin * z;
        m[5] = oneMinCos * y * y + cos;
        m[6] = oneMinCos * y * z + sin * x;
        m[7] = 0;
        m[8] = oneMinCos * x * z + sin * y;
        m[9] = oneMinCos * y * z - sin * x;
        m[10] = oneMinCos * z * z + cos;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },


    /**
     * Initializes the matrix as a rotation matrix from 3 Euler angles
     */
    // this actually doesn't use a vector, because they're three unrelated quantities. A vector just doesn't make sense here, mathematically.
    fromEuler: function (x, y, z)
    {
        var cosX = Math.cos(x);
        var sinX = Math.sin(x);
        var cosY = Math.cos(y);
        var sinY = Math.sin(y);
        var cosZ = Math.cos(z);
        var sinZ = Math.sin(z);

        var m = this._m;
        m[0] = cosY * cosZ;
        m[1] = cosX * sinZ + sinX * sinY * cosZ;
        m[2] = sinX * sinZ - cosX * sinY * cosZ;
        m[3] = 0;
        m[4] = -cosY * sinZ;
        m[5] = cosX * cosZ - sinX * sinY * sinZ;
        m[6] = sinX * cosZ + cosX * sinY * sinZ;
        m[7] = 0;
        m[8] = sinY;
        m[9] = -sinX * cosY;
        m[10] = cosX * cosY;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    /**
     * Initializes the matrix as a rotation matrix from Tait-Bryan angles (pitch, yaw, roll).
     */
    fromRotationPitchYawRoll: function (pitch, yaw, roll)
    {
        var cosP = Math.cos(-pitch);
        var cosY = Math.cos(-yaw);
        var cosR = Math.cos(roll);
        var sinP = Math.sin(-pitch);
        var sinY = Math.sin(-yaw);
        var sinR = Math.sin(roll);

        var zAxisX = -sinY * cosP;
        var zAxisY = -sinP;
        var zAxisZ = cosY * cosP;

        var yAxisX = -cosY * sinR - sinY * sinP * cosR;
        var yAxisY = cosP * cosR;
        var yAxisZ = -sinY * sinR + sinP * cosR * cosY;

        var xAxisX = yAxisY * zAxisZ - yAxisZ * zAxisY;
        var xAxisY = yAxisZ * zAxisX - yAxisX * zAxisZ;
        var xAxisZ = yAxisX * zAxisY - yAxisY * zAxisX;

        var m = this._m;
        m[0] = xAxisX;
        m[1] = xAxisY;
        m[2] = xAxisZ;
        m[3] = 0;
        m[4] = yAxisX;
        m[5] = yAxisY;
        m[6] = yAxisZ;
        m[7] = 0;
        m[8] = zAxisX;
        m[9] = zAxisY;
        m[10] = zAxisZ;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    /**
     * Initializes as a translation matrix.
     * @param xOrV A Float4 or a Number as x-coordinate
     * @param y The y-translation. Omitted if xOrV is a Float4.
     * @param z The z-translation. Omitted if xOrV is a Float4.
     */
    fromTranslation: function (xOrV, y, z)
    {
        if (y === undefined) {
            xOrV = xOrV.x;
            y = xOrV.y;
            z = xOrV.z;
        }
        var m = this._m;
        m[0] = 1;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = 1;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = 1;
        m[11] = 0;
        m[12] = xOrV;
        m[13] = y;
        m[14] = z;
        m[15] = 1;
    },

    /**
     * Initializes as a scale matrix.
     * @param x
     * @param y
     * @param z
     */
    fromScale: function (x, y, z)
    {
        if (x instanceof Float4) {
            y = x.y;
            z = x.z;
            x = x.x;
        }
        else if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] = x;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;
        m[4] = 0;
        m[5] = y;
        m[6] = 0;
        m[7] = 0;
        m[8] = 0;
        m[9] = 0;
        m[10] = z;
        m[11] = 0;
        m[12] = 0;
        m[13] = 0;
        m[14] = 0;
        m[15] = 1;
    },

    /**
     * Initializes as a perspective projection matrix (left-handed!).
     * @param vFOV The vertical field of view in radians.
     * @param aspectRatio The aspect ratio
     * @param nearDistance The near plane distance
     * @param farDistance The far plane distance
     */
    fromPerspectiveProjection: function (vFOV, aspectRatio, nearDistance, farDistance)
    {
        var yMax = 1.0 / Math.tan(vFOV * .5);
        var xMax = yMax / aspectRatio;
        var rcpFrustumDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = xMax;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = yMax;
        m[6] = 0;
        m[7] = 0;

        m[8] = 0;
        m[9] = 0;
        m[10] = -(farDistance + nearDistance) * rcpFrustumDepth;
        m[11] = 1;

        m[12] = 0;
        m[13] = 0;
        m[14] = 2 * nearDistance * farDistance * rcpFrustumDepth;
        m[15] = 0;
    },

    /**
     * Initializes as an off-center orthographic projection matrix.
     * @param left The distance to the left plane
     * @param right The distance to the right plane
     * @param top The distance to the top plane
     * @param bottom The distance to the bottom plane
     * @param nearDistance The near plane distance
     * @param farDistance The far plane distance
     */
    fromOrthographicOffCenterProjection: function (left, right, top, bottom, nearDistance, farDistance)
    {
        var rcpWidth = 1.0 / (right - left);
        var rcpHeight = 1.0 / (top - bottom);
        var rcpDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = 2.0 * rcpWidth;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = 2.0 * rcpHeight;
        m[6] = 0;
        m[7] = 0;

        m[8] = 0;
        m[9] = 0;
        m[10] = -2.0 * rcpDepth;
        m[11] = 0;

        m[12] = -(left + right) * rcpWidth;
        m[13] = -(top + bottom) * rcpHeight;
        m[14] = (farDistance + nearDistance) * rcpDepth;
        m[15] = 1;
    },

    /**
     * Initializes as a symmetrical orthographic projection matrix.
     * @param width The width of the projection
     * @param top The height of the projection
     * @param nearDistance The near plane distance
     * @param farDistance The far plane distance
     */
    fromOrthographicProjection: function (width, height, nearDistance, farDistance)
    {
        var rcpWidth = 1.0 / width;
        var rcpHeight = 1.0 / height;
        var rcpDepth = 1.0 / (nearDistance - farDistance);

        var m = this._m;
        m[0] = 2.0 * rcpWidth;
        m[1] = 0;
        m[2] = 0;
        m[3] = 0;

        m[4] = 0;
        m[5] = 2.0 * rcpHeight;
        m[6] = 0;
        m[7] = 0;

        m[8] = 0;
        m[9] = 0;
        m[10] = 2.0 * rcpDepth;
        m[11] = 0;

        m[12] = 0.0;
        m[13] = 0.0;
        m[14] = (farDistance + nearDistance) * rcpDepth;
        m[15] = 1;
    },

    /**
     * Returns a copy of this object.
     */
    clone: function ()
    {
        return new Matrix4x4(this._m);
    },

    /**
     * Transposes the matrix.
     */
    transpose: function ()
    {
        var m = this._m;
        var m1 = m[1];
        var m2 = m[2];
        var m3 = m[3];
        var m6 = m[6];
        var m7 = m[7];
        var m11 = m[11];

        m[1] = m[4];
        m[2] = m[8];
        m[3] = m[12];

        m[4] = m1;
        m[6] = m[9];
        m[7] = m[13];

        m[8] = m2;
        m[9] = m6;
        m[11] = m[14];

        m[12] = m3;
        m[13] = m7;
        m[14] = m11;
    },

    /**
     * The determinant of a 3x3 minor matrix (matrix created by removing a given row and column)
     * @private
     * @ignore
     */
    determinant3x3: function (row, col)
    {
        // columns are the indices * 4 (to form index for row 0)
        var c1 = col === 0 ? 4 : 0;
        var c2 = col < 2 ? 8 : 4;
        var c3 = col === 3 ? 8 : 12;
        var r1 = row === 0 ? 1 : 0;
        var r2 = row < 2 ? 2 : 1;
        var r3 = row === 3 ? 2 : 3;

        var m = this._m;
        var m21 = m[c1 | r2], m22 = m[r2 | c2], m23 = m[c3 | r2];
        var m31 = m[c1 | r3], m32 = m[c2 | r3], m33 = m[r3 | c3];

        return      m[c1 | r1] * (m22 * m33 - m23 * m32)
            - m[c2 | r1] * (m21 * m33 - m23 * m31)
            + m[c3 | r1] * (m21 * m32 - m22 * m31);
    },

    /**
     * Calculates the cofactor for the given row and column
     */
    cofactor: function (row, col)
    {
        // should be able to xor sign bit instead
        var sign = 1 - (((row + col) & 1) << 1);
        return sign * this.determinant3x3(row, col);
    },

    /**
     * Creates a matrix containing all the cofactors.
     */
    getCofactorMatrix: function (row, col, target)
    {
        target = target || new Matrix4x4();

        var tm = target._m;
        for (var i = 0; i < 16; ++i)
            tm[i] = this.cofactor(i & 3, i >> 2);

        return target;
    },

    /**
     * Calculates teh adjugate matrix.
     */
    getAdjugate: function (row, col, target)
    {
        target = target || new Matrix4x4();

        var tm = target._m;
        for (var i = 0; i < 16; ++i)
            tm[i] = this.cofactor(i >> 2, i & 3);    // transposed!

        return target;
    },

    /**
     * Calculates the determinant of the matrix.
     */
    determinant: function ()
    {
        var m = this._m;
        return m[0] * this.determinant3x3(0, 0) - m[4] * this.determinant3x3(0, 1) + m[8] * this.determinant3x3(0, 2) - m[12] * this.determinant3x3(0, 3);
    },

    /**
     * Initializes as the inverse of the given matrix.
     */
    inverseOf: function (matrix)
    {
        // this can be much more efficient, but I'd like to keep it readable for now. The full inverse is not required often anyway.
        var rcpDet = 1.0 / matrix.determinant();

        // needs to be self-assignment-proof
        var m0 = rcpDet * matrix.cofactor(0, 0);
        var m1 = rcpDet * matrix.cofactor(0, 1);
        var m2 = rcpDet * matrix.cofactor(0, 2);
        var m3 = rcpDet * matrix.cofactor(0, 3);
        var m4 = rcpDet * matrix.cofactor(1, 0);
        var m5 = rcpDet * matrix.cofactor(1, 1);
        var m6 = rcpDet * matrix.cofactor(1, 2);
        var m7 = rcpDet * matrix.cofactor(1, 3);
        var m8 = rcpDet * matrix.cofactor(2, 0);
        var m9 = rcpDet * matrix.cofactor(2, 1);
        var m10 = rcpDet * matrix.cofactor(2, 2);
        var m11 = rcpDet * matrix.cofactor(2, 3);
        var m12 = rcpDet * matrix.cofactor(3, 0);
        var m13 = rcpDet * matrix.cofactor(3, 1);
        var m14 = rcpDet * matrix.cofactor(3, 2);
        var m15 = rcpDet * matrix.cofactor(3, 3);

        var m = this._m;
        m[0] = m0;
        m[1] = m1;
        m[2] = m2;
        m[3] = m3;
        m[4] = m4;
        m[5] = m5;
        m[6] = m6;
        m[7] = m7;
        m[8] = m8;
        m[9] = m9;
        m[10] = m10;
        m[11] = m11;
        m[12] = m12;
        m[13] = m13;
        m[14] = m14;
        m[15] = m15;
    },

    /**
     * Initializes as the inverse of the given matrix, assuming it is affine. It's faster than regular inverse.
     */
    inverseAffineOf: function (a)
    {
        var mm = a._m;
        var m0 = mm[0], m1 = mm[1], m2 = mm[2];
        var m4 = mm[4], m5 = mm[5], m6 = mm[6];
        var m8 = mm[8], m9 = mm[9], m10 = mm[10];
        var m12 = mm[12], m13 = mm[13], m14 = mm[14];
        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        var n0 = (m5 * m10 - m9 * m6) * rcpDet;
        var n1 = (m9 * m2 - m1 * m10) * rcpDet;
        var n2 = (m1 * m6 - m5 * m2) * rcpDet;
        var n4 = (m8 * m6 - m4 * m10) * rcpDet;
        var n5 = (m0 * m10 - m8 * m2) * rcpDet;
        var n6 = (m4 * m2 - m0 * m6) * rcpDet;
        var n8 = (m4 * m9 - m8 * m5) * rcpDet;
        var n9 = (m8 * m1 - m0 * m9) * rcpDet;
        var n10 = (m0 * m5 - m4 * m1) * rcpDet;

        var m = this._m;
        m[0] = n0;
        m[1] = n1;
        m[2] = n2;
        m[3] = 0;
        m[4] = n4;
        m[5] = n5;
        m[6] = n6;
        m[7] = 0;
        m[8] = n8;
        m[9] = n9;
        m[10] = n10;
        m[11] = 0;
        m[12] = -n0 * m12 - n4 * m13 - n8 * m14;
        m[13] = -n1 * m12 - n5 * m13 - n9 * m14;
        m[14] = -n2 * m12 - n6 * m13 - n10 * m14;
        m[15] = 1;
    },

    /**
     * Writes the inverse transpose into an array for upload (must support 9 elements)
     */
    writeNormalMatrix: function (array, index)
    {
        index = index || 0;
        var m = this._m;
        var m0 = m[0], m1 = m[1], m2 = m[2];
        var m4 = m[4], m5 = m[5], m6 = m[6];
        var m8 = m[8], m9 = m[9], m10 = m[10];

        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        array[index] = (m5 * m10 - m9 * m6) * rcpDet;
        array[index + 1] = (m8 * m6 - m4 * m10) * rcpDet;
        array[index + 2] = (m4 * m9 - m8 * m5) * rcpDet;
        array[index + 3] = (m9 * m2 - m1 * m10) * rcpDet;
        array[index + 4] = (m0 * m10 - m8 * m2) * rcpDet;
        array[index + 5] = (m8 * m1 - m0 * m9) * rcpDet;
        array[index + 6] = (m1 * m6 - m5 * m2) * rcpDet;
        array[index + 7] = (m4 * m2 - m0 * m6) * rcpDet;
        array[index + 8] = (m0 * m5 - m4 * m1) * rcpDet;
    },

    /**
     * Writes the matrix into an array for upload
     */
    writeData: function(array, index)
    {
        index = index || 0;
        var m = this._m;
        for (var i = 0; i < 16; ++i)
            array[index + i] = m[i];
    },

    /**
     * Writes the matrix into an array for upload, ignoring the bottom row (for affine matrices)
     */
    writeData4x3: function(array, index)
    {
        var m = this._m;
        index = index || 0;
        array[index] = m[0];
        array[index + 1] = m[4];
        array[index + 2] = m[8];
        array[index + 3] = m[12];
        array[index + 4] = m[1];
        array[index + 5] = m[5];
        array[index + 6] = m[9];
        array[index + 7] = m[13];
        array[index + 8] = m[2];
        array[index + 9] = m[6];
        array[index + 10] = m[10];
        array[index + 11] = m[14];
    },

    /**
     * Inverts the matrix.
     */
    invert: function ()
    {
        this.inverseOf(this);
    },

    /**
     * Inverts the matrix, assuming it's affine (faster than regular inverse)
     */
    invertAffine: function ()
    {
        this.inverseAffineOf(this);
    },

    /**
     * Post-multiplication (M x this)
     */
    append: function (m)
    {
        this.multiply(m, this);
    },

    /**
     * Pre-multiplication (this x M)
     */
    prepend: function (m)
    {
        this.multiply(this, m);
    },

    /**
     * Post-multiplication (M x this) assuming affine matrices
     */
    appendAffine: function (m)
    {
        this.multiplyAffine(m, this);
    },

    /**
     * Pre-multiplication (M x this) assuming affine matrices
     */
    prependAffine: function (m)
    {
        this.multiplyAffine(this, m);
    },

    /**
     * Adds the elements of another matrix to this one.
     */
    add: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] += mm[0];
        m[1] += mm[1];
        m[2] += mm[2];
        m[3] += mm[3];
        m[4] += mm[4];
        m[5] += mm[5];
        m[6] += mm[6];
        m[7] += mm[7];
        m[8] += mm[8];
        m[9] += mm[9];
        m[10] += mm[10];
        m[11] += mm[11];
        m[12] += mm[12];
        m[13] += mm[13];
        m[14] += mm[14];
        m[15] += mm[15];
    },

    /**
     * Adds the elements of another matrix to this one, assuming both are affine.
     */
    addAffine: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] += mm[0];
        m[1] += mm[1];
        m[2] += mm[2];
        m[4] += mm[4];
        m[5] += mm[5];
        m[6] += mm[6];
        m[8] += mm[8];
        m[9] += mm[9];
        m[10] += mm[10];
    },

    /**
     * Subtracts the elements of another matrix from this one.
     */
    subtract: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] -= mm[0];
        m[1] -= mm[1];
        m[2] -= mm[2];
        m[3] -= mm[3];
        m[4] -= mm[4];
        m[5] -= mm[5];
        m[6] -= mm[6];
        m[7] -= mm[7];
        m[8] -= mm[8];
        m[9] -= mm[9];
        m[10] -= mm[10];
        m[11] -= mm[11];
        m[12] -= mm[12];
        m[13] -= mm[13];
        m[14] -= mm[14];
        m[15] -= mm[15];
    },

    /**
     * Subtracts the elements of another matrix from this one, assuming both are affine.
     */
    subtractAffine: function (a)
    {
        var m = this._m;
        var mm = a._m;
        m[0] -= mm[0];
        m[1] -= mm[1];
        m[2] -= mm[2];
        m[4] -= mm[4];
        m[5] -= mm[5];
        m[6] -= mm[6];
        m[8] -= mm[8];
        m[9] -= mm[9];
        m[10] -= mm[10];
    },

    /**
     * Post-multiplies a scale
     */
    appendScale: function (x, y, z)
    {
        if (x instanceof Float4) {
            y = x.y;
            z = x.z;
            x = x.x;
        }
        else if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] *= x;
        m[1] *= y;
        m[2] *= z;
        m[4] *= x;
        m[5] *= y;
        m[6] *= z;
        m[8] *= x;
        m[9] *= y;
        m[10] *= z;
        m[12] *= x;
        m[13] *= y;
        m[14] *= z;
    },

    /**
     * Pre-multiplies a scale
     */
    prependScale: function (x, y, z)
    {
        if (x instanceof Float4) {
            y = x.y;
            z = x.z;
            x = x.x;
        }
        else if (y === undefined)
            y = z = x;

        var m = this._m;
        m[0] *= x;
        m[1] *= x;
        m[2] *= x;
        m[3] *= x;
        m[4] *= y;
        m[5] *= y;
        m[6] *= y;
        m[7] *= y;
        m[8] *= z;
        m[9] *= z;
        m[10] *= z;
        m[11] *= z;
    },

    /**
     * Post-multiplies a translation
     */
    appendTranslation: function (v)
    {
        var m = this._m;
        m[12] += v.x;
        m[13] += v.y;
        m[14] += v.z;
    },

    /**
     * Pre-multiplies a translation
     */
    prependTranslation: function (v)
    {
        var m = this._m;
        var x = v.x, y = v.y, z = v.z;
        m[12] += m[0] * x + m[4] * y + m[8] * z;
        m[13] += m[1] * x + m[5] * y + m[9] * z;
        m[14] += m[2] * x + m[6] * y + m[10] * z;
        m[15] += m[3] * x + m[7] * y + m[11] * z;
    },

    /**
     * Post-multiplies a quaternion rotation
     */
    appendQuaternion: function (q)
    {
        var m = this._m;
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = 1 - 2 * (y * y + z * z), a_m10 = 2 * (x * y + w * z), a_m20 = 2 * (x * z - w * y);
        var a_m01 = 2 * (x * y - w * z), a_m11 = 1 - 2 * (x * x + z * z), a_m21 = 2 * (y * z + w * x);
        var a_m02 = 2 * (x * z + w * y), a_m12 = 2 * (y * z - w * x), a_m22 = 1 - 2 * (x * x + y * y);

        var b_m00 = m[0], b_m10 = m[1], b_m20 = m[2];
        var b_m01 = m[4], b_m11 = m[5], b_m21 = m[6];
        var b_m02 = m[8], b_m12 = m[9], b_m22 = m[10];
        var b_m03 = m[12], b_m13 = m[13], b_m23 = m[14];

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
    },

    /**
     * Pre-multiplies a quaternion rotation
     */
    prependQuaternion: function (q)
    {
        var m = this._m;
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var a_m00 = m[0], a_m10 = m[1], a_m20 = m[2];
        var a_m01 = m[4], a_m11 = m[5], a_m21 = m[6];
        var a_m02 = m[8], a_m12 = m[9], a_m22 = m[10];

        var b_m00 = 1 - 2 * (y * y + z * z), b_m10 = 2 * (x * y + w * z), b_m20 = 2 * (x * z - w * y);
        var b_m01 = 2 * (x * y - w * z), b_m11 = 1 - 2 * (x * x + z * z), b_m21 = 2 * (y * z + w * x);
        var b_m02 = 2 * (x * z + w * y), b_m12 = 2 * (y * z - w * x), b_m22 = 1 - 2 * (x * x + y * y);

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
    },

    /**
     * Post-multiplies an axis/angle rotation
     */
    appendRotationAxisAngle: function (axis, radians)
    {
        var m = this._m;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = oneMinCos * x * x + cos, a_m10 = oneMinCos * x * y + sin * z, a_m20 = oneMinCos * x * z - sin * y;
        var a_m01 = oneMinCos * x * y - sin * z, a_m11 = oneMinCos * y * y + cos, a_m21 = oneMinCos * y * z + sin * x;
        var a_m02 = oneMinCos * x * z + sin * y, a_m12 = oneMinCos * y * z - sin * x, a_m22 = oneMinCos * z * z + cos;

        var b_m00 = m[0], b_m10 = m[1], b_m20 = m[2];
        var b_m01 = m[4], b_m11 = m[5], b_m21 = m[6];
        var b_m02 = m[8], b_m12 = m[9], b_m22 = m[10];
        var b_m03 = m[12], b_m13 = m[13], b_m23 = m[14];

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;

        m[12] = a_m00 * b_m03 + a_m01 * b_m13 + a_m02 * b_m23;
        m[13] = a_m10 * b_m03 + a_m11 * b_m13 + a_m12 * b_m23;
        m[14] = a_m20 * b_m03 + a_m21 * b_m13 + a_m22 * b_m23;
    },

    /**
     * Pre-multiplies an axis/angle rotation
     */
    prependRotationAxisAngle: function (axis, radians)
    {
        var m = this._m;
        var cos = Math.cos(radians);
        var sin = Math.sin(radians);
        var rcpLen = 1 / axis.length;

        var x = axis.x * rcpLen, y = axis.y * rcpLen, z = axis.z * rcpLen;
        var oneMinCos = 1 - cos;

        var a_m00 = m[0], a_m10 = m[1], a_m20 = m[2];
        var a_m01 = m[4], a_m11 = m[5], a_m21 = m[6];
        var a_m02 = m[8], a_m12 = m[9], a_m22 = m[10];

        var b_m00 = oneMinCos * x * x + cos, b_m10 = oneMinCos * x * y + sin * z, b_m20 = oneMinCos * x * z - sin * y;
        var b_m01 = oneMinCos * x * y - sin * z, b_m11 = oneMinCos * y * y + cos, b_m21 = oneMinCos * y * z + sin * x;
        var b_m02 = oneMinCos * x * z + sin * y, b_m12 = oneMinCos * y * z - sin * x, b_m22 = oneMinCos * z * z + cos;

        m[0] = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20;
        m[1] = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20;
        m[2] = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20;

        m[4] = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21;
        m[5] = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21;
        m[6] = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21;

        m[8] = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22;
        m[9] = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22;
        m[10] = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22;
    },

    /**
     * Gets the given row from the matrix.
     * @param {Number} index The index of the row
     * @param {Float4} [target] An optional target. If omitted, a new object will be created.
     */
    getRow: function (index, target)
    {
        var m = this._m;
        target = target || new Float4();
        target.x = m[index];
        target.y = m[index | 4];
        target.z = m[index | 8];
        target.w = m[index | 12];
        return target;
    },

    /**
     * Sets a row in the matrix.
     * @param {Number} index The index of the row.
     * @param {Float4} v The vector to assign to the row
     */
    setRow: function (index, v)
    {
        var m = this._m;
        m[index] = v.x;
        m[index | 4] = v.y;
        m[index | 8] = v.z;
        m[index | 12] = v.w;
    },

    /**
     * Gets the value of a single element.
     * @param row The row index
     * @param col The column index
     */
    getElement: function(row, col)
    {
        return this._m[row | (col << 2)];
    },

    /**
     * Sets the value of a single element.
     * @param row The row index
     * @param col The column index
     * @param value The value to assign to the element
     */
    setElement: function(row, col, value)
    {
        this._m[row | (col << 2)] = value;
    },

    /**
     * Gets the given column from the matrix.
     * @param {Number} index The index of the column
     * @param {Float4} [target] An optional target. If omitted, a new object will be created.
     */
    getColumn: function (index, target)
    {
        var m = this._m;
        target = target || new Float4();
        index <<= 2;
        target.x = m[index];
        target.y = m[index | 1];
        target.z = m[index | 2];
        target.w = m[index | 3];
        return target;
    },

    /**
     * Sets a column in the matrix.
     * @param {Number} index The index of the column.
     * @param {Float4} v The vector to assign to the column
     */
    setColumn: function (index, v)
    {
        var m = this._m;
        index <<= 2;
        m[index] = v.x;
        m[index | 1] = v.y;
        m[index | 2] = v.z;
        m[index | 3] = v.w;
    },

    /**
     * Copies a column from another matrix.
     * @param {Number} index The index of the column.
     * @param {Matrix4x4} m The matrix from which to copy.
     */
    copyColumn: function(index, m)
    {
        var m1 = this._m;
        var m2 = m._m;
        index <<= 2;
        m1[index] = m2[index];
        m1[index | 1] = m2[index | 1];
        m1[index | 2] = m2[index | 2];
        m1[index | 3] = m2[index | 3];
    },

    /**
     * Initializes as a "lookAt" matrix at the given eye position oriented toward a target
     * @param {Float4} target The target position to look at.
     * @param {Float4} eye The target position the matrix should "be" at
     * @param {Float4} up The world-up vector. Must be unit length (usually Float4.Y_AXIS)
     */
    lookAt: function (target, eye, up)
    {
        var xAxis = new Float4();
        var yAxis = new Float4();
        var zAxis = new Float4();

        return function(target, eye, up)
        {
            Float4.subtract(target, eye, zAxis);
            zAxis.normalize();

            Float4.cross(up, zAxis, xAxis);

            if (Math.abs(xAxis.lengthSqr) > .0001) {
                xAxis.normalize();
            }
            else {
                var altUp = new Float4(up.x, up.z, up.y, 0.0);
                Float4.cross(altUp, zAxis, xAxis);
                if (Math.abs(xAxis.lengthSqr) <= .0001) {
                    altUp.set(up.z, up.y, up.z, 0.0);
                    Float4.cross(altUp, zAxis, xAxis);
                }
                xAxis.normalize();
            }

            Float4.cross(zAxis, xAxis, yAxis);

            var m = this._m;
            m[0] = xAxis.x;
            m[1] = xAxis.y;
            m[2] = xAxis.z;
            m[3] = 0.0;
            m[4] = yAxis.x;
            m[5] = yAxis.y;
            m[6] = yAxis.z;
            m[7] = 0.0;
            m[8] = zAxis.x;
            m[9] = zAxis.y;
            m[10] = zAxis.z;
            m[11] = 0.0;
            m[12] = eye.x;
            m[13] = eye.y;
            m[14] = eye.z;
            m[15] = 1.0;
        }
    }(),

    /**
     * Initializes as an affine transformation based on a transform object
     */
    compose: function(transform)
    {
        this.fromScale(transform.scale);
        this.appendQuaternion(transform.rotation);
        this.appendTranslation(transform.position);
    },

    /**
     * Decomposes an affine transformation matrix into a Transform object, or a triplet position, quaternion, scale.
     * @param targetOrPos An optional target object to store the values. If this is a Float4, quat and scale need to be provided. If omitted, a new Transform object will be created and returned.
     * @param quat An optional quaternion to store rotation. Unused if targetOrPos is a Transform object.
     * @param quat An optional Float4 to store scale. Unused if targetOrPos is a Transform object.
     */
    decompose: function (targetOrPos, quat, scale)
    {
        targetOrPos = targetOrPos || new Transform();

        var pos;
        if (quat === undefined) {
            quat = targetOrPos.rotation;
            scale = targetOrPos.scale;
            pos = targetOrPos.position;
        }
        else pos = targetOrPos;

        var m = this._m;
        var m0 = m[0], m1 = m[1], m2 = m[2];
        var m4 = m[4], m5 = m[5], m6 = m[6];
        var m8 = m[8], m9 = m[9], m10 = m[10];

        // check for negative scale by calculating cross X x Y (positive scale should yield the same Z)
        var cx = m1*m6 - m2*m5;
        var cy = m2*m4 - m0*m6;
        var cz = m0*m5 - m1*m4;

        // dot cross product X x Y with Z < 0? Lefthanded flip.
        var flipSign = MathX.sign(cx * m8 + cy * m9 + cz * m10);

        // we assign the flipSign to all three instead of just 1, so that if a uniform negative scale was used, this will
        // be preserved
        scale.x = flipSign * Math.sqrt(m0 * m0 + m1 * m1 + m2 * m2);
        scale.y = flipSign * Math.sqrt(m4 * m4 + m5 * m5 + m6 * m6);
        scale.z = flipSign * Math.sqrt(m8 * m8 + m9 * m9 + m10 * m10);
        var clone = this.clone();

        var rcpX = 1.0 / scale.x, rcpY = 1.0 / scale.y, rcpZ = 1.0 / scale.z;

        var cm = clone._m;
        cm[0] *= rcpX;
        cm[1] *= rcpX;
        cm[2] *= rcpX;
        cm[4] *= rcpY;
        cm[5] *= rcpY;
        cm[6] *= rcpY;
        cm[8] *= rcpZ;
        cm[9] *= rcpZ;
        cm[10] *= rcpZ;

        quat.fromMatrix(clone);
        this.getColumn(3, pos);

        return targetOrPos;
    },

    /**
     * Swaps two columns
     */
    swapColums: function(i, j)
    {
        var m = this._m;
        if (i === j) return;
        i <<= 2;
        j <<= 2;
        var x = m[i];
        var y = m[i | 1];
        var z = m[i | 2];
        var w = m[i | 3];
        m[i] = m[j];
        m[i | 1] = m[j | 1];
        m[i | 2] = m[j | 2];
        m[i | 3] = m[j | 3];
        m[j] = x;
        m[j | 1] = y;
        m[j | 2] = z;
        m[j | 3] = w;
    },

    /**
     * @ignore
     */
    toString: function()
    {
        var m = this._m;
        var str = "";
        for (var i = 0; i < 16; ++i) {
            var mod = i & 0x3;
            if (mod === 0)
                str += "[";

            str += m[i];

            if (mod === 3)
                str += "]\n";
            else
                str += "\t , \t";
        }
        return str;
    }
};

/**
 * Preset for the identity matrix
 */
Matrix4x4.IDENTITY = new Matrix4x4();

/**
 * Preset for the all-zero matrix
 */
Matrix4x4.ZERO = new Matrix4x4(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
var UniformSetter = {

    getSettersPerInstance: function (shader)
    {
        if (UniformSetter._instanceTable === undefined)
            UniformSetter._init();

        return UniformSetter._findSetters(shader, UniformSetter._instanceTable);
    },

    getSettersPerPass: function (shader)
    {
        if (UniformSetter._passTable === undefined)
            UniformSetter._init();

        return UniformSetter._findSetters(shader, UniformSetter._passTable);
    },

    _findSetters: function (shader, table)
    {
        var setters = [];
        for (var uniformName in table) {
            var location = GL.gl.getUniformLocation(shader._program, uniformName);
            if (!location) continue;
            var setter = new table[uniformName]();
            setters.push(setter);
            setter.location = location;
        }

        return setters;
    },

    _init: function ()
    {
        UniformSetter._instanceTable = {};
        UniformSetter._passTable = {};

        UniformSetter._instanceTable.hx_worldMatrix = WorldMatrixSetter;
        UniformSetter._instanceTable.hx_worldViewMatrix = WorldViewMatrixSetter;
        UniformSetter._instanceTable.hx_wvpMatrix = WorldViewProjectionSetter;
        UniformSetter._instanceTable.hx_inverseWVPMatrix = InverseWVPSetter;
        UniformSetter._instanceTable.hx_normalWorldMatrix = NormalWorldMatrixSetter;
        UniformSetter._instanceTable.hx_normalWorldViewMatrix = NormalWorldViewMatrixSetter;
        UniformSetter._instanceTable["hx_skinningMatrices[0]"] = SkinningMatricesSetter;
        UniformSetter._instanceTable["hx_morphWeights[0]"] = MorphWeightsSetter;

        UniformSetter._passTable.hx_viewMatrix = ViewMatrixSetter;
        UniformSetter._passTable.hx_projectionMatrix = ProjectionSetter;
        UniformSetter._passTable.hx_inverseProjectionMatrix = InverseProjectionSetter;
        UniformSetter._passTable.hx_viewProjectionMatrix = ViewProjectionSetter;
        UniformSetter._passTable.hx_inverseViewProjectionMatrix = InverseViewProjectionSetter;
        UniformSetter._passTable.hx_cameraWorldPosition = CameraWorldPosSetter;
        UniformSetter._passTable.hx_cameraWorldMatrix = CameraWorldMatrixSetter;
        UniformSetter._passTable.hx_cameraFrustumRange = CameraFrustumRangeSetter;
        UniformSetter._passTable.hx_rcpCameraFrustumRange = RCPCameraFrustumRangeSetter;
        UniformSetter._passTable.hx_cameraNearPlaneDistance = CameraNearPlaneDistanceSetter;
        UniformSetter._passTable.hx_cameraFarPlaneDistance = CameraFarPlaneDistanceSetter;
        UniformSetter._passTable.hx_renderTargetResolution = RenderTargetResolutionSetter;
        UniformSetter._passTable.hx_rcpRenderTargetResolution = RCPRenderTargetResolutionSetter;
        UniformSetter._passTable.hx_dither2DTextureScale = Dither2DTextureScaleSetter;
        UniformSetter._passTable.hx_ambientColor = AmbientColorSetter;
        UniformSetter._passTable["hx_poissonDisk[0]"] = PoissonDiskSetter;
        UniformSetter._passTable["hx_poissonSphere[0]"] = PoissonSphereSetter;
    }
};


function WorldMatrixSetter()
{
}

WorldMatrixSetter.prototype.execute = function (camera, renderItem)
{
    GL.gl.uniformMatrix4fv(this.location, false, renderItem.worldMatrix._m);
};


function ViewProjectionSetter()
{
}

ViewProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.viewProjectionMatrix._m);
};

function InverseViewProjectionSetter()
{
}

InverseViewProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.inverseViewProjectionMatrix._m);
};

function InverseWVPSetter()
{
}

InverseWVPSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.inverseViewProjectionMatrix._m);
};

function ProjectionSetter()
{
}

ProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.projectionMatrix._m);
};

function InverseProjectionSetter()
{
}

InverseProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.inverseProjectionMatrix._m);
};

function WorldViewProjectionSetter()
{
}

WorldViewProjectionSetter.prototype.execute = function()
{
    var matrix = new Matrix4x4();
    var m = matrix._m;
    return function(camera, renderItem)
    {
        matrix.multiply(camera.viewProjectionMatrix, renderItem.worldMatrix);
        GL.gl.uniformMatrix4fv(this.location, false, m);
    };
}();

function WorldViewMatrixSetter()
{
    this._matrix = new Matrix4x4();
}

WorldViewMatrixSetter.prototype.execute = function(){
    var matrix = new Matrix4x4();
    var m = matrix._m;
    return function (camera, renderItem)
    {
        matrix.multiply(camera.viewMatrix, renderItem.worldMatrix);
        GL.gl.uniformMatrix4fv(this.location, false, m);
    }
}();


function NormalWorldMatrixSetter()
{
}

NormalWorldMatrixSetter.prototype.execute = function() {
    var data = new Float32Array(9);
    return function (camera, renderItem)
    {
        renderItem.worldMatrix.writeNormalMatrix(data);
        GL.gl.uniformMatrix3fv(this.location, false, data);    // transpose of inverse
    }
}();


function NormalWorldViewMatrixSetter()
{
}

NormalWorldViewMatrixSetter.prototype.execute = function() {
    var data = new Float32Array(9);
    //var matrix = new Matrix4x4();

    return function (camera, renderItem)
    {
        // the following code is the same as the following two lines, but inlined and reducing the need for all field to be multiplied
        //matrix.multiply(camera.viewMatrix, renderItem.worldMatrix);
        //matrix.writeNormalMatrix(data);

        var am = camera.viewMatrix._m;
        var bm = renderItem.worldMatrix._m;

        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2], b_m30 = bm[3];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6], b_m31 = bm[7];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10], b_m32 = bm[11];

        var m0 = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20 + a_m03 * b_m30;
        var m1 = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20 + a_m13 * b_m30;
        var m2 = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20 + a_m23 * b_m30;
        var m4 = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21 + a_m03 * b_m31;
        var m5 = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21 + a_m13 * b_m31;
        var m6 = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21 + a_m23 * b_m31;
        var m8 = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22 + a_m03 * b_m32;
        var m9 = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22 + a_m13 * b_m32;
        var m10 = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22 + a_m23 * b_m32;

        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        data[0] = (m5 * m10 - m9 * m6) * rcpDet;
        data[1] = (m8 * m6 - m4 * m10) * rcpDet;
        data[2] = (m4 * m9 - m8 * m5) * rcpDet;
        data[3] = (m9 * m2 - m1 * m10) * rcpDet;
        data[4] = (m0 * m10 - m8 * m2) * rcpDet;
        data[5] = (m8 * m1 - m0 * m9) * rcpDet;
        data[6] = (m1 * m6 - m5 * m2) * rcpDet;
        data[7] = (m4 * m2 - m0 * m6) * rcpDet;
        data[8] = (m0 * m5 - m4 * m1) * rcpDet;

        GL.gl.uniformMatrix3fv(this.location, false, data);    // transpose of inverse
    }
}();

function CameraWorldPosSetter()
{
}

CameraWorldPosSetter.prototype.execute = function (camera)
{
    var arr = camera.worldMatrix._m;
    GL.gl.uniform3f(this.location, arr[12], arr[13], arr[14]);
};

function CameraWorldMatrixSetter()
{
}

CameraWorldMatrixSetter.prototype.execute = function (camera)
{
    var matrix = camera.worldMatrix;
    GL.gl.uniformMatrix4fv(this.location, false, matrix._m);
};

function CameraFrustumRangeSetter()
{
}

CameraFrustumRangeSetter.prototype.execute = function (camera)
{
    GL.gl.uniform1f(this.location, camera._farDistance - camera._nearDistance);
};

function RCPCameraFrustumRangeSetter()
{
}

RCPCameraFrustumRangeSetter.prototype.execute = function (camera)
{
    GL.gl.uniform1f(this.location, 1.0 / (camera._farDistance - camera._nearDistance));
};

function CameraNearPlaneDistanceSetter()
{
}

CameraNearPlaneDistanceSetter.prototype.execute = function (camera)
{
    GL.gl.uniform1f(this.location, camera._nearDistance);
};

function CameraFarPlaneDistanceSetter()
{
}

CameraFarPlaneDistanceSetter.prototype.execute = function (camera)
{
    GL.gl.uniform1f(this.location, camera._farDistance);
};

function ViewMatrixSetter()
{
}

ViewMatrixSetter.prototype.execute = function (camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.viewMatrix._m);
};

function RenderTargetResolutionSetter()
{
}

RenderTargetResolutionSetter.prototype.execute = function (camera)
{
    GL.gl.uniform2f(this.location, camera._renderTargetWidth, camera._renderTargetHeight);
};

function AmbientColorSetter()
{
}

AmbientColorSetter.prototype.execute = function (camera, renderer)
{
    var color = renderer._ambientColor;
    GL.gl.uniform3f(this.location, color.r, color.g, color.b);
};

function RCPRenderTargetResolutionSetter()
{
}

RCPRenderTargetResolutionSetter.prototype.execute = function (camera)
{
    GL.gl.uniform2f(this.location, 1.0/camera._renderTargetWidth, 1.0/camera._renderTargetHeight);
};

function Dither2DTextureScaleSetter()
{
}

Dither2DTextureScaleSetter.prototype.execute = function ()
{
    GL.gl.uniform2f(this.location, 1.0 / DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.width, 1.0 / DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.height);
};

function PoissonDiskSetter()
{
}

PoissonDiskSetter.prototype.execute = function ()
{
    GL.gl.uniform2fv(this.location, PoissonDisk.DEFAULT_FLOAT32);
};

function PoissonSphereSetter()
{
}

PoissonSphereSetter.prototype.execute = function ()
{
    GL.gl.uniform3fv(this.location, PoissonSphere.DEFAULT_FLOAT32);
};

function SkinningMatricesSetter()
{
    this._data = new Float32Array(META.OPTIONS.maxSkeletonJoints * 12);
}

SkinningMatricesSetter.prototype.execute = function (camera, renderItem)
{
    var skeleton = renderItem.skeleton;

    if (skeleton) {
        // TODO: Could we store the 4x3 format in renderItem.skeletonMatrices?
        // no need to store actual matrices in this data
        var matrices = renderItem.skeletonMatrices;
        var numJoints = skeleton.numJoints;
        var j = 0;

        for (var i = 0; i < numJoints; ++i) {
            matrices[i].writeData4x3(this._data, j);
            j += 12;
        }
        GL.gl.uniform4fv(this.location, this._data);
    }
};

function MorphWeightsSetter()
{
}

MorphWeightsSetter.prototype.execute = function (camera, renderItem)
{
    GL.gl.uniform1fv(this.location, renderItem.meshInstance._morphWeights);
};

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
var Debug = {
    printShaderCode: function(code)
    {
        var arr = code.split("\n");
        var str = "";
        for (var i = 0; i < arr.length; ++i) {
            str += (i + 1) + ":\t" + arr[i] + "\n";
        }
        console.log(str);
    },

    printSkeletonHierarchy: function(skeleton)
    {
        var str = "Skeleton: \n";
        for (var i = 0; i < skeleton.numJoints; ++i) {
            var joint = skeleton.getJoint(i);
            var name = joint.name;
            while (joint.parentIndex !== -1) {
                joint = skeleton.getJoint(joint.parentIndex);
                str += "\t";
            }
            str += "\t" + name + "\n";
        }
        console.log(str);
    },

    assert: function(bool, message)
    {
        if (!bool) throw new Error(message);
    }
};

// these are some debug profiling methods used while developing

/**
 * Just some timing functions used for engine dev.
 *
 * @ignore
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var Profiler = (function() {
    var times =  {};
    var startTimes = {};

    return {
        getTime: function (id)
        {
            return times[id];
        },

        startTiming: function (id)
        {
            if (!times[id]) times[id] = 0;
            startTimes[id] = Date.now();
        },

        stopTiming: function (id)
        {
            times[id] += Date.now() - startTimes[id];
        },

        resetTiming: function (id)
        {
            times[id] = 0;
        }
    }
})();

/**
 * @ignore
 * @param vertexShaderCode
 * @param fragmentShaderCode
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Shader(vertexShaderCode, fragmentShaderCode)
{
    this._ready = false;
    this._vertexShader = null;
    this._fragmentShader = null;
    this._program = null;
    this._uniformSettersInstance = null;
    this._uniformSettersPass = null;

    if (vertexShaderCode && fragmentShaderCode)
        this.init(vertexShaderCode, fragmentShaderCode);
}

Shader.ID_COUNTER = 0;

Shader.prototype = {
    constructor: Shader,

    isReady: function() { return this._ready; },

    init: function(vertexShaderCode, fragmentShaderCode)
    {
        var gl = GL.gl;
        vertexShaderCode = "#define HX_VERTEX_SHADER\n" + GLSLIncludes.GENERAL + vertexShaderCode;
        fragmentShaderCode = "#define HX_FRAGMENT_SHADER\n" + GLSLIncludes.GENERAL + fragmentShaderCode;

        vertexShaderCode = this._processShaderCode(vertexShaderCode);
        fragmentShaderCode = this._processShaderCode(fragmentShaderCode);

        this._vertexShader = gl.createShader(gl.VERTEX_SHADER);
        if (!this._initShader(this._vertexShader, vertexShaderCode)) {
            this.dispose();
            if (META.OPTIONS.throwOnShaderError) {
                throw new Error("Failed generating vertex shader: \n" + vertexShaderCode);
            }
            else {
                console.warn("Failed generating vertex shader");
            }

            return;
        }

        this._fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!this._initShader(this._fragmentShader, fragmentShaderCode)) {
            this.dispose();
            if (META.OPTIONS.throwOnShaderError)
                throw new Error("Failed generating fragment shader: \n" + fragmentShaderCode);
            else
                console.warn("Failed generating fragment shader:");
            return;
        }

        this._program = gl.createProgram();

        gl.attachShader(this._program, this._vertexShader);
        gl.attachShader(this._program, this._fragmentShader);
        gl.linkProgram(this._program);

        if (META.OPTIONS.debug && !gl.getProgramParameter(this._program, gl.LINK_STATUS)) {
            var log = gl.getProgramInfoLog(this._program);
            this.dispose();

            console.log("**********");
            Debug.printShaderCode(vertexShaderCode);
            console.log("**********");
            Debug.printShaderCode(fragmentShaderCode);

            if (META.OPTIONS.throwOnShaderError)
                throw new Error("Error in program linking:" + log);

            console.warn("Error in program linking:" + log);

            return;
        }

        this._ready = true;

        Profiler.stopTiming("Shader::init");

        this._uniformSettersInstance = UniformSetter.getSettersPerInstance(this);
        this._uniformSettersPass = UniformSetter.getSettersPerPass(this);
    },

    updatePassRenderState: function(camera, renderer)
    {
        GL.gl.useProgram(this._program);

        var len = this._uniformSettersPass.length;
        for (var i = 0; i < len; ++i)
            this._uniformSettersPass[i].execute(camera, renderer);
    },

    updateInstanceRenderState: function(camera, renderItem)
    {
        var len = this._uniformSettersInstance.length;
        for (var i = 0; i < len; ++i)
            this._uniformSettersInstance[i].execute(camera, renderItem);
    },

    _initShader: function(shader, code)
    {
        var gl = GL.gl;
        gl.shaderSource(shader, code);
        gl.compileShader(shader);

        // Check the compile status, return an error if failed
        if (META.OPTIONS.debug && !gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.warn(gl.getShaderInfoLog(shader));
            Debug.printShaderCode(code);
            return false;
        }

        return true;
    },

    dispose: function()
    {
        var gl = GL.gl;
        gl.deleteShader(this._vertexShader);
        gl.deleteShader(this._fragmentShader);
        gl.deleteProgram(this._program);

        this._ready = false;
    },

    getProgram: function() { return this._program; },

    getUniformLocation: function(name)
    {
        return GL.gl.getUniformLocation(this._program, name);
    },

    getAttributeLocation: function(name)
    {
        return GL.gl.getAttribLocation(this._program, name);
    },

    _processShaderCode: function(code)
    {
        code = this._processExtensions(code, /^\s*#derivatives\s*$/gm, "GL_OES_standard_derivatives");
        code = this._processExtensions(code, /^\s*#texturelod\s*$/gm, "GL_EXT_shader_texture_lod");
        code = this._processExtensions(code, /^\s*#drawbuffers\s*$/gm, "GL_EXT_draw_buffers");
        code = this._guard(code, /^\s*uniform\s+\w+\s+hx_\w+(\[\w+])?\s*;/gm);
        code = this._guard(code, /^\s*attribute\s+\w+\s+hx_\w+\s*;/gm);
        return code;
    },

    _processExtensions: function(code, regEx, extension)
    {

        var index = code.search(regEx);
        if (index < 0) return code;
        code = "#extension " + extension + " : enable\n" + code.replace(regEx, "");
        return code;
    },

    // this makes sure reserved uniforms are only used once, makes it easier to combine several snippets
    // it's quite slow, tho
    _guard: function(code, regEx)
    {
        var result = code.match(regEx) || [];
        var covered = {};


        for (var i = 0; i < result.length; ++i) {
            var occ = result[i];
            occ = occ.replace(/(\r|\n)/g, "");

            if (occ.charCodeAt(0) === 10)
                occ = occ.substring(1);

            var start$$1 = occ.indexOf("hx_");
            var end = occ.indexOf(";");

            // in case of arrays
            var sq = occ.indexOf("[");
            if (sq >= 0 && sq < end) end = sq;

            var name = occ.substring(start$$1, end);
            name = name.trim();

            if (covered[name]) continue;

            covered[name] = true;

            var defName = "HX_GUARD_" + name.toUpperCase();
            var repl =  "\n#ifndef " + defName + "\n" +
                        "#define " + defName + "\n" +
                        occ + "\n" +
                        "#endif\n";

            occ = occ.replace(/\[/g, "\\[");
            var replReg = new RegExp(occ, "g");
            code = code.replace(replReg, repl);
        }

        return code;
    }
};

/**
 * @param fragmentShader
 * @constructor
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CustomCopyShader(fragmentShader)
{
    Shader.call(this);
    this.init(ShaderLibrary.get("copy_vertex.glsl"), fragmentShader);

    var gl = GL.gl;
    var textureLocation = gl.getUniformLocation(this._program, "sampler");

    this._positionAttributeLocation = gl.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(this._program, "hx_texCoord");

    gl.useProgram(this._program);
    gl.uniform1i(textureLocation, 0);
}

CustomCopyShader.prototype = Object.create(Shader.prototype);

CustomCopyShader.prototype.execute = function(rect, texture)
{
    var gl = GL.gl;
    GL.setDepthTest(Comparison.DISABLED);
    GL.setCullMode(CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updatePassRenderState();

    texture.bind(0);

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    GL.drawElements(ElementType.TRIANGLES, 6, 0);
};



/**
 * Copies one texture's channels (in configurable ways) to another's.
 * @param channel Can be either x, y, z, w or any 4-component swizzle. default is xyzw, meaning a simple copy
 * @constructor
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CopyChannelsShader(channel, copyAlpha)
{
    channel = channel || "xyzw";
    copyAlpha = copyAlpha === undefined? true : copyAlpha;

    var define = "#define extractChannels(src) ((src)." + channel + ")\n";

    if (copyAlpha) define += "#define COPY_ALPHA\n";

    CustomCopyShader.call(this, define + ShaderLibrary.get("copy_fragment.glsl"));
}

CopyChannelsShader.prototype = Object.create(CustomCopyShader.prototype);



/**
 * @classdesc
 * Copies the texture from linear space to gamma space.
 *
 * @ignore
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ApplyGammaShader()
{
    CustomCopyShader.call(this, ShaderLibrary.get("copy_to_gamma_fragment.glsl"));
}

ApplyGammaShader.prototype = Object.create(CustomCopyShader.prototype);

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function IndexBuffer()
{
    this._buffer = GL.gl.createBuffer();
}

IndexBuffer.prototype = {
    /**
     * Uploads data for the buffer.
     * @param data The data to upload, must be a Int16Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        if (usageHint === undefined)
            usageHint = BufferUsage.STATIC_DRAW;

        this.bind();
        GL.gl.bufferData(GL.gl.ELEMENT_ARRAY_BUFFER, data, usageHint);
    },

    /**
     * @private
     */
    bind: function()
    {
        GL.gl.bindBuffer(GL.gl.ELEMENT_ARRAY_BUFFER, this._buffer);
    }
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VertexBuffer()
{
    this._buffer = GL.gl.createBuffer();
}

VertexBuffer.prototype = {

    /**
     * Uploads data for the buffer.
     * @param data The data to upload, must be a Float32Array object.
     * @param usageHint An optional usage hint for the buffer.
     */
    uploadData: function(data, usageHint)
    {
        if (usageHint === undefined)
            usageHint = GL.gl.STATIC_DRAW;

        this.bind();
        GL.gl.bufferData(GL.gl.ARRAY_BUFFER, data, usageHint);
    },

    /**
     * @private
     */
    bind: function()
    {
        GL.gl.bindBuffer(GL.gl.ARRAY_BUFFER, this._buffer);
    }
};

/**
 * @ignore
 */
var Mesh_ID_COUNTER = 0;

/**
 * @classdesc
 *
 * <p>Mesh contains the actual geometry of a renderable object. A {@linkcode Model} can contain several Mesh objects. The
 * {@linkcode Model} is used by {@linkcode ModelInstance}, which links materials to the meshes, and provides them a
 * place in the scene graph.</p>
 *
 * <p>A Mesh can have vertex attributes spread out over several "streams". Every stream means a separate vertex buffer will be used.</p>
 *
 * <p>A Mesh should have its layout defined using addVertexAttribute, and initial data supplied using setVertexData,
 * before passing it on to a Model. These values will be used to calculate its local bounding box.
 * After this, setVertexData can be called to change data, but it will not change the model</p>
 *
 * @param {BufferUsage} vertexUsage A usage hint for the vertex buffer.
 * @param {BufferUsage} indexUsage A usage hint for the index buffer.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Mesh(vertexUsage, indexUsage)
{
    this.onLayoutChanged = new Signal();
    this._model = null;
    this._vertexBuffers = [];
    this._vertexStrides = [];
    this._vertexData = [];
    this._indexData = undefined;
    this._vertexUsage = vertexUsage || BufferUsage.STATIC_DRAW;
    this._indexUsage = indexUsage || BufferUsage.STATIC_DRAW;
    this._numStreams = 0;
    this._numVertices = 0;

    this._vertexAttributes = [];
    this._vertexAttributesLookUp = {};
    this._indexBuffer = new IndexBuffer();
    this._defaultMorphTarget = null;

    this._renderOrderHint = ++Mesh_ID_COUNTER;
}

/**
 * The vertex stride for meshes created with {@linkcode Mesh#createDefaultEmpty}
 */
Mesh.DEFAULT_VERTEX_SIZE = 12;

/**
 * @ignore
 */
Mesh.ID_COUNTER = 0;

// other possible indices:
// hx_instanceID (used by MeshBatch)
// hx_jointIndices (4)
// hx_jointWeights (4)
/**
 * Creates an empty Mesh with a default layout.
 */
Mesh.createDefaultEmpty = function()
{
    var data = new Mesh();
    data.addVertexAttribute("hx_position", 3);
    data.addVertexAttribute("hx_normal", 3);
    data.addVertexAttribute("hx_tangent", 4);
    data.addVertexAttribute("hx_texCoord", 2);
    return data;
};


Mesh.prototype = {
    /**
     * Whether or not this Mesh supports morph target animations. This is the case if {@linkcode Mesh#generateMorphData}
     * was called.
     */
    get hasMorphData()
    {
        return !!this._defaultMorphTarget;
    },

    /**
     * A usage hint for the vertex buffer.
     *
     * @see {@linkcode BufferUsage}
     */
    get vertexUsage()
    {
        return this._vertexUsage;
    },

    set vertexUsage(value)
    {
        this._vertexUsage = value;
    },

    /**
     * A usage hint for the index buffer.
     *
     * @see {@linkcode BufferUsage}
     */
    get indexUsage()
    {
        return this._indexUsage;
    },

    set indexUsage(value)
    {
        this._indexUsage = value;
    },

    /**
     * Returns whether or not vertex data was uploaded to the given stream index.
     */
    hasVertexData: function (streamIndex)
    {
        return !!this._vertexData[streamIndex];
    },

    /**
     * Gets the vertex data for a given stream.
     */
    getVertexData: function (streamIndex)
    {
        return this._vertexData[streamIndex];
    },

    /**
     * Uploads vertex data from an Array or a Float32Array. This method must be called after the layout for the stream
     * has been finalized using setVertexAttribute calls. The data in the stream should be an interleaved array of
     * floats, with each attribute data in the order specified with the setVertexAttribute calls.
     */
    setVertexData: function (data, streamIndex)
    {
        streamIndex = streamIndex || 0;

        this._vertexData[streamIndex] = data instanceof Float32Array? data : new Float32Array(data);
        this._vertexBuffers[streamIndex] = this._vertexBuffers[streamIndex] || new VertexBuffer();
        this._vertexBuffers[streamIndex].uploadData(this._vertexData[streamIndex], this._vertexUsage);

        if (streamIndex === 0)
            this._numVertices = data.length / this._vertexStrides[0];
    },

    /**
     * Returns the index data uploaded to the index buffer.
     */
    getIndexData: function()
    {
        return this._indexData;
    },

    /**
     * Uploads index data from an Array or a Uint16Array
     */
    setIndexData: function (data)
    {
        if (data instanceof Uint16Array) {
            this._indexData = data;
            this._indexType = DataType.UNSIGNED_SHORT;
        }
        else if (data instanceof Uint32Array) {
            this._indexData = data;
            this._indexType = DataType.UNSIGNED_INT;
        }
        else {
            this._indexData = new Uint16Array(data);
            this._indexType = DataType.UNSIGNED_SHORT;
        }
        this._numIndices = this._indexData.length;
        this._indexBuffer.uploadData(this._indexData, this._indexUsage);
    },

    /**
     * Adds a named vertex attribute. All properties are given manually to make it easier to support multiple streams in the future.
     * @param name The name of the attribute, matching the attribute name used in the vertex shaders.
     * @param numComponents The amount of components used by the attribute value.
     * @param streamIndex [Optional] The stream index indicating which vertex buffer is used, defaults to 0
     */
    addVertexAttribute: function (name, numComponents, streamIndex)
    {
        streamIndex = streamIndex || 0;
        this._numStreams = Math.max(this._numStreams, streamIndex + 1);
        var offset = this._vertexStrides[streamIndex] || 0;
        var attrib = {
            name: name,
            offset: offset,
            numComponents: numComponents,
            streamIndex: streamIndex
        };
        this._vertexAttributes.push(attrib);
        this._vertexAttributesLookUp[name] = attrib;

        this._vertexStrides[streamIndex] = offset + numComponents;

        this.onLayoutChanged.dispatch();
    },

    /**
     * The amount of streams (vertex buffers) used for this Mesh/
     */
    get numStreams()
    {
        return this._numStreams;
    },

    /**
     * Extracts the vertex attribute data for the given attribute name as a flat Array.
     */
    extractAttributeData: function(name)
    {
        var attrib = this.getVertexAttributeByName(name);
        var stride = this.getVertexStride(attrib);
        var data = this.getVertexData(attrib.streamIndex);
        var numComps = attrib.numComponents;
        var vertData = [];
        var t = 0;
        for (var i = attrib.offset; i < data.length; i += stride) {
            for (var j = 0; j < numComps; ++j) {
                vertData[t++] = data[i + j];
            }
        }
        return vertData;
    },

    /**
     * Generates the required data to support morph target animations.
     */
    generateMorphData: function()
    {
        for (i = 0; i < capabilities.NUM_MORPH_TARGETS; ++i) {
            // these will never have data assigned to them!
            // append these each as a different stream
            this.addVertexAttribute("hx_morphPosition" + i, 3, this._numStreams);
        }

        var data = [];

        for (var i = 0; i < this._numVertices; ++i) {
            data.push(0, 0, 0);
        }

        this._defaultMorphTarget = new VertexBuffer();
        this._defaultMorphTarget.uploadData(new Float32Array(data), BufferUsage.STATIC_DRAW);
    },

    /**
     * The amount of vertices contained in the Mesh.
     */
    get numVertices()
    {
        return this._numVertices;
    },

    /**
     * The amount of face indices contained in the Mesh.
     */
    get numIndices()
    {
        return this._numIndices;
    },

    /**
     * The amount of vertex attributes contained in the Mesh.
     */
    get numVertexAttributes()
    {
        return this._vertexAttributes.length;
    },

    /**
     * Gets the vertex stride (number of components used per stream per vertex) for a given stream
     */
    getVertexStride: function(streamIndex)
    {
        return this._vertexStrides[streamIndex];
    },

    /**
     * Gets the vertex attribute data according to the attribute name.
     */
    getVertexAttributeByName: function (name)
    {
        return this._vertexAttributesLookUp[name];
    },

    /**
     * Gets the vertex attribute data according to the index.
     */
    getVertexAttributeByIndex: function (index)
    {
        return this._vertexAttributes[index];
    },

    /**
     * Returns a duplicate of this Mesh.
     */
    clone: function()
    {
        var mesh = new Mesh(this._vertexUsage, this._indexUsage);
        var numAttribs = this._vertexAttributes.length;

        for (var i = 0; i < numAttribs; ++i) {
            var attrib = this._vertexAttributes[i];
            mesh.addVertexAttribute(attrib.name, attrib.numComponents, attrib.streamIndex);
        }

        for (i = 0; i < this._numStreams; ++i) {
            if (this._vertexData[i])
                mesh.setVertexData(this._vertexData[i], i);
        }

        if (this._indexData)
            mesh.setIndexData(this._indexData);

        return mesh;
    }
};

/**
 * RectMesh is a util that allows creating Mesh objects for rendering 2D quads. Generally, use RectMesh.DEFAULT for
 * full-screen quads.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var RectMesh = {
    create: function()
    {
        var mesh = new Mesh();
        mesh.addVertexAttribute("hx_position", 2);
        mesh.addVertexAttribute("hx_texCoord", 2);
        mesh.setVertexData([-1, 1, 0, 1,
            1, 1, 1, 1,
            1, -1, 1, 0,
            -1, -1, 0, 0], 0);
        mesh.setIndexData([0, 1, 2, 0, 2, 3]);
        return mesh;
    },

    _initDefault: function()
    {
        RectMesh.DEFAULT = RectMesh.create();
    }
};

/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
var TextureUtils =
{
    /**
     * Resizes a texture (empty) if its size doesn't match. Returns true if the size has changed.
     * @param width The target width
     * @param height The target height
     * @param texture The texture to be resized if necessary
     * @param fbo (optional) Any fbos to be reinitialized if necessary
     * @returns {boolean} Returns true if the texture has been resized, false otherwise.
     */
    assureSize: function(width, height, texture, fbo, format, dataType)
    {
        if (width === texture.width && height === texture.height)
            return false;

        texture.initEmpty(width, height, format, dataType);
        if (fbo) fbo.init();
        return true;
    },

    /**
     * Copies a texture into a Framebuffer.
     * @param sourceTexture The source texture to be copied.
     * @param destFBO The target FBO to copy into.
     */
    copy: function(sourceTexture, destFBO)
    {
        GL.setRenderTarget(destFBO);
        GL.clear();
        DEFAULTS.COPY_SHADER.execute(RectMesh.DEFAULT, sourceTexture);
        GL.setRenderTarget(null);
    },

    // ref: http://stackoverflow.com/questions/32633585/how-do-you-convert-to-half-floats-in-javascript
    encodeHalfFloat: function(val) {

        var floatView = new Float32Array(1);
        var int32View = new Int32Array(floatView.buffer);

        /* This method is faster than the OpenEXR implementation (very often
         * used, eg. in Ogre), with the additional benefit of rounding, inspired
         * by James Tursa?s half-precision code. */
        return function toHalf(val) {

            floatView[0] = val;
            var x = int32View[0];

            var bits = (x >> 16) & 0x8000; /* Get the sign */
            var m = (x >> 12) & 0x07ff; /* Keep one extra bit for rounding */
            var e = (x >> 23) & 0xff; /* Using int is faster here */

            /* If zero, or denormal, or exponent underflows too much for a denormal
             * half, return signed zero. */
            if (e < 103) {
                return bits;
            }

            /* If NaN, return NaN. If Inf or exponent overflow, return Inf. */
            if (e > 142) {
                bits |= 0x7c00;
                /* If exponent was 0xff and one mantissa bit was set, it means NaN,
                 * not Inf, so make sure we set one mantissa bit too. */
                bits |= ((e === 255) ? 0 : 1) && (x & 0x007fffff);
                return bits;
            }

            /* If exponent underflows but not too much, return a denormal */
            if (e < 113) {
                m |= 0x0800;
                /* Extra rounding may overflow and set mantissa to 0 and exponent
                 * to 1, which is OK. */
                bits |= (m >> (114 - e)) + ((m >> (113 - e)) & 1);
                return bits;
            }

            bits |= ((e - 112) << 10) | (m >> 1);
            /* Extra rounding. An overflow will set mantissa to 0 and increment
             * the exponent, which is OK. */
            bits += m & 1;
            return bits;
        };
    }(),

    encodeToFloat16Array: function(float32Array)
    {
        var encFun = TextureUtils.encodeHalfFloat;
        var arr = [];
        for (var i = 0; i < float32Array.length; ++i) {
            arr[i] = encFun(float32Array[i]);
        }
        return new Uint16Array(arr);
    }
};

/**
 * @classdesc
 * Texture2D represents a 2D texture.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Texture2D()
{
    this._name = null;
    this._default = Texture2D.DEFAULT;
    this._texture = GL.gl.createTexture();
    this._width = 0;
    this._height = 0;
    this._format = null;
    this._dataType = null;

    this.bind();

    // set defaults
    this.maxAnisotropy = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;
    this.filter = TextureFilter.DEFAULT;
    this.wrapMode = TextureWrapMode.DEFAULT;

    this._isReady = false;

    GL.gl.bindTexture(GL.gl.TEXTURE_2D, null);
}

/**
 * @ignore
 */
Texture2D._initDefault = function()
{
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    Texture2D.DEFAULT = new Texture2D();
    Texture2D.DEFAULT.uploadData(data, 1, 1, true);
    Texture2D.DEFAULT.filter = TextureFilter.NEAREST_NOMIP;
};

Texture2D.prototype =
{
    /**
     * The name of the texture.
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    /**
     * Generates a mip map chain.
     */
    generateMipmap: function()
    {
        var gl = GL.gl;

        this.bind();

        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * A {@linkcode TextureFilter} object defining how the texture should be filtered during sampling.
     */
    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        var gl = GL.gl;
        this._filter = filter;
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter.min);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter.mag);
        gl.bindTexture(gl.TEXTURE_2D, null);

        if (filter === TextureFilter.NEAREST_NOMIP || filter === TextureFilter.NEAREST) {
            this.maxAnisotropy = 1;
        }
    },

    /**
     * A {@linkcode TextureWrapMode} object defining how out-of-bounds sampling should be handled.
     */
    get wrapMode()
    {
        return this._wrapMode;
    },

    set wrapMode(mode)
    {
        var gl = GL.gl;
        this._wrapMode = mode;
        this.bind();
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mode.s);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, mode.t);
        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * The maximum anisotropy used when sampling. Limited to {@linkcode capabilities#DEFAULT_TEXTURE_MAX_ANISOTROPY}
     */
    get maxAnisotropy()
    {
        return this._maxAnisotropy;
    },

    set maxAnisotropy(value)
    {
        var gl = GL.gl;

        if (value > capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY)
            value = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;

        this._maxAnisotropy = value;

        this.bind();
        if (capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC)
            GL.gl.texParameteri(gl.TEXTURE_2D, capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * The texture's width
     */
    get width() { return this._width; },

    /**
     * The texture's height
     */
    get height() { return this._height; },

    /**
     * The texture's format
     *
     * @see {@linkcode TextureFormat}
     */
    get format() { return this._format; },

    /**
     * The texture's data type
     *
     * @see {@linkcode DataType}
     */
    get dataType() { return this._dataType; },

    /**
     * Inits an empty texture.
     * @param width The width of the texture.
     * @param height The height of the texture.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    initEmpty: function(width, height, format, dataType)
    {
        var gl = GL.gl;
        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;

        this.bind();
        this._width = width;
        this._height = height;

        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, dataType, null);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * Initializes the texture with the given data.
     * @param {*} data An typed array containing the initial data.
     * @param {number} width The width of the texture.
     * @param {number} height The height of the texture.
     * @param {boolean} generateMips Whether or not a mip chain should be generated.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    uploadData: function(data, width, height, generateMips, format, dataType)
    {
        var gl = GL.gl;

        if (capabilities.EXT_HALF_FLOAT_TEXTURES && dataType === capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES)
            data = TextureUtils.encodeToFloat16Array(data);

        this._width = width;
        this._height = height;

        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? false: generateMips;

        this.bind();

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, dataType, data);

        if (generateMips)
            gl.generateMipmap(gl.TEXTURE_2D);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * Initializes the texture with a given Image.
     * @param image The Image to upload to the texture
     * @param width The width of the texture.
     * @param height The height of the texture.
     * @param generateMips Whether or not a mip chain should be generated.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     *
     * TODO: Just use image.naturalWidth / image.naturalHeight ?
     */
    uploadImage: function(image, width, height, generateMips, format, dataType)
    {
        var gl = GL.gl;

        this._width = width;
        this._height = height;

        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        if (image)
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

        gl.texImage2D(gl.TEXTURE_2D, 0, format, format, dataType, image);

        if (generateMips)
            gl.generateMipmap(gl.TEXTURE_2D);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * Defines whether data has been uploaded to the texture or not.
     */
    isReady: function() { return this._isReady; },

    /**
     * Binds a texture to a given texture unit.
     * @ignore
     */
    bind: function(unitIndex)
    {
        var gl = GL.gl;

        if (unitIndex !== undefined) {
            gl.activeTexture(gl.TEXTURE0 + unitIndex);
        }

        gl.bindTexture(gl.TEXTURE_2D, this._texture);
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[Texture2D(name=" + this._name + ")]";
    }
};

//       +-----+
//       |  +Y |
// +-----+-----+-----+-----+
// |  -X |  +Z |  +X |  -Z |
// +-----+-----+-----+-----+
//       |  -Y |
//       +-----+

/**
 * @classdesc
 * TextureCube represents a cube map texture. The order of the textures in a cross map is as such:
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function TextureCube()
{
    this._name = null;
    this._default = TextureCube.DEFAULT;
    this._texture = GL.gl.createTexture();
    this._size = 0;
    this._format = null;
    this._dataType = null;

    this.bind();
    this.filter = TextureFilter.DEFAULT;
    this.maxAnisotropy = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;

    this._isReady = false;
}

/**
 * @ignore
 */
TextureCube._initDefault = function()
{
    var gl = GL.gl;
    var data = new Uint8Array([0xff, 0x00, 0xff, 0xff]);
    TextureCube.DEFAULT = new TextureCube();
    TextureCube.DEFAULT.uploadData([data, data, data, data, data, data], 1, true);
    TextureCube.DEFAULT.filter = TextureFilter.NEAREST_NOMIP;
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
};

TextureCube.prototype =
{
    /**
     * The name of the texture.
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    /**
     * Generates a mip map chain.
     */
    generateMipmap: function()
    {
        this.bind();
        var gl = GL.gl;
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * A {@linkcode TextureFilter} object defining how the texture should be filtered during sampling.
     */
    get filter()
    {
        return this._filter;
    },

    set filter(filter)
    {
        this._filter = filter;
        this.bind();
        var gl = GL.gl;
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, filter.min);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, filter.mag);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * The maximum anisotropy used when sampling. Limited to {@linkcode capabilities#DEFAULT_TEXTURE_MAX_ANISOTROPY}
     */
    get maxAnisotropy()
    {
        return this._maxAnisotropy;
    },

    set maxAnisotropy(value)
    {
        if (value > capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY)
            value = capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY;

        this._maxAnisotropy = value;

        this.bind();

        var gl = GL.gl;
        if (capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC)
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.TEXTURE_MAX_ANISOTROPY_EXT, value);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * The cube texture's size
     */
    get size() { return this._size; },

    /**
     * The texture's format
     *
     * @see {@linkcode TextureFormat}
     */
    get format() { return this._format; },

    /**
     * The texture's data type
     *
     * @see {@linkcode DataType}
     */
    get dataType() { return this._dataType; },

    /**
     * Inits an empty texture.
     * @param size The size of the texture.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    initEmpty: function(size, format, dataType)
    {
        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;

        this._size = size;

        this.bind();

        var gl = GL.gl;
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, null);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, null);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * Initializes the texture with the given data.
     * @param data A array of typed arrays (per {@linkcode CubeFace}) containing the initial data.
     * @param size The size of the texture.
     * @param generateMips Whether or not a mip chain should be generated.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    uploadData: function(data, size, generateMips, format, dataType)
    {
        this._size = size;

        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;
        generateMips = generateMips === undefined? true: generateMips;

        this.bind();

        var gl = GL.gl;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, format, size, size, 0, format, dataType, data[0]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, format, size, size, 0, format, dataType, data[1]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, format, size, size, 0, format, dataType, data[2]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, format, size, size, 0, format, dataType, data[3]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, format, size, size, 0, format, dataType, data[4]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, format, size, size, 0, format, dataType, data[5]);

        if (generateMips)
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * Initializes the texture with the given Images.
     * @param data A array of typed arrays (per {@linkcode CubeFace}) containing the initial data.
     * @param generateMips Whether or not a mip chain should be generated.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    uploadImages: function(images, generateMips, format, dataType)
    {
        generateMips = generateMips === undefined? true: generateMips;

        this._format = format;
        this._dataType = dataType;

        this.uploadImagesToMipLevel(images, 0, format, dataType);

        var gl = GL.gl;
        if (generateMips) {
            this.bind();
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        }

        this._isReady = true;

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * Initializes a miplevel with the given Images.
     * @param data A array of typed arrays (per {@linkcode CubeFace}) containing the initial data.
     * @param mipLevel The mip-level to initialize.
     * @param {TextureFormat} format The texture's format.
     * @param {DataType} dataType The texture's data format.
     */
    uploadImagesToMipLevel: function(images, mipLevel, format, dataType)
    {
        var gl = GL.gl;
        this._format = format = format || TextureFormat.RGBA;
        this._dataType = dataType = dataType || DataType.UNSIGNED_BYTE;

        if (mipLevel === 0)
            this._size = images[0].naturalWidth;

        this.bind();

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, mipLevel, format, format, dataType, images[0]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, mipLevel, format, format, dataType, images[1]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, mipLevel, format, format, dataType, images[2]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, mipLevel, format, format, dataType, images[3]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, mipLevel, format, format, dataType, images[4]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, mipLevel, format, format, dataType, images[5]);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    },

    /**
     * Defines whether data has been uploaded to the texture or not.
     */
    isReady: function() { return this._isReady; },

    /**
     * Binds a texture to a given texture unit.
     * @ignore
     */
    bind: function(unitIndex)
    {
        var gl = GL.gl;

        if (unitIndex !== undefined)
            gl.activeTexture(gl.TEXTURE0 + unitIndex);

        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._texture);
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[TextureCube(name=" + this._name + ")]";
    }
};

/**
 * @classdesc
 * BlendState defines the blend mode the renderer should use. Default presets include BlendState.ALPHA, BlendState.ADD
 * and BlendState.MULTIPLY.
 *
 * @param srcFactor The source blend factor.
 * @param dstFactor The destination blend factor.
 * @param operator The blend operator.
 * @param color The blend color.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BlendState(srcFactor, dstFactor, operator, color)
{
    /**
     * Defines whether blending is enabled.
     */
    this.enabled = true;

    /**
     * The source blend factor.
     * @see {@linkcode BlendFactor}
     */
    this.srcFactor = srcFactor || BlendFactor.ONE;

    /**
     * The destination blend factor.
     * @see {@linkcode BlendFactor}
     */
    this.dstFactor = dstFactor || BlendFactor.ZERO;

    /**
     * The blend operator.
     * @see {@linkcode BlendOperation}
     */
    this.operator = operator || BlendOperation.ADD;

    /**
     * The source blend factor for the alpha.
     * @see {@linkcode BlendFactor}
     */
    this.alphaSrcFactor = null;

    /**
     * The source blend factor for the alpha.
     * @see {@linkcode BlendFactor}
     */
    this.alphaDstFactor = null;

    /**
     * The blend operator for the alpha.
     * @see {@linkcode BlendOperation}
     */
    this.alphaOperator = null;

    /**
     * The blend color.
     * @see {@linkcode Color}
     */
    this.color = color || null;
}

BlendState.prototype = {
    /**
     * Creates a copy of this BlendState.
     */
    clone: function() {
        return new BlendState(this.srcFactor, this.dstFactor, this.operator, this.color);
    }
};

BlendState._initDefaults = function()
{
    BlendState.ADD = new BlendState(BlendFactor.SOURCE_ALPHA, BlendFactor.ONE);
    BlendState.ADD_NO_ALPHA = new BlendState(BlendFactor.ONE, BlendFactor.ONE);
    BlendState.MULTIPLY = new BlendState(BlendFactor.DESTINATION_COLOR, BlendFactor.ZERO);
    BlendState.ALPHA = new BlendState(BlendFactor.SOURCE_ALPHA, BlendFactor.ONE_MINUS_SOURCE_ALPHA);
    BlendState.ALPHA.alphaSrcFactor = BlendFactor.ONE;
    BlendState.ALPHA.alphaDstFactor = BlendFactor.ONE_MINUS_SOURCE_ALPHA;
    BlendState.INV_ALPHA = new BlendState(BlendFactor.ONE_MINUS_SOURCE_ALPHA, BlendFactor.SOURCE_ALPHA);
};

/**
 * @classdesc
 * FrameBuffer provides a render target associated with a given texture/textures.
 *
 * @param colorTextures Either a single texture, or an Array of textures (only if {@linkcode capabilities#EXT_DRAW_BUFFERS} is supported).
 * @param depthBuffer An optional depth buffer. This can be a {@linkcode WriteOnlyDepthBuffer} or, if readback is required, a {@linkcode Texture2D} (only available if {@linkcode capabilities#EXT_DEPTH_TEXTURE} is supported).
 * @param cubeFace If colorTextures is a {@linkcode TextureCube}, cubeFace should contain the relevant {@linkcode CubeFace}.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FrameBuffer(colorTextures, depthBuffer, cubeFace)
{
    if (colorTextures && colorTextures[0] === undefined) colorTextures = [ colorTextures ];

    this._cubeFace = cubeFace;
    this._colorTextures = colorTextures;
    this._numColorTextures = this._colorTextures? this._colorTextures.length : 0;
    this._depthBuffer = depthBuffer;

    if (this._colorTextures && this._numColorTextures > 1) {

        this._drawBuffers = new Array(this._numColorTextures);
        for (var i = 0; i < this._numColorTextures; ++i) {
            this._drawBuffers[i] = capabilities.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i;
        }
    }
    else {
        this._drawBuffers = null;
    }

    this._fbo = GL.gl.createFramebuffer();
}

FrameBuffer.prototype = {
    get width() { return this._width; },
    get height() { return this._height; },

    /**
     * Initializes the framebuffer object. This needs to be called whenever the Texture2D's are resized using initEmpty.
     * @param silent Whether or not warnings should be printed.
     */
    init: function(silent)
    {
        var gl = GL.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);

        if (this._colorTextures) {
            if (this._cubeFace === undefined) {
                this._width = this._colorTextures[0]._width;
                this._height = this._colorTextures[0]._height;
            }
            else {
                this._height = this._width = this._colorTextures[0].size;
            }
        }
        else  {
            this._width = this._depthBuffer._width;
            this._height = this._depthBuffer._height;
        }

        var target = this._cubeFace === undefined? gl.TEXTURE_2D : this._cubeFace;

        if (this._numColorTextures === 1) {
            var texture = this._colorTextures[0];
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, texture._texture, 0);
        }
        else if (capabilities.EXT_DRAW_BUFFERS) {
            for (var i = 0; i < this._numColorTextures; ++i) {
                texture = this._colorTextures[i];
                gl.framebufferTexture2D(gl.FRAMEBUFFER, capabilities.EXT_DRAW_BUFFERS.COLOR_ATTACHMENT0_WEBGL + i, target, texture._texture, 0);
            }
        }
        else
            throw new Error("Trying to bind multiple render targets without EXT_DRAW_BUFFERS support!");


        if (this._depthBuffer) {
            var attachment = this._depthBuffer.format === gl.DEPTH_STENCIL? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;

            if (this._depthBuffer instanceof Texture2D)
                gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, this._depthBuffer._texture, 0);
            else
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, this._depthBuffer._renderBuffer);
        }

        var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

        switch (status && !silent) {
            case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
                break;
            case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
                break;
            case gl.FRAMEBUFFER_UNSUPPORTED:
                console.warn("Failed to initialize FBO: FRAMEBUFFER_UNSUPPORTED");
                break;
            default:
                // nothing
        }

        return status === gl.FRAMEBUFFER_COMPLETE;
    }
};

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

/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
var TextureSetter = {
    getSettersPerPass: function (materialPass)
    {
        if (TextureSetter._passTable === undefined)
            TextureSetter._init();

        return TextureSetter._findSetters(materialPass, TextureSetter._passTable);
    },

    getSettersPerInstance: function (materialPass)
    {
        if (TextureSetter._instanceTable === undefined)
            TextureSetter._init();

        return TextureSetter._findSetters(materialPass, TextureSetter._instanceTable);
    },

    _findSetters: function (materialPass, table)
    {
        var setters = [];
        for (var slotName in table) {
            if (!table.hasOwnProperty(slotName)) continue;
            var slot = materialPass.getTextureSlot(slotName);
            if (!slot) continue;
            var setter = new table[slotName]();
            setters.push(setter);
            setter.slot = slot;
        }

        return setters;
    },

    _init: function()
    {
        TextureSetter._passTable = {};
        TextureSetter._instanceTable = {};

        TextureSetter._passTable.hx_gbufferAlbedo = GBufferAlbedoSetter;
        TextureSetter._passTable.hx_gbufferNormalDepth = GBufferNormalDepthSetter;
        TextureSetter._passTable.hx_gbufferSpecular = GBufferSpecularSetter;
        TextureSetter._passTable.hx_backbuffer = BackbufferSetter;
        TextureSetter._passTable.hx_frontbuffer = FrontbufferSetter;
        TextureSetter._passTable.hx_lightAccumulation = LightAccumulationSetter;
        TextureSetter._passTable.hx_ssao = SSAOSetter;

        TextureSetter._instanceTable.hx_skinningTexture = SkinningTextureSetter;
    }
};


// Texture setters can be either per pass or per instance. The execute method gets passed eithter the renderer or the
// render item, respectively.

function GBufferAlbedoSetter()
{
}

GBufferAlbedoSetter.prototype.execute = function (renderer)
{
    if (renderer._gbuffer)
        this.slot.texture = renderer._gbuffer.textures[GBuffer.ALBEDO];
};


function GBufferNormalDepthSetter()
{
}

GBufferNormalDepthSetter.prototype.execute = function (renderer)
{
    if (renderer._gbuffer)
        this.slot.texture = renderer._gbuffer.textures[GBuffer.NORMAL_DEPTH];
};


function GBufferSpecularSetter()
{
}

GBufferSpecularSetter.prototype.execute = function (renderer)
{
    if (renderer._gbuffer)
        this.slot.texture = renderer._gbuffer.textures[GBuffer.SPECULAR];
};


function FrontbufferSetter()
{
}

FrontbufferSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrFront)
        this.slot.texture = renderer._hdrFront.texture;
};

function BackbufferSetter()
{
}

BackbufferSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrBack)
        this.slot.texture = renderer._hdrBack.texture;
};

function LightAccumulationSetter()
{
}

LightAccumulationSetter.prototype.execute = function (renderer)
{
    if (renderer._hdrBack)
        this.slot.texture = renderer._hdrBack.texture;
};


function SSAOSetter()
{
}

SSAOSetter.prototype.execute = function (renderer)
{
    this.slot.texture = renderer._ssaoTexture;
};

function SkinningTextureSetter()
{
}

SkinningTextureSetter.prototype.execute = function (renderItem)
{
    this.slot.texture = renderItem.skeletonMatrices;
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function TextureSlot() {
    this.location = -1;
    this.texture = null;
    this.name = null;   // for debugging
    this.index = -1;
}

/**
 * @ignore
 * @param shader
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MaterialPass(shader)
{
    this._shader = shader;
    this._textureSlots = [];
    this._uniforms = {};
    this._elementType = ElementType.TRIANGLES;
    this._cullMode = CullMode.BACK;
    this._writeColor = true;
    this._depthTest = Comparison.LESS_EQUAL;
    this._writeDepth = true;
    this._blendState = null;

    this._storeUniforms();
    this._textureSettersPass = TextureSetter.getSettersPerPass(this);
    this._textureSettersInstance = TextureSetter.getSettersPerInstance(this);

    // if material supports animations, this would need to be handled properly
    this._useSkinning = false;
    this.setTexture("hx_dither2D", DEFAULTS.DEFAULT_2D_DITHER_TEXTURE);
}

// these will be set upon initialization
// if a shader supports multiple lights per pass, they will take up 3 type slots (fe: 3 point lights: POINT_LIGHT_PASS, POINT_LIGHT_PASS + 1, POINT_LIGHT_PASS + 2)
MaterialPass.BASE_PASS = 0;  // used for unlit or for predefined lights

// dynamic lighting passes
MaterialPass.DIR_LIGHT_PASS = 1;
MaterialPass.DIR_LIGHT_SHADOW_PASS = 2;
MaterialPass.POINT_LIGHT_PASS = 3;
MaterialPass.POINT_LIGHT_SHADOW_PASS = 4;
MaterialPass.SPOT_LIGHT_PASS = 5;
MaterialPass.SPOT_LIGHT_SHADOW_PASS = 6;
MaterialPass.LIGHT_PROBE_PASS = 7;

// shadow map generation
MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS = 8;
MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS = 9;
MaterialPass.SPOT_LIGHT_SHADOW_MAP_PASS = 10;

// used if MRT is supported:
MaterialPass.GBUFFER_PASS = 11;

// used if MRT is not supported
MaterialPass.GBUFFER_ALBEDO_PASS = 11;
MaterialPass.GBUFFER_NORMAL_DEPTH_PASS = 12;
MaterialPass.GBUFFER_SPECULAR_PASS = 13;

MaterialPass.NUM_PASS_TYPES = 14;

MaterialPass.prototype =
{
    constructor: MaterialPass,

    getShader: function ()
    {
        return this._shader;
    },

    get elementType()
    {
        return this._elementType;
    },

    set elementType(value)
    {
        this._elementType = value;
    },

    get depthTest()
    {
        return this._depthTest;
    },

    set depthTest(value)
    {
        this._depthTest = value;
    },

    get writeColor()
    {
        return this._writeColor;
    },

    set writeColor(value)
    {
        this._writeColor = value;
    },
    get writeDepth()
    {
        return this._writeDepth;
    },

    set writeDepth(value)
    {
        this._writeDepth = value;
    },

    get cullMode()
    {
        return this._cullMode;
    },

    // use null for disabled
    set cullMode(value)
    {
        this._cullMode = value;
    },

    get blendState()
    {
        return this._blendState;
    },

    set blendState(value)
    {
        this._blendState = value;
    },

    /**
     * Called per render item.
     * TODO: Could separate UniformSetters per pass / instance as well
     */
    updateInstanceRenderState: function(camera, renderItem)
    {
        var len = this._textureSettersInstance.length;

        for (var i = 0; i < len; ++i) {
            this._textureSettersInstance[i].execute(renderItem);
        }

        this._shader.updateInstanceRenderState(camera, renderItem);
    },

    /**
     * Only called upon activation, not per render item.
     */
    updatePassRenderState: function (camera, renderer, data)
    {
        var len = this._textureSettersPass.length;
        var i;
        for (i = 0; i < len; ++i) {
            this._textureSettersPass[i].execute(renderer);
        }

        len = this._textureSlots.length;

        for (i = 0; i < len; ++i) {
            var slot = this._textureSlots[i];
            var texture = slot.texture;

            if (!texture) {
                Texture2D.DEFAULT.bind(i);
                continue;
            }

            if (texture.isReady())
                texture.bind(i);
            else
                texture._default.bind(i);
        }

        GL.setMaterialPassState(this._cullMode, this._depthTest, this._writeDepth, this._writeColor, this._blendState);

        this._shader.updatePassRenderState(camera, renderer);
    },

    _storeUniforms: function()
    {
        var gl = GL.gl;

        var len = gl.getProgramParameter(this._shader._program, gl.ACTIVE_UNIFORMS);

        for (var i = 0; i < len; ++i) {
            var uniform = gl.getActiveUniform(this._shader._program, i);
            var name = uniform.name;
            var location = gl.getUniformLocation(this._shader._program, name);
            this._uniforms[name] = {type: uniform.type, location: location, size: uniform.size};
        }
    },

    getTextureSlot: function(slotName)
    {
        if (!this._uniforms.hasOwnProperty(slotName)) return null;

        var gl = GL.gl;
        gl.useProgram(this._shader._program);

        var uniform = this._uniforms[slotName];

        if (!uniform) return;

        var location = uniform.location;

        var slot = null;

        // reuse if location is already used
        var len = this._textureSlots.length;
        for (var i = 0; i < len; ++i) {
            if (this._textureSlots[i].location === location) {
                slot = this._textureSlots[i];
                break;
            }
        }

        if (!slot) {
            var indices = new Int32Array(uniform.size);
            for (var s = 0; s < uniform.size; ++s) {
                slot = new TextureSlot();
                slot.index = i;
                slot.name = slotName;
                this._textureSlots.push(slot);
                slot.location = location;
                indices[s] = i + s;
            }

            if (uniform.size === 1) {
                gl.uniform1i(location, i);
            }
            else {
                gl.uniform1iv(location, indices);
            }
        }

        return slot;
    },

    setTexture: function(slotName, texture)
    {
        var slot = this.getTextureSlot(slotName);
        if (slot)
            slot.texture = texture;
    },

    setTextureArray: function(slotName, textures)
    {
        var firstSlot = this.getTextureSlot(slotName + "[0]");
        var location = firstSlot.location;
        if (firstSlot) {
            var len = textures.length;
            for (var i = 0; i < len; ++i) {
                var slot = this._textureSlots[firstSlot.index + i];
                // make sure we're not overshooting the array and writing to another element (larger arrays are allowed analogous to uniform arrays)
                if (!slot || slot.location !== location) return;
                slot.texture = textures[i];
            }
        }
    },

    getUniformLocation: function(name)
    {
        if (this._uniforms.hasOwnProperty(name))
            return this._uniforms[name].location;
    },

    getAttributeLocation: function(name)
    {
        return this._shader.getAttributeLocation(name);
    },

    // slow :(
    setUniformStructArray: function(name, value)
    {
        var len = value.length;
        for (var i = 0; i < len; ++i) {
            var elm = value[i];
            for (var key in elm) {
                if (elm.hasOwnProperty("key"))
                    this.setUniform(name + "[" + i + "]." + key, value);
            }
        }
    },

    setUniformArray: function(name, value)
    {
        name += "[0]";

        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];
        var gl = GL.gl;
        gl.useProgram(this._shader._program);

        switch(uniform.type) {
            case gl.FLOAT:
                gl.uniform1fv(uniform.location, value);
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2fv(uniform.location, value);
                break;
            case gl.FLOAT_VEC3:
                gl.uniform3fv(uniform.location, value);
                break;
            case gl.FLOAT_VEC4:
                gl.uniform4fv(uniform.location, value);
                break;
            case gl.FLOAT_MAT4:
                gl.uniformMatrix4fv(uniform.location, false, value);
                break;
            case gl.INT:
                gl.uniform1iv(uniform.location, value);
                break;
            case gl.INT_VEC2:
                gl.uniform2iv(uniform.location, value);
                break;
            case gl.INT_VEC3:
                gl.uniform3iv(uniform.location, value);
                break;
            case gl.INT_VEC4:
                gl.uniform1iv(uniform.location, value);
                break;
            case gl.BOOL:
                gl.uniform1bv(uniform.location, value);
                break;
            case gl.BOOL_VEC2:
                gl.uniform2bv(uniform.location, value);
                break;
            case gl.BOOL_VEC3:
                gl.uniform3bv(uniform.location, value);
                break;
            case gl.BOOL_VEC4:
                gl.uniform4bv(uniform.location, value);
                break;
            default:
                throw new Error("Unsupported uniform format for setting (" + uniform.type + ") for uniform '" + name + "'. May be a todo.");

        }
    },

    setUniform: function(name, value)
    {
        if (!this._uniforms.hasOwnProperty(name))
            return;

        var uniform = this._uniforms[name];

        var gl = GL.gl;
        gl.useProgram(this._shader._program);

        switch(uniform.type) {
            case gl.FLOAT:
                gl.uniform1f(uniform.location, value);
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2f(uniform.location, value.x || value[0] || 0, value.y || value[1] || 0);
                break;
            case gl.FLOAT_VEC3:
                gl.uniform3f(uniform.location, value.x || value.r || value[0] || 0, value.y || value.g || value[1] || 0, value.z || value.b || value[2] || 0 );
                break;
            case gl.FLOAT_VEC4:
                gl.uniform4f(uniform.location, value.x || value.r || value[0] || 0, value.y || value.g || value[1] || 0, value.z || value.b || value[2] || 0, value.w || value.a || value[3] || 0);
                break;
            case gl.INT:
                gl.uniform1i(uniform.location, value);
                break;
            case gl.INT_VEC2:
                gl.uniform2i(uniform.location, value.x || value[0], value.y || value[1]);
                break;
            case gl.INT_VEC3:
                gl.uniform3i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2]);
                break;
            case gl.INT_VEC4:
                gl.uniform4i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2], value.w || value[3]);
                break;
            case gl.BOOL:
                gl.uniform1i(uniform.location, value);
                break;
            case gl.BOOL_VEC2:
                gl.uniform2i(uniform.location, value.x || value[0], value.y || value[1]);
                break;
            case gl.BOOL_VEC3:
                gl.uniform3i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2]);
                break;
            case gl.BOOL_VEC4:
                gl.uniform4i(uniform.location, value.x || value[0], value.y || value[1], value.z || value[2], value.w || value[3]);
                break;
            case gl.FLOAT_MAT4:
                gl.uniformMatrix4fv(uniform.location, false, value._m);
                break;
            default:
                throw new Error("Unsupported uniform format for setting. May be a todo.");

        }
    }
};

/**
 * @classdesc
 * HardSpotShadowFilter is a shadow filter for spot lights that doesn't apply any filtering at all.
 *
 * @see {@linkcode InitOptions#spotShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HardSpotShadowFilter()
{
    ShadowFilter.call(this);
}

HardSpotShadowFilter.prototype = Object.create(ShadowFilter.prototype);

/**
 * @ignore
 */
HardSpotShadowFilter.prototype.getGLSL = function()
{
    return ShaderLibrary.get("spot_shadow_hard.glsl");
};

/**
 * @classdesc
 * HardPointShadowFilter is a shadow filter for point lights that doesn't apply any filtering at all.
 *
 * @see {@linkcode InitOptions#pointShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HardPointShadowFilter()
{
    ShadowFilter.call(this);
}

HardPointShadowFilter.prototype = Object.create(ShadowFilter.prototype);

/**
 * @ignore
 */
HardPointShadowFilter.prototype.getGLSL = function()
{
    return ShaderLibrary.get("point_shadow_hard.glsl");
};

/**
 * META contains some data about the Helix engine, such as the options it was initialized with.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var META =
    {
        /**
         * Whether or not Helix has been initialized.
         */
        INITIALIZED: false,

        /**
         * The options passed to Helix when initializing. These are possibly updated to reflect the device's capabilties,
         * so it can be used to verify settings.
         */
        OPTIONS: null,

        /**
         * The canvas used to contain the to-screen renders.
         */
        TARGET_CANVAS: null
    };

/**
 * The {@linkcode Signal} that dispatched before a frame renders.
 */
var onPreFrame = new Signal();

/**
 * The {@linkcode Signal} that triggers rendering. Listen to this to call {@linkcode Renderer#render}
 */
var onFrame = new Signal();

/**
 * The duration to update and render a frame.
 */
var frameTime = 0;

/**
 * @ignore
 * @type {FrameTicker}
 */
var frameTicker = new FrameTicker();

frameTicker.onTick.bind(_onFrameTick);

/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
var DEFAULTS =
    {
        COPY_SHADER: null,
        DEFAULT_2D_DITHER_TEXTURE: null,
        DEFAULT_SKINNING_TEXTURE: null
    };

/**
 * capabilities contains the device-specific properties and supported extensions.
 *
 * @author derschmale <http://www.derschmale.com>
 */
var capabilities =
    {
        // extensions:
        EXT_DRAW_BUFFERS: null,
        EXT_FLOAT_TEXTURES: null,
        EXT_HALF_FLOAT_TEXTURES: null,
        EXT_FLOAT_TEXTURES_LINEAR: null,
        EXT_HALF_FLOAT_TEXTURES_LINEAR: null,
        EXT_DEPTH_TEXTURE: null,
        EXT_STANDARD_DERIVATIVES: null,
        EXT_SHADER_TEXTURE_LOD: null,
        EXT_TEXTURE_FILTER_ANISOTROPIC: null,
        EXT_ELEMENT_INDEX_UINT: null,

        DEFAULT_TEXTURE_MAX_ANISOTROPY: 0,
        NUM_MORPH_TARGETS: 0,
        GBUFFER_MRT: false,
        HDR_FORMAT: 0,
        HALF_FLOAT_FBO: false
    };

// internal options
var _HX_ = {
    GAMMA_CORRECT_LIGHTS: false
};

/**
 * TextureFilter contains texture filtering presets.
 *
 * @namespace
 *
 * @property NEAREST Performs nearest neighbour filter with nearest mip level selection
 * @property NEAREST_NOMIP Performs nearest neighbour filter with mipmapping disabled
 * @property BILINEAR Performs bilinear filtering with nearest mip level selection
 * @property BILINEAR_NOMIP Performs bilinear filtering with mipmapping disabled
 * @property TRILINEAR Performs trilinear filtering (bilinear + linear mipmap interpolation)
 * @property TRILINEAR_ANISOTROPIC Performs anisotropic trilinear filtering. Only available if capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC is available.
 */
var TextureFilter = {};

/**
 * TextureWrapMode defines how a texture should be samples when the coordinate is outside the [0, 1] range.
 *
 * @namespace
 *
 * @property DEFAULT The default texture wrap mode (REPEAT).
 * @property REPEAT The fractional part of the coordinate will be used as the coordinate, causing the texture to repeat.
 * @property CLAMP The coordinates will be clamped to 0 and 1.
 */
var TextureWrapMode = {};

/**
 * CullMode defines the type of face culling used when rendering.
 *
 * @namespace
 *
 * @property NONE Doesn't perform any culling (both sides are rendered).
 * @property BACK Culls the faces pointing away from the screen
 * @property FRONT = Culls the faces pointing toward the screen
 * @property ALL = Culls both faces (nothing is rendered)
 */
var CullMode = {
    NONE: null,
    BACK: 0x0405,
    FRONT: 0x0404,
    ALL: 0x0408
};

/**
 * StencilOp defines how the stencil buffer gets updated.
 *
 * @namespace
 *
 * @property KEEP Keeps the existing stencil value.
 * @property ZERO Sets the stencil value to 0.
 * @property REPLACE Replaces the stencil value with the reference value.
 * @property INCREMENT Increments the current stencil buffer value. Clamps to the maximum representable unsigned value.
 * @property INCREMENT_WRAP Increments the current stencil buffer value. Wraps stencil buffer value to zero when incrementing the maximum representable unsigned value.
 * @property DECREMENT Decrements the current stencil buffer value. Clamps to 0.
 * @property DECREMENT_WRAP Decrements the current stencil buffer value. Wraps stencil buffer value to the maximum representable unsigned value when decrementing a stencil buffer value of zero.
 * @property INVERT Bitwise inverts the current stencil buffer value.
 *
 * @see {@linkcode StencilState}
 */
var StencilOp = {};

/**
 * Comparison represents comparison modes used in depth tests, stencil tests, etc
 *
 * @namespace
 *
 * @property DISABLED The given test is disabled.
 * @property ALWAYS The given test always succeeds.
 * @property NEVER The given test never succeeds.
 * @property LESS Less than
 * @property EQUAL Equal
 * @property LESS_EQUAL Less than or equal
 * @property GREATER Greater than.
 * @property GREATER_EQUAL Greater than or equal.
 * @property NOT_EQUAL Not equal.
 */
var Comparison = {};

/**
 * ElementType described the type of geometry is described by the index buffer.
 *
 * @namespace
 *
 * @property POINTS Every index represents a point.
 * @property LINES Every two indices represent a line.
 * @property LINE_STRIP The indices represent a set of connected lines.
 * @property LINE_LOOP The indices represent a set of connected lines. The last index is also connected to the first.
 * @property TRIANGLES Every three indices represent a line.
 * @property TRIANGLE_STRIP The indices represent a set of connected triangles, in such a way that any consecutive 3 indices form a triangle.
 * @property TRIANGLE_FAN The indices represent a set of connected triangles, fanning out with the first index shared.
 */
var ElementType = {};

/**
 * BlendFactor define the factors used by {@linkcode BlendState} to multiply with the source and destination colors.
 *
 * @namespace
 *
 * @property ZERO Multiplies by 0.
 * @property ONE Multiplies by 1.
 * @property SOURCE_COLOR Multiplies by the source color.
 * @property ONE_MINUS_SOURCE_COLOR Multiplies by one minus the source color.
 * @property DESTINATION_COLOR Multiplies by the destination color.
 * @property ONE_MINUS_DESTINATION_COLOR Multiplies by one minus the destination color.
 * @property SOURCE_ALPHA Multiplies by the source alpha.
 * @property ONE_MINUS_SOURCE_ALPHA Multiplies by one minus the source alpha.
 * @property DESTINATION_ALPHA Multiplies by the destination alpha.
 * @property ONE_MINUS_DESTINATION_ALPHA Multiplies by one minus the destination alpha.
 * @property SOURCE_ALPHA_SATURATE Multiplies by the minimum of the source and (1 – destination) alphas
 * @property CONSTANT_ALPHA Multiplies by the constant alpha value
 * @property ONE_MINUS_CONSTANT_ALPHA Multiplies by one minus the constant alpha value
 *
 * @see {@linkcode BlendState}
 */
var BlendFactor = {};

/**
 * BlendOperation defines the operation used to combine the multiplied source and destination colors.
 * @namespace
 *
 * @property ADD Adds the two values.
 * @property SUBTRACT Subtracts the two values.
 * @property REVERSE_SUBTRACT Subtracts the two values in the reverse order.
 *
 * @see {@linkcode BlendState}
 */
var BlendOperation = {};

/**
 * ClearMask defines which data needs to be cleared when calling {@linkcode GL#clear}
 *
 * @namespace
 *
 * @property COLOR Only clear the color buffer.
 * @property STENCIL Only clear the stencil buffer.
 * @property DEPTH Only clear the depth buffer.
 * @property COMPLETE Clear all buffers.
 *
 * @see {@linkcode GL#clear}
 */
var ClearMask = {};

/**
 * TextureFormat defines which texture channels are used by a texture.
 *
 * @namespace
 *
 * @property RGBA A 4-channel color texture
 * @property RGB A 3-channel color texture (no alpha)
 */
var TextureFormat = {};

/**
 * DataType represents the data type used by a gpu buffer (vertex buffer, index buffer, textures)
 *
 * @namespace
 *
 * @property UNSIGNED_BYTE Unsigned byte (8 bit integer)
 * @property UNSIGNED_SHORT Unsigned short (16 bit integer)
 * @property UNSIGNED_INT Unsigned short (32 bit integer)
 * @property FLOAT Floating point (32 bit float)
 */
var DataType = {};

/**
 * BufferUsage describes the type of cpu <-> gpu interaction a vertex or index buffer requires.
 *
 * @namespace
 *
 * @property STATIC_DRAW The buffer is meant to be uploaded once (or rarely)
 * @property DYNAMIC_DRAW The buffer is meant to be updated often.
 *
 * @see {@linkcode Mesh#vertexUsage}
 * @see {@linkcode Mesh#indexUsage}
 */
var BufferUsage = {};

/**
 * CubeFace represents the sides of a cube, for example the faces of a cube texture.
 *
 * @namespace
 *
 * @property POSITIVE_X The positive X side.
 * @property NEGATIVE_X The negative X side.
 * @property POSITIVE_Y The positive Y side.
 * @property NEGATIVE_Y The negative Y side.
 * @property POSITIVE_Z The positive Z side.
 * @property NEGATIVE_Z The negative Z side.
 */
var CubeFace = {};

/**
 * @classdesc
 * Provides a set of options to configure Helix at init. Once passed, the options get assigned to {@linkcode META#OPTIONS}
 * but the values may have changed to reflect the capabilities of the device. For example: hdr may be set to false if
 * floating point render targets aren't supported. It's important to check options like these through META.OPTIONS to
 * handle them correctly. (lack of hdr may require a different lighting setup).
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function InitOptions()
{
    /**
     * The maximum supported number of joints for skinning animations.
     */
    this.maxSkeletonJoints = 64;

    /**
     * Allows applying ambient occlusion ({@linkcode SSAO} or {@linkcode HBAO}) to the scene.
     */
    this.ambientOcclusion = null;

    /**
     * Whether or not to use a texture to store skinning data. May be forced to "false" if floating point textures are not supported.
     */
    this.useSkinningTexture = true;

    /**
     * Use high dynamic range for rendering. May be forced to "false" if floating point render targets are not supported.
     */
    this.hdr = false;

    /**
     * Apply gamma correction. This allows lighting to happen in linear space, as it should.
     */
    this.useGammaCorrection = true;

    /**
     * If true, uses a gamma of 2.2 instead of 2. The latter is faster and generally "good enough".
     */
    this.usePreciseGammaCorrection = false;

    /**
     * The default {@codelink LightingModel} to use.
     */
    this.defaultLightingModel = LightingModel.Unlit;
    /**
     * The lighting model {@codelink LightingModel} to use in the deferred lighting path, which may improve lighting
     * performance. Usually you'd want this to be either null or the same as defaulyt
     */
    this.deferredLightingModel = null;

    /**
     * The amount of shadow cascades to use. Cascades split up the view frustum into areas with their own shadow maps,
     * increasing quality at the cost of performance.
     */
    this.numShadowCascades = 1;

    // debug stuff
    /**
     * This enables some error-checking (such as on shader compilation). This has a big performance impact on shader
     * initialisation.
     */
    this.debug = false;

    /**
     * Ignore any supported extensions.
     */
    this.ignoreAllExtensions = false;

    /**
     * Ignore the draw buffer extension. Forces multiple passes for the deferred GBuffer rendering.
     */
    this.ignoreDrawBuffersExtension = false;

    /**
     * Ignore the depth textures extension.
     */
    this.ignoreDepthTexturesExtension = false;

    /**
     * Ignores the texture LOD extension
     */
    this.ignoreTextureLODExtension = false;

    /**
     * Ignores the half float texture format extension
     */
    this.ignoreHalfFloatTextureExtension = false;     // forces storing depth info explicitly
    /**
     * Ignores the float texture format extension
     */
    this.ignoreFloatTextureExtension = false;     // forces storing depth info explicitly

    /**
     * Throws errors when shaders fail to compile.
     */
    this.throwOnShaderError = false;

    /**
     * The shadow filter to use when rendering directional light shadows.
     */
    this.directionalShadowFilter = new HardDirectionalShadowFilter();

    /**
     * The shadow filter to use when rendering spot light shadows.
     */
    this.spotShadowFilter = new HardSpotShadowFilter();

    /**
     * The shadow filter to use when rendering point light shadows.
     */
    this.pointShadowFilter = new HardPointShadowFilter();

    /**
     * Indicates whether the back buffer should support transparency.
     */
    this.transparentBackground = false;
}

/**
 * Initializes Helix and creates a WebGL context for a given canvas
 *
 * @param canvas The canvas to create the gl context from.
 * @param [options] An optional {@linkcode InitOptions} object.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function init(canvas, options)
{
    if (META.INITIALIZED) throw new Error("Can only initialize Helix once!");


    META.TARGET_CANVAS = canvas;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    META.OPTIONS = options || new InitOptions();

    var webglFlags = {
        antialias: false,   // we're rendering to texture by default, so native AA has no effect
        alpha: META.OPTIONS.transparentBackground,
        // we render offscreen, so no depth/stencil needed in backbuffer
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false
    };

    var gl = canvas.getContext('webgl', webglFlags) || canvas.getContext('experimental-webgl', webglFlags);
    if (!gl) throw new Error("WebGL not supported");
    GL._setGL(gl);

    META.INITIALIZED = true;

    var glExtensions = gl.getSupportedExtensions();

    function _getExtension(name)
    {
        return glExtensions.indexOf(name) >= 0 ? gl.getExtension(name) : null;
    }

    // shortcuts
    _initGLProperties();

    var options = META.OPTIONS;
    var defines = "";
    if (options.useGammaCorrection !== false)
        defines += META.OPTIONS.usePreciseGammaCorrection ? "#define HX_GAMMA_CORRECTION_PRECISE\n" : "#define HX_GAMMA_CORRECTION_FAST\n";

    defines += "#define HX_NUM_SHADOW_CASCADES " + META.OPTIONS.numShadowCascades + "\n";
    defines += "#define HX_MAX_SKELETON_JOINTS " + META.OPTIONS.maxSkeletonJoints + "\n";

    options.ignoreDrawBuffersExtension = options.ignoreDrawBuffersExtension || options.ignoreAllExtensions;
    options.ignoreDepthTexturesExtension = options.ignoreDepthTexturesExtension || options.ignoreAllExtensions;
    options.ignoreTextureLODExtension = options.ignoreTextureLODExtension || options.ignoreAllExtensions;
    options.ignoreHalfFloatTextureExtension = options.ignoreHalfFloatTextureExtension || options.ignoreAllExtensions;
    options.ignoreFloatTextureExtension = options.ignoreHalfFloatTextureExtension || options.ignoreAllExtensions;

    if (!options.ignoreDrawBuffersExtension)
        capabilities.EXT_DRAW_BUFFERS = _getExtension('WEBGL_draw_buffers');

    if (capabilities.EXT_DRAW_BUFFERS && capabilities.EXT_DRAW_BUFFERS.MAX_DRAW_BUFFERS_WEBGL >= 3) {
        capabilities.GBUFFER_MRT = true;
        // remove the last (individual) gbuffer pass
        --MaterialPass.NUM_PASS_TYPES;
    }

    if (!options.ignoreFloatTextureExtension)
        capabilities.EXT_FLOAT_TEXTURES = _getExtension('OES_texture_float');

    if (capabilities.EXT_FLOAT_TEXTURES)
        defines += "#define HX_FLOAT_TEXTURES\n";
    else {
        console.warn('OES_texture_float extension not supported!');
        options.useSkinningTexture = false;
    }

    if (!options.ignoreHalfFloatTextureExtension)
        capabilities.EXT_HALF_FLOAT_TEXTURES = _getExtension('OES_texture_half_float');

    if (capabilities.EXT_HALF_FLOAT_TEXTURES)
        defines += "#define HX_HALF_FLOAT_TEXTURES\n";
    else
        console.warn('OES_texture_half_float extension not supported!');

    if (capabilities.EXT_FLOAT_TEXTURES) {
        capabilities.EXT_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_float_linear');
        if (capabilities.EXT_FLOAT_TEXTURES_LINEAR)
            defines += "#define HX_FLOAT_TEXTURES_LINEAR\n";
        else
            console.warn('OES_texture_float_linear extension not supported!');
    }

    if (capabilities.EXT_HALF_FLOAT_TEXTURES) {
        capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR = _getExtension('OES_texture_half_float_linear');
        if (capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR) {
            defines += "#define HX_HALF_FLOAT_TEXTURES_LINEAR\n";
            DataType.HALF_FLOAT = capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES;
        }
        else
            console.warn('OES_texture_half_float_linear extension not supported!');
    }

    // these SHOULD be implemented, but are not by Chrome
    //EXT_COLOR_BUFFER_FLOAT = _getExtension('WEBGL_color_buffer_float');
    //if (!EXT_COLOR_BUFFER_FLOAT) console.warn('WEBGL_color_buffer_float extension not supported!');

    //EXT_COLOR_BUFFER_HALF_FLOAT = _getExtension('EXT_color_buffer_half_float');
    //if (!EXT_COLOR_BUFFER_HALF_FLOAT) console.warn('EXT_color_buffer_half_float extension not supported!');

    if (!options.ignoreDepthTexturesExtension)
        capabilities.EXT_DEPTH_TEXTURE = _getExtension('WEBGL_depth_texture');

    if (!capabilities.EXT_DEPTH_TEXTURE) {
        console.warn('WEBGL_depth_texture extension not supported!');
        defines += "#define HX_NO_DEPTH_TEXTURES\n";
    }

    capabilities.EXT_STANDARD_DERIVATIVES = _getExtension('OES_standard_derivatives');
    if (!capabilities.EXT_STANDARD_DERIVATIVES) console.warn('OES_standard_derivatives extension not supported!');

    if (!options.ignoreTextureLODExtension)
        capabilities.EXT_SHADER_TEXTURE_LOD = _getExtension('EXT_shader_texture_lod');

    if (capabilities.EXT_SHADER_TEXTURE_LOD)
        defines += "#define HX_TEXTURE_LOD\n";
    else
        console.warn('EXT_shader_texture_lod extension not supported!');

    capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC = _getExtension('EXT_texture_filter_anisotropic');
    if (!capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC) console.warn('EXT_texture_filter_anisotropic extension not supported!');

    capabilities.EXT_ELEMENT_INDEX_UINT = _getExtension('OES_element_index_uint');
    if (!capabilities.EXT_ELEMENT_INDEX_UINT) console.warn('OES_element_index_uint extension not supported!');

    //EXT_SRGB = _getExtension('EXT_sRGB');
    //if (!EXT_SRGB) console.warn('EXT_sRGB extension not supported!');

    capabilities.DEFAULT_TEXTURE_MAX_ANISOTROPY = capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC ? gl.getParameter(capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0;

    if (!capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR || !capabilities.EXT_HALF_FLOAT_TEXTURES)
        options.hdr = false;

    if (capabilities.EXT_HALF_FLOAT_TEXTURES && _tryFBO(capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES)) {
        capabilities.HALF_FLOAT_FBO = true;
    }
    else {
        options.hdr = false;
        capabilities.HALF_FLOAT_FBO = false;
        console.warn("Half float FBOs not supported");
    }

    if (capabilities.EXT_FLOAT_TEXTURES && _tryFBO(HX.FLOAT)) {
        capabilities.FLOAT_FBO = true;
    } else {
        capabilities.FLOAT_FBO = false;
        console.warn("Half float FBOs not supported");
    }

    capabilities.HDR_FORMAT = options.hdr ? capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES : gl.UNSIGNED_BYTE;

    // this causes lighting accumulation to happen in gamma space (only accumulation of lights within the same pass is linear)
    // This yields an incorrect gamma correction to be applied, but looks much better due to encoding limitation (otherwise there would be banding)
    // if (options.useGammaCorrection && !options.hdr) {
        // _HX_.GAMMA_CORRECT_LIGHTS = true;
        // defines += "#define HX_GAMMA_CORRECT_LIGHTS\n";
    // }

    if (options.useSkinningTexture) {
        defines += "#define HX_USE_SKINNING_TEXTURE\n";

        _initDefaultSkinningTexture();
    }

    // this cannot be defined by the user
    capabilities.NUM_MORPH_TARGETS = 8;

    Texture2D._initDefault();
    TextureCube._initDefault();
    BlendState._initDefaults();
    RectMesh._initDefault();
    PoissonDisk._initDefault();
    PoissonSphere._initDefault();

    // default copy shader
    DEFAULTS.COPY_SHADER = new CopyChannelsShader();

    _init2DDitherTexture(32, 32);

    if (options.ambientOcclusion) {
        defines += "#define HX_SSAO\n";
        options.ambientOcclusion.init();
    }

    GLSLIncludes.GENERAL = defines + GLSLIncludes.GENERAL;

    GL.setClearColor(Color.BLACK);

    start();
}

function _onFrameTick(dt)
{
    var startTime = (performance || Date).now();
    onPreFrame.dispatch(dt);
    _clearGLStats();
    onFrame.dispatch(dt);
    frameTime = (performance || Date).now() - startTime;
}

/**
 * Starts the Helix loop (happens automatically).
 */
function start()
{
    frameTicker.start();
}

/**
 * Stops the Helix loop.
 */
function stop()
{
    frameTicker.stop();
}

function _initDefaultSkinningTexture()
{
    var gl = GL.gl;
    DEFAULTS.DEFAULT_SKINNING_TEXTURE = new Texture2D();

    var data = [];
    for (var i = 0; i < META.OPTIONS.maxSkeletonJoints; ++i)
        data.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0);

    DEFAULTS.DEFAULT_SKINNING_TEXTURE.uploadData(new Float32Array(data), META.OPTIONS.maxSkeletonJoints, 3, false, gl.RGBA, gl.FLOAT);
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.filter = TextureFilter.NEAREST_NOMIP;
    DEFAULTS.DEFAULT_SKINNING_TEXTURE.wrapMode = TextureWrapMode.CLAMP;
}

function _init2DDitherTexture(width, height)
{
    var gl = GL.gl;
    var len = width * height;
    var minValue = 1.0 / len;
    var data = [];
    var k = 0;
    var values = [];
    var i;

    for (i = 0; i < len; ++i) {
        values.push(i / len);
    }

    ArrayUtils.shuffle(values);

    for (i = 0; i < len; ++i) {
        var angle = values[i] * Math.PI * 2.0;
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        // store rotation matrix
        // RGBA:
        data[k++] = cos;
        data[k++] = sin;
        data[k++] = minValue + values[i];
        data[k++] = 1.0;
    }

    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE = new Texture2D();
    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.filter = TextureFilter.NEAREST_NOMIP;
    DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.wrapMode = TextureWrapMode.REPEAT;

    if (capabilities.EXT_FLOAT_TEXTURES)
        DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.uploadData(new Float32Array(data), width, height, false, gl.RGBA, gl.FLOAT);
    else {
        len = data.length;

        for (i = 0; i < len; ++i)
            data[i] = Math.round((data[i] * .5 + .5) * 0xff);

        DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.uploadData(new Uint8Array(data), width, height, false, gl.RGBA, gl.UNSIGNED_BYTE);
    }

    // this one is used when dynamic light probes passes need to disable a map
    DEFAULTS.DARK_CUBE_TEXTURE = new TextureCube();
    var data = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    data = [ data, data, data, data, data, data ];
    DEFAULTS.DARK_CUBE_TEXTURE.uploadData(data, 1, true);
}


function _initGLProperties()
{
    var gl = GL.gl;
    TextureFilter.NEAREST = {min: gl.NEAREST_MIPMAP_NEAREST, mag: gl.NEAREST};
    TextureFilter.BILINEAR = {min: gl.LINEAR_MIPMAP_NEAREST, mag: gl.LINEAR};
    TextureFilter.TRILINEAR = {min: gl.LINEAR_MIPMAP_LINEAR, mag: gl.LINEAR};

    if (capabilities.EXT_TEXTURE_FILTER_ANISOTROPIC)
        TextureFilter.TRILINEAR_ANISOTROPIC = {min: gl.LINEAR_MIPMAP_LINEAR, mag: gl.LINEAR};


    TextureFilter.NEAREST_NOMIP = {min: gl.NEAREST, mag: gl.NEAREST};
    TextureFilter.BILINEAR_NOMIP = {min: gl.LINEAR, mag: gl.LINEAR};

    TextureWrapMode.REPEAT = {s: gl.REPEAT, t: gl.REPEAT};
    TextureWrapMode.CLAMP = {s: gl.CLAMP_TO_EDGE, t: gl.CLAMP_TO_EDGE};

    // default settings:
    TextureWrapMode.DEFAULT = TextureWrapMode.REPEAT;
    TextureFilter.DEFAULT = TextureFilter.TRILINEAR;

    StencilOp.KEEP = gl.KEEP;
    StencilOp.ZERO = gl.ZERO;
    StencilOp.REPLACE = gl.REPLACE;
    StencilOp.INCREMENT = gl.INCR;
    StencilOp.INCREMENT_WRAP = gl.INCR_WRAP;
    StencilOp.DECREMENT = gl.DECR;
    StencilOp.DECREMENT_WRAP = gl.DECR_WRAP;
    StencilOp.INVERT = gl.INVERT;

    Comparison.DISABLED = null;
    Comparison.ALWAYS = gl.ALWAYS;
    Comparison.NEVER = gl.NEVER;
    Comparison.LESS = gl.LESS;
    Comparison.EQUAL = gl.EQUAL;
    Comparison.LESS_EQUAL = gl.LEQUAL;
    Comparison.GREATER = gl.GREATER;
    Comparison.NOT_EQUAL = gl.NOTEQUAL;
    Comparison.GREATER_EQUAL = gl.GEQUAL;

    ElementType.POINTS = gl.POINTS;
    ElementType.LINES = gl.LINES;
    ElementType.LINE_STRIP = gl.LINE_STRIP;
    ElementType.LINE_LOOP = gl.LINE_LOOP;
    ElementType.TRIANGLES = gl.TRIANGLES;
    ElementType.TRIANGLE_STRIP = gl.TRIANGLE_STRIP;
    ElementType.TRIANGLE_FAN = gl.TRIANGLE_FAN;

    BlendFactor.ZERO = gl.ZERO;
    BlendFactor.ONE = gl.ONE;
    BlendFactor.SOURCE_COLOR = gl.SRC_COLOR;
    BlendFactor.ONE_MINUS_SOURCE_COLOR = gl.ONE_MINUS_SRC_COLOR;
    BlendFactor.DESTINATION_COLOR = gl.DST_COLOR;
    BlendFactor.ONE_MINUS_DESTINATION_COLOR = gl.ONE_MINUS_DST_COLOR;
    BlendFactor.SOURCE_ALPHA = gl.SRC_ALPHA;
    BlendFactor.ONE_MINUS_SOURCE_ALPHA = gl.ONE_MINUS_SRC_ALPHA;
    BlendFactor.DESTINATION_ALPHA = gl.DST_ALPHA;
    BlendFactor.ONE_MINUS_DESTINATION_ALPHA = gl.ONE_MINUS_DST_ALPHA;
    BlendFactor.SOURCE_ALPHA_SATURATE = gl.SRC_ALPHA_SATURATE;
    BlendFactor.CONSTANT_ALPHA = gl.CONSTANT_ALPHA;
    BlendFactor.ONE_MINUS_CONSTANT_ALPHA = gl.ONE_MINUS_CONSTANT_ALPHA;

    BlendOperation.ADD = gl.FUNC_ADD;
    BlendOperation.SUBTRACT = gl.FUNC_SUBTRACT;
    BlendOperation.REVERSE_SUBTRACT = gl.FUNC_REVERSE_SUBTRACT;

    ClearMask.COLOR = gl.COLOR_BUFFER_BIT;
    ClearMask.STENCIL = gl.STENCIL_BUFFER_BIT;
    ClearMask.DEPTH = gl.DEPTH_BUFFER_BIT;
    ClearMask.COMPLETE = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT;

    TextureFormat.RGBA = gl.RGBA;
    TextureFormat.RGB = gl.RGB;

    DataType.UNSIGNED_BYTE = gl.UNSIGNED_BYTE;
    DataType.UNSIGNED_SHORT = gl.UNSIGNED_SHORT;
    DataType.UNSIGNED_INT = gl.UNSIGNED_INT;
    DataType.FLOAT = gl.FLOAT;
    DataType.HALF_FLOAT = undefined;    // possibly set later, if supported

    BufferUsage.STATIC_DRAW = gl.STATIC_DRAW;
    BufferUsage.DYNAMIC_DRAW = gl.DYNAMIC_DRAW;

    CubeFace.POSITIVE_X = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
    CubeFace.NEGATIVE_X = gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
    CubeFace.POSITIVE_Y = gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
    CubeFace.NEGATIVE_Y = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
    CubeFace.POSITIVE_Z = gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
    CubeFace.NEGATIVE_Z = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
}

function _tryFBO(dataType)
{
    var tex = new Texture2D();
    tex.initEmpty(8, 8, null, dataType);
    var fbo = new FrameBuffer(tex);
    return fbo.init(true);
}

/**
 * @classdesc
 * CenteredGaussianCurve is a class that can be used to generate values from a gaussian curve symmetrical to the Y-axis.
 *
 * @constructor
 * @param variance The variance of the distribution.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CenteredGaussianCurve(variance)
{
    this._amplitude = 1.0 / Math.sqrt(2.0 * variance * Math.PI);
    this._expScale = -1.0 / (2.0 * variance);
}

CenteredGaussianCurve.prototype =
{
    /**
     * Gets the y-value of the curve at the given x-coordinate.
     */
    getValueAt: function(x)
    {
        return this._amplitude * Math.pow(Math.E, x*x*this._expScale);
    }
};

/**
 * Creates a CenteredGaussianCurve with a given "radius" of influence.
 * @param radius The "radius" of the curve.
 * @param epsilon The minimum value to still be considered within the radius.
 * @returns {CenteredGaussianCurve} The curve with the given radius.
 */
CenteredGaussianCurve.fromRadius = function(radius, epsilon)
{
    epsilon = epsilon || .01;
    var standardDeviation = radius / Math.sqrt(-2.0 * Math.log(epsilon));
    return new CenteredGaussianCurve(standardDeviation*standardDeviation);
};

/**
 * Values for classifying a point or object to a plane
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var PlaneSide = {
    /**
     * Entirely on the front side of the plane
     */
    FRONT: 1,

    /**
     * Entirely on the back side of the plane
     */
    BACK: -1,

    /**
     * Intersecting the plane.
     */
    INTERSECTING: 0
};

/**
 * @classdesc
 * Ray class bundles an origin point and a direction vector for ray-intersection tests.
 *
 * @constructor
 */
function Ray()
{
    /**
     * The origin point of the ray.
     */
    this.origin = new Float4(0, 0, 0, 1);

    /**
     * The direction vector of the ray.
     */
    this.direction = new Float4(0, 0, 0, 0);
}

Ray.prototype =
{
    /**
     * Transforms a given ray and stores it in this one.
     * @param ray The ray to transform.
     * @param matrix The matrix containing the transformation.
     */
    transformFrom: function(ray, matrix)
    {
        matrix.transformPoint(ray.origin, this.origin);
        matrix.transformVector(ray.direction, this.direction);
        this.direction.normalize();
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "Ray(\n" +
                "origin: " + this.origin.toString() + "\n" +
                "direction: " + this.direction.toString() + "\n" +
                ")";
    }
};

/**
 * @abstract
 *
 * @constructor
 *
 * @classdesc
 * <p>A Component is an object that can be added to an {@linkcode Entity} to add behavior to it in a modular fashion.
 * This can be useful to create small pieces of functionality that can be reused often and without extra boilerplate code.</p>
 * <p>If it implements an onUpdate(dt) function, the update method will be called every frame.</p>
 * <p>A single Component instance is unique to an Entity and cannot be shared!</p>
 *
 * @see {@linkcode Entity}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Component()
{
    // this allows notifying entities about bound changes (useful for sized components)
    this._entity = null;
}

Component.prototype =
{
    /**
     * Called when this component is added to an Entity.
     */
    onAdded: function() {},

    /**
     * Called when this component is removed from an Entity.
     */
    onRemoved: function() {},

    /**
     * If provided, this method will be called every frame, allowing updating the entity.
     * @param [Number] dt The amount of milliseconds passed since last frame.
     */
    onUpdate: null,

    /**
     * The target entity.
     */
    get entity()
    {
        return this._entity;
    }
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function UnlitPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

UnlitPass.prototype = Object.create(MaterialPass.prototype);

UnlitPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines =
        "#define HX_SKIP_NORMALS\n" +
        "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_unlit_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_unlit_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DirectionalShadowPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

DirectionalShadowPass.prototype = Object.create(MaterialPass.prototype);

DirectionalShadowPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines =
        "#define HX_SKIP_NORMALS\n" +
        "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + META.OPTIONS.directionalShadowFilter.getGLSL() + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_dir_shadow_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_unlit_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ForwardLitBasePass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

ForwardLitBasePass.prototype = Object.create(MaterialPass.prototype);

ForwardLitBasePass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    // no normals or specular are needed
    var defines =   "#define HX_SKIP_NORMALS\n" +
                    "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_fwd_base_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_fwd_base_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SceneVisitor()
{

}

SceneVisitor.prototype =
{
    // the entry point depends on the concrete subclass (collect, etc)
    qualifies: function(object) {},
    visitLight: function(light) {},
    visitAmbientLight: function(light) {},
    visitModelInstance: function (modelInstance, worldMatrix) {},
    visitScene: function (scene) {},
    visitEffects: function(effects, ownerNode) {}
};

/**
 * This goes through a scene to find a material with a given name
 * @param materialName
 * @constructor
 *
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
function MaterialQueryVisitor(materialName)
{
    SceneVisitor.call(this);
    this._materialName = materialName;
}

MaterialQueryVisitor.prototype = Object.create(SceneVisitor.prototype,
    {
        foundMaterial: {
            get: function()
            {
                return this._foundMaterial;
            }
        }
    });

MaterialQueryVisitor.prototype.qualifies = function(object)
{
    // if a material was found, ignore
    return !this._foundMaterial;
};

MaterialQueryVisitor.prototype.visitModelInstance = function (modelInstance, worldMatrix)
{
    var materials = modelInstance._materials;
    var len = materials.length;
    for (var i = 0; i < len; ++i) {
        var material = materials[i];
        if (material.name === this._materialName)
            this._foundMaterial = material;
    }
};

/**
 * @classdesc
 * BoundingVolume forms an abstract base class for axis-aligned bounding volumes, used in the scene hierarchy.
 *
 * @param type The type of bounding volume.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoundingVolume(type)
{
    this._type = type;

    this._expanse = BoundingVolume.EXPANSE_EMPTY;
    this._minimumX = 0.0;
    this._minimumY = 0.0;
    this._minimumZ = 0.0;
    this._maximumX = 0.0;
    this._maximumY = 0.0;
    this._maximumZ = 0.0;
    this._halfExtentX = 0.0;
    this._halfExtentY = 0.0;
    this._halfExtentZ = 0.0;
    this._center = new Float4();
}

/**
 * Indicates the bounds are empty
 */
BoundingVolume.EXPANSE_EMPTY = 0;

/**
 * Indicates the bounds are infinitely large
 */
BoundingVolume.EXPANSE_INFINITE = 1;

/**
 * Indicates the bounds have a real size and position
 */
BoundingVolume.EXPANSE_FINITE = 2;

/**
 * Indicates the parent's bounds are used in selecting.
 */
BoundingVolume.EXPANSE_INHERIT = 3;

BoundingVolume._testAABBToSphere = function(aabb, sphere)
{
    // b = sphere var max = aabb._maximum;
    var maxX = sphere._maximumX;
    var maxY = sphere._maximumY;
    var maxZ = sphere._maximumZ;
    var minX = aabb._minimumX;
    var minY = aabb._minimumY;
    var minZ = aabb._minimumZ;
    var radius = sphere._halfExtentX;
    var centerX = sphere._center.x;
    var centerY = sphere._center.y;
    var centerZ = sphere._center.z;
    var dot = 0, diff;

    if (minX > centerX) {
        diff = centerX - minX;
        dot += diff * diff;
    }
    else if (maxX < centerX) {
        diff = centerX - maxX;
        dot += diff * diff;
    }

    if (minY > centerY) {
        diff = centerY - minY;
        dot += diff * diff;
    }
    else if (maxY < centerY) {
        diff = centerY - maxY;
        dot += diff * diff;
    }

    if (minZ > centerZ) {
        diff = centerZ - minZ;
        dot += diff * diff;
    }
    else if (maxZ < centerZ) {
        diff = centerZ - maxZ;
        dot += diff * diff;
    }

    return dot < radius * radius;
};

BoundingVolume.prototype =
{
    /**
     * Describes the size of the bounding box. {@linkcode BoundingVolume#EXPANSE_EMPTY}, {@linkcode BoundingVolume#EXPANSE_FINITE}, or {@linkcode BoundingVolume#EXPANSE_INFINITE}
     */
    get expanse() { return this._expanse; },

    /**
     * @ignore
     */
    get type() { return this._type; },

    growToIncludeMesh: function(mesh) { throw new Error("Abstract method!"); },
    growToIncludeBound: function(bounds) { throw new Error("Abstract method!"); },
    growToIncludeMinMax: function(min, max) { throw new Error("Abstract method!"); },

    /**
     * Clear the bounds.
     * @param expanseState The state to reset to. Either {@linkcode BoundingVolume#EXPANSE_EMPTY} or {@linkcode BoundingVolume#EXPANSE_INFINITE}.
     */
    clear: function(expanseState)
    {
        this._minimumX = this._minimumY = this._minimumZ = 0;
        this._maximumX = this._maximumY = this._maximumZ = 0;
        this._center.set(0, 0, 0);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = 0;
        this._expanse = expanseState === undefined? BoundingVolume.EXPANSE_EMPTY : expanseState;
    },

    /**
     * The minimum reach of the bounds, described as a box range.
     */
    get minimum() { return new Float4(this._minimumX, this._minimumY, this._minimumZ, 1.0); },

    /**
     * The maximum reach of the bounds, described as a box range.
     */
    get maximum() { return new Float4(this._maximumX, this._maximumY, this._maximumZ, 1.0); },

    /**
     * The center coordinate of the bounds
     */
    get center() { return this._center; },

    /**
     * The half extents of the bounds. These are the half-dimensions of the box encompassing the bounds from the center.
     */
    get halfExtent() { return new Float4(this._halfExtentX, this._halfExtentY, this._halfExtentZ, 0.0); },

    /**
     * The radius of the sphere encompassing the bounds. This is implementation-dependent, because the radius is less precise for a box than for a sphere
     */
    getRadius: function() { throw new Error("Abstract method!"); },

    /**
     * Transforms a bounding volume and stores it in this one.
     * @param {BoundingVolume} sourceBound The bounds to transform.
     * @param {Matrix4x4} matrix The matrix containing the transformation.
     */
    transformFrom: function(sourceBound, matrix) { throw new Error("Abstract method!"); },

    /**
     * Tests whether the bounds intersects a given convex solid. The convex solid is described as a list of planes pointing outward. Infinite solids are also allowed (Directional Light frusta without a near plane, for example)
     * @param cullPlanes An Array of planes to be tested. Planes are simply Float4 objects.
     * @param numPlanes The amount of planes to be tested against. This so we can test less planes than are in the cullPlanes array (Directional Light frusta, for example)
     * @returns {boolean} Whether or not the bounds intersect the solid.
     */
    intersectsConvexSolid: function(cullPlanes, numPlanes) { throw new Error("Abstract method!"); },

    /**
     * Tests whether the bounds intersect another bounding volume
     */
    intersectsBound: function(bound) { throw new Error("Abstract method!"); },

    /**
     * Tests on which side of the plane the bounding box is (front, back or intersecting).
     * @param plane The plane to test against.
     * @return {PlaneSide} The side of the plane
     */
    classifyAgainstPlane: function(plane) { throw new Error("Abstract method!"); },

    /**
     * Tests whether or not this BoundingVolume intersects a ray.
     */
    intersectsRay: function(ray) { throw new Error("Abstract method!"); },

    /**
     * @ignore
     */
    createDebugModel: function() { throw new Error("Abstract method!"); },

    /**
     * @ignore
     */
    getDebugModel: function()
    {
        if (this._type._debugModel === undefined)
            this._type._debugModel = this.createDebugModel();

        return this._type._debugModel;
    },

    toString: function()
    {
        return "BoundingVolume: [ " +
            this._minimumX + ", " +
            this._minimumY + ", " +
            this._minimumZ + " ] - [ " +
            this._maximumX + ", " +
            this._maximumY + ", " +
            this._maximumZ + " ], expanse: " +
            this._expanse;
    }
};

/**
 * @classdesc
 * The Model class bundles several {@linkcode Mesh} objects into a single renderable object. This allows a single object
 * (for example: a character) to use different Materials for different parts (fe: a skin material and a clothes material)
 *
 * @constructor
 * @param [meshes] The {@linkcode Mesh} objects with which to initialize the Model.
 *
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Model(meshes)
{
    this._name = null;
    this._localBounds = new BoundingAABB();
    this._localBoundsInvalid = true;
    this._skeleton = null;
    this.onMeshesChange = new Signal();
    this.onSkeletonChange = new Signal();
    this._meshes = [];

    if (meshes) {
        if (meshes instanceof Array) {
            for (var i = 0; i < meshes.length; ++i)
                this.addMesh(meshes[i]);
        }
        else if (meshes instanceof Mesh) {
            this.addMesh(meshes);
        }
    }
}

Model.prototype =
    {
        /**
         * The name of the Model.
         */
        get name()
        {
            return this._name;
        },

        set name(value)
        {
            this._name = value;
        },

        /**
         * The amount of {@linkcode Mesh} objects in this Model.
         */
        get numMeshes()
        {
            return this._meshes.length;
        },

        /**
         * Retrieves the {@linkcode Mesh} at the given index.
         */
        getMesh: function (index)
        {
            return this._meshes[index];
        },

        /**
         * The object-space bounding box.
         */
        get localBounds()
        {
            if (this._localBoundsInvalid) this._updateLocalBounds();
            return this._localBounds;
        },

        /**
         * The {@linkcode Skeleton} used for skinning animations.
         */
        get skeleton()
        {
            return this._skeleton;
        },

        set skeleton(value)
        {
            this._skeleton = value;
            this.onSkeletonChange.dispatch();
        },

        /**
         * Removes a Mesh from the Model.
         */
        removeMesh: function (mesh)
        {
            var index = this._meshes.indexOf(mesh);
            if (index < 0) return;

            mesh._model = null;

            this._localBoundsInvalid = true;
            this.onMeshesChange.dispatch();
        },

        /**
         * Adds a Mesh to the Model
         */
        addMesh: function (mesh)
        {
            if (mesh._model) throw new Error("Mesh cannot be shared across Models");

            mesh._model = this;
            this._meshes.push(mesh);
            this._localBoundsInvalid = true;
            this.onMeshesChange.dispatch();
        },

        /**
         * @ignore
         */
        toString: function()
        {
            return "[Model(name=" + this._name + ")]";
        },

        /**
         * @ignore
         * @private
         */
        _updateLocalBounds: function()
        {
            this._localBounds.clear();

            for (var i = 0; i < this._meshes.length; ++i)
                this._localBounds.growToIncludeMesh(this._meshes[i]);

            this._localBoundsInvalid = false;
        }
    };

/**
 * @classdesc
 * NormalTangentGenerator generates normal and/or tangent vectors for a {@codelink Mesh}.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function NormalTangentGenerator()
{
    this._flip = false;
    this._mesh = null;
    this._mode = 0;
    this._faceNormals = null;
    this._faceTangents = null;
    this._faceBitangents = null;
}

/**
 * A bit flag to generate normal vectors
 */
NormalTangentGenerator.MODE_NORMALS = 1;

/**
 * A bit flag to generate tangent vectors
 */
NormalTangentGenerator.MODE_TANGENTS = 2;

NormalTangentGenerator.prototype =
{
    /**
     * Generates normal and/or tangent vectors for a {@codelink Mesh}.
     * @param mesh The target {@codelink Mesh}
     * @param mode Defines which vectors to use. Use {@linkcode NormalTangentGenerator#MODE_NORMALS} | {@linkcode NormalTangentGenerator#MODE_TANGENTS}
     * @param [useFaceWeights] Defines whether or not the face sizes should play a role in how much weight their contribute to the vertex normal.
     * @param [flip] Defines whether or not the face normals should be flipped. Could be required for some mirrored scaling.
     */
    generate: function(mesh, mode, useFaceWeights, flip)
    {
        if (useFaceWeights === undefined) useFaceWeights = true;
        this._mode = mode === undefined? NormalTangentGenerator.MODE_NORMALS | NormalTangentGenerator.MODE_TANGENTS : mode;

        this._flip = flip || false;

        this._mesh = mesh;

        this._positionAttrib = mesh.getVertexAttributeByName("hx_position");
        this._normalAttrib = mesh.getVertexAttributeByName("hx_normal");
        this._tangentAttrib = mesh.getVertexAttributeByName("hx_tangent");
        this._uvAttrib = mesh.getVertexAttributeByName("hx_texCoord");
        this._positionStride = mesh.getVertexStride(this._positionAttrib.streamIndex);
        this._normalStride = mesh.getVertexStride(this._normalAttrib.streamIndex);
        this._tangentStride = mesh.getVertexStride(this._tangentAttrib.streamIndex);
        this._uvStride = mesh.getVertexStride(this._uvAttrib.streamIndex);

        this._calculateFaceVectors(useFaceWeights);
        this._calculateVertexVectors();
    },

    _calculateFaceVectors: function(useFaceWeights)
    {
        var numIndices = this._mesh._indexData.length;

        if ((this._mode & NormalTangentGenerator.MODE_NORMALS) !== 0) this._faceNormals = new Array(numIndices);
        if ((this._mode & NormalTangentGenerator.MODE_TANGENTS) !== 0) {
            this._faceTangents = new Array(numIndices);
            this._faceBitangents = new Array(numIndices);
        }

        var temp = new Float4();
        var temp1 = new Float4();
        var temp2 = new Float4();
        var v0 = new Float4();
        var v1 = new Float4();
        var v2 = new Float4();
        var uv0 = new Float2();
        var uv1 = new Float2();
        var uv2 = new Float2();
        var st1 = new Float2();
        var st2 = new Float2();

        var posOffset = this._positionAttrib.offset;
        var uvOffset = this._uvAttrib.offset;
        var posData = this._mesh.getVertexData(this._positionAttrib.streamIndex);
        var uvData = this._mesh.getVertexData(this._uvAttrib.streamIndex);

        for (var i = 0; i < numIndices; i += 3) {
            this._getFloat3At(i, posOffset, this._positionStride, v0, posData);
            this._getFloat3At(i + 1, posOffset, this._positionStride, v1, posData);
            this._getFloat3At(i + 2, posOffset, this._positionStride, v2, posData);
            this._getFloat2At(i, uvOffset, this._uvStride, uv0, uvData);
            this._getFloat2At(i + 1, uvOffset, this._uvStride, uv1, uvData);
            this._getFloat2At(i + 2, uvOffset, this._uvStride, uv2, uvData);

            v1.subtract(v0);
            v2.subtract(v0);

            if (this._faceNormals) {
                if (this._flip)
                    Float4.cross(v1, v2, temp);
                else
                    Float4.cross(v2, v1, temp);

                if (!useFaceWeights) temp.normalize();

                this._faceNormals[i] = temp.x;
                this._faceNormals[i + 1] = temp.y;
                this._faceNormals[i + 2] = temp.z;
            }

            if (this._faceTangents) {
                //var div = ((uv1.x - uv0.x)*(uv2.y - uv0.y) - (uv1.y - uv0.y)*(uv2.x - uv0.x));
                Float2.subtract(uv1, uv0, st1);
                Float2.subtract(uv2, uv0, st2);

                Float4.scale(v1, st2.y, temp1);
                Float4.scale(v2, st1.y, temp2);
                Float4.subtract(temp1, temp2, temp);

                if (temp.lengthSqr > .001)
                    temp.normalize();

                this._faceTangents[i] = temp.x;
                this._faceTangents[i + 1] = temp.y;
                this._faceTangents[i + 2] = temp.z;

                Float4.scale(v1, st2.x, temp1);
                Float4.scale(v2, st1.x, temp1);
                Float4.subtract(temp2, temp1, temp);
                // no need to normalize bitangent, just need it for orientation

                this._faceBitangents[i] = temp.x;
                this._faceBitangents[i + 1] = temp.y;
                this._faceBitangents[i + 2] = temp.z;
            }
        }
    },

    _calculateVertexVectors: function()
    {
        this._zeroVectors();

        var bitangents = this._faceTangents ? [] : null;
        var indexData = this._mesh._indexData;
        var normalOffset = this._normalAttrib.offset;
        var tangentOffset = this._tangentAttrib.offset;
        var normalData = this._mesh.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._mesh.getVertexData(this._tangentAttrib.streamIndex);
        var numIndices = indexData.length;

        for (var i = 0; i < numIndices; ++i) {
            var index = indexData[i];
            var normalIndex = normalOffset + index * this._normalStride;
            var tangentIndex = tangentOffset + index * this._tangentStride;
            var bitangentIndex = index * 3;
            var faceIndex = Math.floor(i / 3) * 3;

            if (this._faceNormals) {
                normalData[normalIndex] += this._faceNormals[faceIndex];
                normalData[normalIndex + 1] += this._faceNormals[faceIndex + 1];
                normalData[normalIndex + 2] += this._faceNormals[faceIndex + 2];
            }

            if (this._faceTangents) {
                tangentData[tangentIndex] += this._faceTangents[faceIndex];
                tangentData[tangentIndex + 1] += this._faceTangents[faceIndex + 1];
                tangentData[tangentIndex + 2] += this._faceTangents[faceIndex + 2];

                bitangents[bitangentIndex] += this._faceBitangents[faceIndex];
                bitangents[bitangentIndex + 1] += this._faceBitangents[faceIndex + 1];
                bitangents[bitangentIndex + 2] += this._faceBitangents[faceIndex + 2];
            }
        }

        this._normalize(bitangents);
    },

    _zeroVectors: function()
    {
        var normalData = this._mesh.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._mesh.getVertexData(this._tangentAttrib.streamIndex);
        var normalStride = this._mesh.getVertexStride(this._normalAttrib.streamIndex);
        var tangentStride = this._mesh.getVertexStride(this._tangentAttrib.streamIndex);
        var numVertices = normalData.length / normalStride;
        var normalIndex = this._normalAttrib.offset;
        var tangentIndex = this._tangentAttrib.offset;

        for (var i = 0; i < numVertices; ++i) {
            if (this._mode & NormalTangentGenerator.MODE_NORMALS) {
                normalData[normalIndex] = 0.0;
                normalData[normalIndex + 1] = 0.0;
                normalData[normalIndex + 2] = 0.0;
            }
            if (this._mode & NormalTangentGenerator.MODE_TANGENTS) {
                tangentData[tangentIndex] = 0.0;
                tangentData[tangentIndex + 1] = 0.0;
                tangentData[tangentIndex + 2] = 0.0;
            }
            normalIndex += normalStride;
            tangentIndex += tangentStride;
        }
    },

    _normalize: function(bitangents)
    {
        var normalData = this._mesh.getVertexData(this._normalAttrib.streamIndex);
        var tangentData = this._mesh.getVertexData(this._tangentAttrib.streamIndex);
        var numVertices = normalData.length / this._normalStride;
        var normalIndex = this._normalAttrib.offset;
        var tangentIndex = this._tangentAttrib.offset;
        var bitangentIndex = 0;
        var normal = new Float4();
        var tangent = new Float4();
        var bitangent = new Float4();
        var cross = new Float4();

        for (var i = 0; i < numVertices; ++i) {
            normal.x = normalData[normalIndex];
            normal.y = normalData[normalIndex + 1];
            normal.z = normalData[normalIndex + 2];

            if (this._mode & NormalTangentGenerator.MODE_NORMALS) {
                normal.normalize();
                normalData[normalIndex] = normal.x;
                normalData[normalIndex + 1] = normal.y;
                normalData[normalIndex + 2] = normal.z;
            }
            if (this._mode & NormalTangentGenerator.MODE_TANGENTS) {
                tangent.x = tangentData[tangentIndex];
                tangent.y = tangentData[tangentIndex + 1];
                tangent.z = tangentData[tangentIndex + 2];

                // can happen in singularities
                if (tangent.lengthSqr < 0.0001)
                    tangent.set(1.0, 1.0, 1.0, 1.0);
                else
                    tangent.normalize();

                bitangent.x = bitangents[bitangentIndex];
                bitangent.y = bitangents[bitangentIndex + 1];
                bitangent.z = bitangents[bitangentIndex + 2];
                Float4.cross(tangent, normal, cross);

                tangentData[tangentIndex] = tangent.x;
                tangentData[tangentIndex + 1] = tangent.y;
                tangentData[tangentIndex + 2] = tangent.z;
                tangentData[tangentIndex + 3] = bitangent.dot3(cross) > 0.0? -1.0 : 1.0;
            }

            normalIndex += this._normalStride;
            tangentIndex += this._tangentStride;
        }

        this._mesh.setVertexData(normalData, this._normalAttrib.streamIndex);
        if (this._normalAttrib.streamIndex !== this._tangentAttrib.streamIndex)
            this._mesh.setVertexData(tangentData, this._tangentAttrib.streamIndex);
    },

    _getFloat3At: function(i, offset, stride, target, data)
    {
        var indices = this._mesh._indexData;
        var posIndex = offset + indices[i] * stride;
        target.x = data[posIndex];
        target.y = data[posIndex + 1];
        target.z = data[posIndex + 2];
    },

    _getFloat2At: function(i, offset, stride, target, data)
    {
        var indices = this._mesh._indexData;
        var posIndex = offset + indices[i] * stride;
        target.x = data[posIndex];
        target.y = data[posIndex + 1];
    }
};

/**
 * @ignore
 * @param definition
 * @constructor
 *
 * @extends Model
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Primitive(definition)
{
    definition = definition || {};
    Model.call(this, this._createMesh(definition));
}

Primitive._ATTRIBS = function()
{
    this.positions = [];
    this.uvs = null;
    this.normals = null;
    this.vertexColors = null;
    this.indices = [];
};

Primitive.prototype = Object.create(Model.prototype);

Primitive.prototype._generate = function(target, definition)
{
    throw new Error("Abstract method called!");
};

Primitive.prototype._createMesh = function(definition)
{
    var attribs = new Primitive._ATTRIBS();
    var uvs = definition.uvs === undefined? true : definition.uvs;
    var normals = definition.normals === undefined? true : definition.normals;
    var tangents = definition.tangents === undefined? true : definition.tangents;
    // depends on the primitive type

    var mesh = new Mesh();
    mesh.addVertexAttribute('hx_position', 3);

    if (normals) {
        mesh.addVertexAttribute('hx_normal', 3);
        attribs.normals = [];
    }

    if (tangents)
        mesh.addVertexAttribute('hx_tangent', 4);

    if (uvs) {
        mesh.addVertexAttribute('hx_texCoord', 2);
        attribs.uvs = [];
    }

    this._generate(attribs, definition);

    var vertexColors = attribs.vertexColors;
    if (vertexColors) {
        mesh.addVertexAttribute('hx_vertexColor', 3);
    }

    var scaleU = definition.scaleU || 1;
    var scaleV = definition.scaleV || 1;

    var len = attribs.positions.length / 3;
    var v = 0, v2 = 0, v3 = 0;
    var vertices = [];

    for (var i = 0; i < len; ++i) {
        vertices[v++] = attribs.positions[v3];
        vertices[v++] = attribs.positions[v3 + 1];
        vertices[v++] = attribs.positions[v3 + 2];

        if (normals) {
            vertices[v++] = attribs.normals[v3];
            vertices[v++] = attribs.normals[v3 + 1];
            vertices[v++] = attribs.normals[v3 + 2];
        }

        if (tangents)
            v += 4;

        if (uvs) {
            vertices[v++] = attribs.uvs[v2++] * scaleU;
            vertices[v++] = attribs.uvs[v2++] * scaleV;
        }

        if (vertexColors) {
            vertices[v++] = attribs.vertexColors[v3];
            vertices[v++] = attribs.vertexColors[v3 + 1];
            vertices[v++] = attribs.vertexColors[v3 + 2];
        }

        v3 += 3;
    }

    mesh.setVertexData(vertices, 0);
    mesh.setIndexData(attribs.indices);

    var mode = 0;

    // if data isn't provided, generate it manually
    if (normals && attribs.normals.length === 0)
        mode |= NormalTangentGenerator.MODE_NORMALS;

    if (tangents)
        mode |= NormalTangentGenerator.MODE_TANGENTS;

    if (mode) {
        var generator = new NormalTangentGenerator();
        generator.generate(mesh, mode);
    }

    return mesh;
};

/**
 * @classdesc
 * BoxPrimitive provides a primitive box {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of segments along the X-axis</li>
 *     <li>numSegmentsH: The amount of segments along the Y-axis</li>
 *     <li>numSegmentsD: The amount of segments along the Z-axis</li>
 *     <li>width: The width of the box</li>
 *     <li>height: The height of the box</li>
 *     <li>depth: The depth of the box</li>
 *     <li>invert: Whether or not the faces should point inwards</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoxPrimitive(definition)
{
    Primitive.call(this, definition);
}

BoxPrimitive.prototype = Object.create(Primitive.prototype);

BoxPrimitive.prototype._generate = function(target, definition)
{
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || definition.numSegmentsW || 1;
    var numSegmentsD = definition.numSegmentsD || definition.numSegmentsW || 1;
    var width = definition.width || 1;
    var height = definition.height || width;
    var depth = definition.depth || width;
    var flipSign = definition.invert? -1 : 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var rcpNumSegmentsD = 1/numSegmentsD;
    var halfW = width * .5;
    var halfH = height * .5;
    var halfD = depth * .5;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;
    var x, y, z;
    var ratioU, ratioV;
    var wSegment, hSegment, dSegment;


    // front and back
    for (hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        ratioV = hSegment * rcpNumSegmentsH;
        y = height * ratioV - halfH;
        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            ratioU = wSegment * rcpNumSegmentsW;
            x = width * ratioU - halfW;

            if (flipSign < 0) ratioU = 1.0 - ratioU;

            // front and back
            positions.push(x*flipSign, y*flipSign, halfD*flipSign);
            positions.push(-x*flipSign, y*flipSign, -halfD*flipSign);

            if (normals) {
                normals.push(0, 0, 1);
                normals.push(0, 0, -1);
            }

            if (uvs) {
                uvs.push(ratioU, ratioV);
                uvs.push(ratioU, ratioV);
            }
        }
    }

    for (hSegment = 0; hSegment <= numSegmentsH; ++hSegment) {
        ratioV = hSegment * rcpNumSegmentsH;
        y = height * ratioV - halfH;

        for (dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
            ratioU = dSegment * rcpNumSegmentsD;
            z = depth * ratioU - halfD;

            // left and right
            positions.push(-halfW, y, z*flipSign);
            positions.push(halfW, y, -z*flipSign);

            if (normals) {
                normals.push(-flipSign, 0, 0);
                normals.push(flipSign, 0, 0);
            }

            if (uvs) {
                uvs.push(ratioU, ratioV);
                uvs.push(ratioU, ratioV);
            }
        }
    }

    for (dSegment = 0; dSegment <= numSegmentsD; ++dSegment) {
        ratioV = dSegment * rcpNumSegmentsD;
        z = depth * ratioV - halfD;

        for (wSegment = 0; wSegment <= numSegmentsW; ++wSegment) {
            ratioU = wSegment * rcpNumSegmentsW;
            x = width * ratioU - halfW;

            // top and bottom
            positions.push(x, halfH, -z*flipSign);
            positions.push(x, -halfH, z*flipSign);

            if (normals) {
                normals.push(0, flipSign, 0);
                normals.push(0, -flipSign, 0);
            }

            if (uvs) {
                uvs.push(1.0 - ratioU, 1.0 - ratioV);
                uvs.push(1.0 - ratioU, 1.0 - ratioV);
            }
        }
    }

    var offset = 0;

    for (var face = 0; face < 3; ++face) {
        // order:
        // front, back, left, right, bottom, top
        var numSegmentsU = face === 1? numSegmentsD : numSegmentsW;
        var numSegmentsV = face === 2? numSegmentsD : numSegmentsH;

        for (var yi = 0; yi < numSegmentsV; ++yi) {
            for (var xi = 0; xi < numSegmentsU; ++xi) {
                var w = numSegmentsU + 1;
                var base = offset + xi + yi*w;
                var i0 = base << 1;
                var i1 = (base + w + 1) << 1;
                var i2 = (base + w) << 1;
                var i3 = (base + 1) << 1;

                indices.push(i0, i2, i1);
                indices.push(i0, i1, i3);

                indices.push(i0 | 1, i2 | 1, i1 | 1);
                indices.push(i0 | 1, i1 | 1, i3 | 1);
            }
        }
        offset += (numSegmentsU + 1) * (numSegmentsV + 1);
    }

    var indexIndex = 0;
    if (doubleSided) {
        var i = 0;

        while (i < indexIndex) {
            indices.push(indices[i], indices[i + 2], indices[i + 1]);
            indices.push(indices[i + 3], indices[i + 5], indices[i + 4]);
            indexIndex += 6;
        }
    }
};

/**
 * @classdesc
 * BoundingAABB represents an axis-aligned bounding box.
 *
 * @constructor
 *
 * @extends BoundingVolume
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoundingAABB()
{
    BoundingVolume.call(this, BoundingAABB);
}

BoundingAABB.prototype = Object.create(BoundingVolume.prototype);

/**
 * @inheritDoc
 */
BoundingAABB.prototype.growToIncludeMesh = function(mesh)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = mesh.getVertexAttributeByName("hx_position");
    var index = attribute.offset;
    var stride = mesh.getVertexStride(attribute.streamIndex);
    var vertices = mesh.getVertexData(attribute.streamIndex);
    var len = vertices.length;
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        maxX = minX = vertices[index];
        maxY = minY = vertices[index + 1];
        maxZ = minZ = vertices[index + 2];
        index += stride;
    }
    else {
        minX = this._minimumX; minY = this._minimumY; minZ = this._minimumZ;
        maxX = this._maximumX; maxY = this._maximumY; maxZ = this._maximumZ;
    }

    for (; index < len; index += stride) {
        var x = vertices[index];
        var y = vertices[index + 1];
        var z = vertices[index + 2];

        if (x > maxX) maxX = x;
        else if (x < minX) minX = x;
        if (y > maxY) maxY = y;
        else if (y < minY) minY = y;
        if (z > maxZ) maxZ = z;
        else if (z < minZ) minZ = z;
    }

    this._minimumX = minX; this._minimumY = minY; this._minimumZ = minZ;
    this._maximumX = maxX; this._maximumY = maxY; this._maximumZ = maxZ;
    this._expanse = BoundingVolume.EXPANSE_FINITE;

    this._updateCenterAndExtent();
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === BoundingVolume.EXPANSE_EMPTY ||
        bounds._expanse === BoundingVolume.EXPANSE_INHERIT ||
        this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === BoundingVolume.EXPANSE_INFINITE)
        this._expanse = BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = bounds._minimumX;
        this._minimumY = bounds._minimumY;
        this._minimumZ = bounds._minimumZ;
        this._maximumX = bounds._maximumX;
        this._maximumY = bounds._maximumY;
        this._maximumZ = bounds._maximumZ;
        this._expanse = BoundingVolume.EXPANSE_FINITE;
    }
    else {
        if (bounds._minimumX < this._minimumX)
            this._minimumX = bounds._minimumX;
        if (bounds._minimumY < this._minimumY)
            this._minimumY = bounds._minimumY;
        if (bounds._minimumZ < this._minimumZ)
            this._minimumZ = bounds._minimumZ;
        if (bounds._maximumX > this._maximumX)
            this._maximumX = bounds._maximumX;
        if (bounds._maximumY > this._maximumY)
            this._maximumY = bounds._maximumY;
        if (bounds._maximumZ > this._maximumZ)
            this._maximumZ = bounds._maximumZ;
    }

    this._updateCenterAndExtent();
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.growToIncludeMinMax = function(min, max)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        this._minimumX = min.x;
        this._minimumY = min.y;
        this._minimumZ = min.z;
        this._maximumX = max.x;
        this._maximumY = max.y;
        this._maximumZ = max.z;
        this._expanse = BoundingVolume.EXPANSE_FINITE;
    }
    else {
        if (min.x < this._minimumX)
            this._minimumX = min.x;
        if (min.y < this._minimumY)
            this._minimumY = min.y;
        if (min.z < this._minimumZ)
            this._minimumZ = min.z;
        if (max.x > this._maximumX)
            this._maximumX = max.x;
        if (max.y > this._maximumY)
            this._maximumY = max.y;
        if (max.z > this._maximumZ)
            this._maximumZ = max.z;
    }

    this._updateCenterAndExtent();
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse === BoundingVolume.EXPANSE_FINITE) {
        var arr = matrix._m;
        var m00 = arr[0], m10 = arr[1], m20 = arr[2];
        var m01 = arr[4], m11 = arr[5], m21 = arr[6];
        var m02 = arr[8], m12 = arr[9], m22 = arr[10];

        var x = sourceBound._center.x;
        var y = sourceBound._center.y;
        var z = sourceBound._center.z;

        this._center.x = m00 * x + m01 * y + m02 * z + arr[12];
        this._center.y = m10 * x + m11 * y + m12 * z + arr[13];
        this._center.z = m20 * x + m21 * y + m22 * z + arr[14];

        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;
        x = sourceBound._halfExtentX;
        y = sourceBound._halfExtentY;
        z = sourceBound._halfExtentZ;

        this._halfExtentX = m00 * x + m01 * y + m02 * z;
        this._halfExtentY = m10 * x + m11 * y + m12 * z;
        this._halfExtentZ = m20 * x + m21 * y + m22 * z;


        this._minimumX = this._center.x - this._halfExtentX;
        this._minimumY = this._center.y - this._halfExtentY;
        this._minimumZ = this._center.z - this._halfExtentZ;
        this._maximumX = this._center.x + this._halfExtentX;
        this._maximumY = this._center.y + this._halfExtentY;
        this._maximumZ = this._center.z + this._halfExtentZ;
        this._expanse = sourceBound._expanse;
    }
    else {
        this.clear(sourceBound._expanse);
    }
};


/**
 * @inheritDoc
 */
BoundingAABB.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE || this._expanse === BoundingVolume.EXPANSE_INHERIT)
        return true;
    else if (this._expanse === BoundingVolume.EXPANSE_EMPTY)
        return false;

    var minX = this._minimumX, minY = this._minimumY, minZ = this._minimumZ;
    var maxX = this._maximumX, maxY = this._maximumY, maxZ = this._maximumZ;

    for (var i = 0; i < numPlanes; ++i) {
        // find the point that will always have the smallest signed distance
        var plane = cullPlanes[i];
        var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = plane.w;
        var closestX = planeX > 0? minX : maxX;
        var closestY = planeY > 0? minY : maxY;
        var closestZ = planeZ > 0? minZ : maxZ;

        // classify the closest point
        var signedDist = planeX * closestX + planeY * closestY + planeZ * closestZ + planeW;
        if (signedDist > 0.0)
            return false;
    }

    return true;
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.intersectsBound = function(bound)
{
    if (this._expanse === BoundingVolume.EXPANSE_EMPTY || bound._expanse === BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse === BoundingVolume.EXPANSE_INFINITE || bound._expanse === BoundingVolume.EXPANSE_INFINITE ||
        this._expanse === BoundingVolume.EXPANSE_INHERIT || bound._expanse === BoundingVolume.EXPANSE_INHERIT)
        return true;

    // both AABB
    if (bound._type === this._type) {
        return 	this._maximumX > bound._minimumX &&
            this._minimumX < bound._maximumX &&
            this._maximumY > bound._minimumY &&
            this._minimumY < bound._maximumY &&
            this._maximumZ > bound._minimumZ &&
            this._minimumZ < bound._maximumZ;
    }
    else {
        return BoundingVolume._testAABBToSphere(this, bound);
    }
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.classifyAgainstPlane = function(plane)
{
    var planeX = plane.x, planeY = plane.y, planeZ = plane.z, planeW = plane.w;

    var centerDist = planeX * this._center.x + planeY * this._center.y + planeZ * this._center.z + planeW;

    if (planeX < 0) planeX = -planeX;
    if (planeY < 0) planeY = -planeY;
    if (planeZ < 0) planeZ = -planeZ;

    var intersectionDist = planeX * this._halfExtentX + planeY * this._halfExtentY + planeZ * this._halfExtentZ;
    // intersectionDist is the distance to the far point
    // -intersectionDist is the distance to the closest point

    if (centerDist > intersectionDist)
        return PlaneSide.FRONT;
    if (centerDist < -intersectionDist)
        return PlaneSide.BACK;
    else
        return PlaneSide.INTERSECTING;
};

/**
 * @ignore
 */
BoundingAABB.prototype.intersectsRay = function(ray)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE) return true;
    if (this._expanse === BoundingVolume.EXPANSE_EMPTY || this._expanse === BoundingVolume.EXPANSE_INHERIT) return false;
    // slab method
    var o = ray.origin;
    var d = ray.direction;
    var oX = o.x, oY = o.y, oZ = o.z;
    var dirX = d.x, dirY = d.y, dirZ = d.z;
    var rcpDirX = 1.0 / dirX, rcpDirY = 1.0 / dirY, rcpDirZ = 1.0 / dirZ;

    var nearT = -Infinity;
    var farT = Infinity;

    var t1, t2;

    // t = (minX - oX) / dirX

    if (dirX !== 0.0) {
        t1 = (this._minimumX - oX) * rcpDirX;
        t2 = (this._maximumX - oX) * rcpDirX;
        // near is the closest intersection factor to the ray, far the furthest
        // so [nearT - farT] is the line segment cut off by the planes
        nearT = Math.min(t1, t2);
        farT = Math.max(t1, t2);
    }

    if (dirY !== 0.0) {
        t1 = (this._minimumY - oY) * rcpDirY;
        t2 = (this._maximumY - oY) * rcpDirY;

        // slice of more from the line segment [nearT - farT]
        nearT = Math.max(nearT, Math.min(t1, t2));
        farT = Math.min(farT, Math.max(t1, t2));
    }

    if (dirZ !== 0.0) {
        t1 = (this._minimumZ - oZ) * rcpDirZ;
        t2 = (this._maximumZ - oZ) * rcpDirZ;

        nearT = Math.max(nearT, Math.min(t1, t2));
        farT = Math.min(farT, Math.max(t1, t2));
    }

    return farT > 0 && farT >= nearT;
};

/**
 * Sets the minimum and maximum explicitly using {@linkcode Float4}
 */
BoundingAABB.prototype.setExplicit = function(min, max)
{
    this._minimumX = min.x;
    this._minimumY = min.y;
    this._minimumZ = min.z;
    this._maximumX = max.x;
    this._maximumY = max.y;
    this._maximumZ = max.z;
    this._expanse = BoundingVolume.EXPANSE_FINITE;
    this._updateCenterAndExtent();
};

/**
 * @ignore
 * @private
 */
BoundingAABB.prototype._updateCenterAndExtent = function()
{
    var minX = this._minimumX, minY = this._minimumY, minZ = this._minimumZ;
    var maxX = this._maximumX, maxY = this._maximumY, maxZ = this._maximumZ;
    this._center.x = (minX + maxX) * .5;
    this._center.y = (minY + maxY) * .5;
    this._center.z = (minZ + maxZ) * .5;
    this._halfExtentX = (maxX - minX) * .5;
    this._halfExtentY = (maxY - minY) * .5;
    this._halfExtentZ = (maxZ - minZ) * .5;
};

/**
 * @inheritDoc
 */
BoundingAABB.prototype.getRadius = function()
{
    return Math.sqrt(this._halfExtentX * this._halfExtentX + this._halfExtentY * this._halfExtentY + this._halfExtentZ * this._halfExtentZ);
};

/**
 * @ignore
 */
BoundingAABB.prototype.createDebugModel = function()
{
    return new BoxPrimitive();
};

// basic version is non-hierarchical, for use with lights etc
/**
 * @classdesc
 * <p>SceneNode is an empty hierarchical container for the scene graph. It can be attached to other SceneNode objects and
 * have SceneNode objects attached to itself.</p>
 *
 * <p>SceneNode also functions as the base class for other scene graph objects, such as entities ({@linkcode ModelInstance},
 * lights, camera, ...).
 *
 * @property {string} name The name of te scene node.
 * @property {SceneNode} parent The parent of this node in the scene hierarchy.
 * @property {number} numChildren The amount of children attached to this node.
 * @property {boolean} visible Defines whether or not this and any children attached to this node should be rendered or not.
 * @property {BoundingVolume} worldBounds The bounding volume for this node and its children in world coordinates.
 * @property {Matrix4x4} worldMatrix The matrix transforming from the node's local space to world space.
 *
 * @see {@linkcode Scene}
 *
 * @constructor
 *
 * @extends Transform
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SceneNode()
{
    Transform.call(this);
    this._name = null;
    this._worldMatrix = new Matrix4x4();
    this._worldBoundsInvalid = true;
    this._matrixInvalid = true;
    this._worldMatrixInvalid = true;
    this._parent = null;
    this._scene = null;
    this._worldBounds = this._createBoundingVolume();
    this._debugBounds = null;
    this._visible = true;
    this._children = [];

    // used to determine sorting index for the render loop
    // models can use this to store distance to camera for more efficient rendering, lights use this to sort based on
    // intersection with near plane, etc
    this._renderOrderHint = 0.0;
}

SceneNode.prototype = Object.create(Transform.prototype, {
    name: {
        get: function()
        {
            return this._name;
        },
        set: function(value)
        {
            this._name = value;
        }
    },

    parent: {
        get: function()
        {
            return this._parent;
        }
    },

    numChildren: {
        get: function() { return this._children.length; }
    },

    visible: {
        get: function()
        {
            return this._visible;
        },
        set: function(value)
        {
            this._visible = value;
        }
    },

    worldBounds: {
        get: function()
        {
            if (this._worldBoundsInvalid) {
                this._updateWorldBounds();
                this._worldBoundsInvalid = false;
            }

            return this._worldBounds;
        }
    },

    worldMatrix: {
        get: function()
        {
            if (this._worldMatrixInvalid)
                this._updateWorldMatrix();

            return this._worldMatrix;
        }
    }
});

/**
 * Attaches a child SceneNode to this node.
 */
SceneNode.prototype.attach = function(child)
{
    if (child instanceof Array) {
        var len = child.length;
        for (var i = 0; i < len; ++i) {
            this.attach(child[i]);
        }
        return;
    }

    if (child._parent)
        throw new Error("Child is already parented!");

    child._parent = this;
    child._setScene(this._scene);

    this._children.push(child);
    this._invalidateWorldBounds();
};

/**
 * Removes a child SceneNode from this node.
 */
SceneNode.prototype.detach = function(child)
{
    var index = this._children.indexOf(child);

    if (index < 0)
        throw new Error("Trying to remove a scene object that is not a child");

    child._parent = null;

    this._children.splice(index, 1);
    this._invalidateWorldBounds();
};

/**
 * Retrieves a child SceneNode with the given index.
 */
SceneNode.prototype.getChild = function(index) { return this._children[index]; };

/**
 * @ignore
 * @private
 */
SceneNode.prototype._applyMatrix = function()
{
    Transform.prototype._applyMatrix.call(this);
    this._invalidateWorldMatrix();
};

/**
 * Finds a material with the given name somewhere in this node's children.
 */
SceneNode.prototype.findMaterialByName = function(name)
{
    var visitor = new MaterialQueryVisitor(name);
    this.acceptVisitor(visitor);
    return visitor.foundMaterial;
};

/**
 * Finds a scene node with the given name somewhere in this node's children.
 */
SceneNode.prototype.findNodeByName = function(name)
{
    if (this._name === name) return this;

    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        var node = this._children[i].findNodeByName(name);
        if (node) return node;
    }
};

/**
 * @ignore
 */
SceneNode.prototype._setScene = function(scene)
{
    this._scene = scene;

    var len = this._children.length;

    for (var i = 0; i < len; ++i)
        this._children[i]._setScene(scene);
};

/**
 * @ignore
 */
SceneNode.prototype.acceptVisitor = function(visitor)
{
    if (this._debugBounds)
        this._debugBounds.acceptVisitor(visitor);

    var len = this._children.length;
    for (var i = 0; i < len; ++i) {
        var child = this._children[i];

        if (visitor.qualifies(child))
            child.acceptVisitor(visitor);
    }
};

/**
 * @ignore
 */
SceneNode.prototype._invalidateMatrix = function ()
{
    Transform.prototype._invalidateMatrix.call(this);
    this._invalidateWorldMatrix();
};

/**
 * @ignore
 */
SceneNode.prototype._invalidateWorldMatrix = function ()
{
    this._worldMatrixInvalid = true;
    this._invalidateWorldBounds();

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i]._invalidateWorldMatrix();
};

/**
 * @ignore
 */
SceneNode.prototype._invalidateWorldBounds = function ()
{
    if (this._worldBoundsInvalid) return;

    this._worldBoundsInvalid = true;

    if (this._parent)
        this._parent._invalidateWorldBounds();
};

/**
 * @ignore
 */
SceneNode.prototype._updateWorldBounds = function ()
{
    var len = this._children.length;

    this._worldBounds.clear();

    for (var i = 0; i < len; ++i) {
        this._worldBounds.growToIncludeBound(this._children[i].worldBounds);
    }

    if (this._debugBounds)
        this._updateDebugBounds();
};

/**
 * @ignore
 */
SceneNode.prototype._updateDebugBounds = function()
{
    var matrix = this._debugBounds.matrix;
    var bounds = this._worldBounds;

    matrix.fromScale(bounds._halfExtentX * 2.0, bounds._halfExtentY * 2.0, bounds._halfExtentZ * 2.0);
    matrix.appendTranslation(bounds._center);
    this._debugBounds.matrix = matrix;
};

/**
 * @ignore
 */
SceneNode.prototype._updateMatrix = function()
{
    Transform.prototype._updateMatrix.call(this);
    this._invalidateWorldBounds();
};

/**
 * @ignore
 */
SceneNode.prototype._updateWorldMatrix = function()
{
    if (this._parent)
        this._worldMatrix.multiply(this._parent.worldMatrix, this.matrix);
    else
        this._worldMatrix.copyFrom(this.matrix);

    this._worldMatrixInvalid = false;
};

/**
 * @ignore
 */
SceneNode.prototype._createBoundingVolume = function()
{
    return new BoundingAABB();
};

/**
 * @ignore
 */
SceneNode.prototype.toString = function()
{
    return "[SceneNode(name=" + this._name + ")]";
};

/**
 * Applies a function recursively to all child nodes.
 * @param func The function to call (using the traversed node as argument)
 * @param [thisRef] Optional reference to "this" in the calling function, to keep the scope of "this" in the called method.
 */
SceneNode.prototype.applyFunction = function(func, thisRef)
{
    if (thisRef)
        func.call(thisRef, this);
    else
    // Heehee, this line amuses me:
        func(this);

    var len = this._children.length;
    for (var i = 0; i < len; ++i)
        this._children[i].applyFunction(func, thisRef);
};

/**
 * @classdesc
 * Entity represents a node in the Scene graph that can have {@linkcode Component} objects added to it, which can
 * define its behavior in a modular way.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Entity()
{
    SceneNode.call(this);

    // components
    this._components = null;
    this._requiresUpdates = false;
    this._onRequireUpdatesChange = new Signal();

    // are managed by effect components, but need to be collectable unlike others
    this._effects = null;
}

Entity.prototype = Object.create(SceneNode.prototype);


/**
 * Adds a single {@linkcode Component} object to the Entity.
 */
Entity.prototype.addComponent = function(component)
{
    if (component._entity)
        throw new Error("Component already added to an entity!");

    this._components = this._components || [];

    this._components.push(component);

    this._updateRequiresUpdates(this._requiresUpdates || (!!component.onUpdate));

    component._entity = this;
    component.onAdded();
};

/**
 * Removes a single Component from the Entity.
 */
Entity.prototype.removeComponent = function(component)
{
    component.onRemoved();

    var requiresUpdates = false;
    var len = this._components.length;
    var j = 0;
    var newComps = [];

    // not splicing since we need to regenerate _requiresUpdates anyway by looping
    for (var i = 0; i < len; ++i) {
        var c = this._components[i];
        if (c !== component) {
            newComps[j++] = c;
            requiresUpdates = requiresUpdates || !!component.onUpdate;
        }
    }

    this._components = j === 0? null : newComps;
    component._entity = null;
    this._updateRequiresUpdates(requiresUpdates);
};

/**
 * Adds multiple {@linkcode Component} objects to the Entity.
 * @param {Array} components An array of components to add.
 */
Entity.prototype.addComponents = function(components)
{
    for (var i = 0; i < components.length; ++i)
        this.addComponent(components[i]);
};

/**
 * Removes multiple {@linkcode Component} objects from the Entity.
 * @param {Array} components A list of components to remove.
 */
Entity.prototype.removeComponents = function(components)
{
    for (var i = 0; i < components.length; ++i) {
        this.removeComponent(components[i]);
    }
};

/**
 * Returns whether or not the Entity has a component of a given type assigned to it.
 */
Entity.prototype.hasComponentType = function(type)
{
    if (!this._components) return false;
    for (var i = 0; i < this._components.length; ++i) {
        if (this._components[i] instanceof type) return true;
    }
};

/**
 * Returns an array of all Components with a given type.
 */
Entity.prototype.getComponentsByType = function(type)
{
    var collection = [];
    if (!this._components) return collection;
    for (var i = 0; i < this._components.length; ++i) {
        var comp = this._components[i];
        if (comp instanceof type) collection.push(comp);
    }
    return collection;
};

/**
 * @ignore
 * @private
 */
Entity.prototype._updateRequiresUpdates = function(value)
{
    if (value !== this._requiresUpdates) {
        this._requiresUpdates = value;
        this._onRequireUpdatesChange.dispatch(this);
    }
};

/**
 * @ignore
 */
Entity.prototype.acceptVisitor = function(visitor)
{
    SceneNode.prototype.acceptVisitor.call(this, visitor);

    if (this._effects)
        visitor.visitEffects(this._effects, this);
};

/**
 * @ignore
 */
Entity.prototype.update = function(dt)
{
    var components = this._components;
    if (components) {
        var len = components.length;
        for (var i = 0; i < len; ++i) {
            var component = components[i];
            if (component.onUpdate) {
                component.onUpdate(dt);
            }
        }
    }
};

/**
 * @ignore
 */
Entity.prototype._registerEffect = function(effect)
{
    this._effects = this._effects || [];
    this._effects.push(effect);
};

/**
 * @ignore
 */
Entity.prototype._unregisterEffect = function(effect)
{
    var index = this._effects.indexOf(effect);
    this._effects.splice(index, 1);
    if (this._effects.length === 0)
        this._effects = null;
};

/**
 * @ignore
 */
Entity.prototype._setScene = function(scene)
{
    if (this._scene)
        this._scene.entityEngine.unregisterEntity(this);

    if (scene)
        scene.entityEngine.registerEntity(this);

    SceneNode.prototype._setScene.call(this, scene);
};

/**
 * @classdesc
 * Light forms a base class for lights.
 *
 * @property {number} intensity The intensity of the light.
 * @property {Color} color The color of the light.
 *
 * @abstract
 *
 * @constructor
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Light()
{
    Entity.call(this);
    //this._type = this.getTypeID();
    this._intensity = 3.1415;
    this._color = new Color(1.0, 1.0, 1.0);
    this._scaledIrradiance = new Color();
    this._castShadows = false;
    this._updateScaledIrradiance();
}

Light.prototype = Object.create(Entity.prototype, {
    intensity: {
        get: function ()
        {
            return this._intensity;
        },

        set: function (value)
        {
            this._intensity = value;
            this._updateScaledIrradiance();
        }
    },

    color: {
        get: function ()
        {
            return this._color;
        },

        /**
         * Value can be hex or
         * @param value
         */
        set: function (value)
        {
            this._color = isNaN(value) ? value : new Color(value);
            this._updateScaledIrradiance();
        }
    }
});

Light.prototype.acceptVisitor = function (visitor)
{
    Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

Light.prototype.luminance = function ()
{
    return this._color.luminance() * this._intensity;
};

Light.prototype._updateScaledIrradiance = function ()
{
    // this includes 1/PI radiance->irradiance factor
    var scale = this._intensity / Math.PI;

    if (META.OPTIONS.useGammaCorrection)
        this._color.gammaToLinear(this._scaledIrradiance);
    else
        this._scaledIrradiance.copyFrom(this._color);

    this._scaledIrradiance.r *= scale;
    this._scaledIrradiance.g *= scale;
    this._scaledIrradiance.b *= scale;
    this._invalidateWorldBounds();
};

Light.prototype.renderDeferredLighting = function(renderer)
{
    // To implement by concrete subclasses
};

/**
 *
 * @classdesc
 * ObjectPool allows pooling reusable objects. All it needs is a "next" property to keep it in the list.
 *
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ObjectPool(type)
{
    var head = null;
    var pool = null;

    this.getItem = function()
    {
        var item;

        if (head) {
            item = head;
            head = head.next;
        }
        else {
            item = new type();
            item.next = pool;
            pool = item;
        }

        return item;
    };

    this.reset = function()
    {
        head = pool;
    };
}

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function RenderItem()
{
    this.worldMatrix = null;
    this.meshInstance = null;
    this.skeleton = null;
    this.skeletonMatrices = null;
    this.material = null;
    this.camera = null;
    this.renderOrderHint = 0;
    this.worldBounds = null;

    // to store this in a linked list for pooling
    this.next = null;
}

var RenderSortFunctions = {
    sortOpaques: function(a, b)
    {
        var diff;

        diff = a.material._renderOrder - b.material._renderOrder;
        if (diff !== 0) return diff;

        diff = a.material._renderOrderHint - b.material._renderOrderHint;
        if (diff !== 0) return diff;

        return a.renderOrderHint - b.renderOrderHint;
    },

    sortTransparents: function(a, b)
    {
        var diff = a.material._renderOrder - b.material._renderOrder;
        if (diff !== 0) return diff;
        return b.renderOrderHint - a.renderOrderHint;
    },

    sortLights: function(a, b)
    {
        return  a._type === b._type?
            a._castShadows? 1 : -1 :
            a._type - b._type;
    }
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CascadeShadowCasterCollector()
{
    SceneVisitor.call(this);
    this._renderCameras = null;
    this._cameraZAxis = new Float4();
    this._bounds = new BoundingAABB();
    this._cullPlanes = null;
    // this._splitPlanes = null;
    this._numCullPlanes = 0;
    this._renderList = [];
    this._renderItemPool = new ObjectPool(RenderItem);
}

CascadeShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

CascadeShadowCasterCollector.prototype.getRenderList = function(index) { return this._renderList[index]; };

CascadeShadowCasterCollector.prototype.collect = function(camera, scene)
{
    this._collectorCamera = camera;
    camera.worldMatrix.getColumn(2, this._cameraZAxis);
    this._bounds.clear();
    this._renderItemPool.reset();

    var numCascades = META.OPTIONS.numShadowCascades;
    for (var i = 0; i < numCascades; ++i) {
        this._renderList[i] = [];
    }

    scene.acceptVisitor(this);

    for (var i = 0; i < numCascades; ++i)
        this._renderList[i].sort(RenderSortFunctions.sortOpaques);
};

CascadeShadowCasterCollector.prototype.getBounds = function()
{
    return this._bounds;
};

CascadeShadowCasterCollector.prototype.setRenderCameras = function(cameras)
{
    this._renderCameras = cameras;
};

CascadeShadowCasterCollector.prototype.setCullPlanes = function(cullPlanes, numPlanes)
{
    this._cullPlanes = cullPlanes;
    this._numCullPlanes = numPlanes;
};

// CascadeShadowCasterCollector.prototype.setSplitPlanes = function(splitPlanes)
// {
//     this._splitPlanes = splitPlanes;
// };

CascadeShadowCasterCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    if (modelInstance._castShadows === false) return;

    this._bounds.growToIncludeBound(worldBounds);

    var passIndex = MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS;

    var numCascades = META.OPTIONS.numShadowCascades;
    var numMeshes = modelInstance.numMeshInstances;
    var skeleton = modelInstance.skeleton;
    var skeletonMatrices = modelInstance.skeletonMatrices;
    var cameraZAxis = this._cameraZAxis;
    var cameraZ_X = cameraZAxis.x, cameraZ_Y = cameraZAxis.y, cameraZ_Z = cameraZAxis.z;

    for (var cascade = 0; cascade < numCascades; ++cascade) {
        var renderList = this._renderList[cascade];
        var renderCamera = this._renderCameras[cascade];

        var contained = worldBounds.intersectsConvexSolid(renderCamera.frustum.planes, 4);

        if (contained) {
            for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
                var meshInstance = modelInstance.getMeshInstance(meshIndex);
                var material = meshInstance.material;

                if (material.hasPass(passIndex)) {
                    var renderItem = this._renderItemPool.getItem();
                    renderItem.pass = material.getPass(passIndex);
                    renderItem.meshInstance = meshInstance;
                    renderItem.worldMatrix = worldMatrix;
                    renderItem.camera = renderCamera;
                    renderItem.material = material;
                    renderItem.skeleton = skeleton;
                    renderItem.skeletonMatrices = skeletonMatrices;
                    var center = worldBounds._center;
                    renderItem.renderOrderHint = center.x * cameraZ_X + center.y * cameraZ_Y + center.z * cameraZ_Z;

                    renderList.push(renderItem);
                }
            }
        }
    }
};

CascadeShadowCasterCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._cullPlanes, this._numCullPlanes);
};

/**
 * @classdesc
 * Frustum (a truncated pyramid) describes the set of planes bounding the camera's visible area.
 *
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Frustum()
{
    this._planes = new Array(6);
    this._corners = new Array(8);

    for (var i = 0; i < 6; ++i)
        this._planes[i] = new Float4();

    for (i = 0; i < 8; ++i)
        this._corners[i] = new Float4();
}

/**
 * The index for the left plane.
 */
Frustum.PLANE_LEFT = 0;

/**
 * The index for the right plane.
 */
Frustum.PLANE_RIGHT = 1;

/**
 * The index for the bottom plane.
 */
Frustum.PLANE_BOTTOM = 2;

/**
 * The index for the top plane.
 */
Frustum.PLANE_TOP = 3;

/**
 * The index for the near plane.
 */
Frustum.PLANE_NEAR = 4;

/**
 * The index for the far plane.
 */
Frustum.PLANE_FAR = 5;

/**
 * @ignore
 */
Frustum.CLIP_SPACE_CORNERS = [
    new Float4(-1.0, -1.0, -1.0, 1.0),
    new Float4(1.0, -1.0, -1.0, 1.0),
    new Float4(1.0, 1.0, -1.0, 1.0),
    new Float4(-1.0, 1.0, -1.0, 1.0),
    new Float4(-1.0, -1.0, 1.0, 1.0),
    new Float4(1.0, -1.0, 1.0, 1.0),
    new Float4(1.0, 1.0, 1.0, 1.0),
    new Float4(-1.0, 1.0, 1.0, 1.0)
];

Frustum.prototype =
    {
        /**
         * An Array of planes describing the frustum. The planes are in world space and point outwards.
         */
        get planes() { return this._planes; },

        /**
         * An array containing the 8 vertices of the frustum, in world space.
         */
        get corners() { return this._corners; },

        /**
         * @ignore
         */
        update: function(projection, inverseProjection)
        {
            this._updatePlanes(projection);
            this._updateCorners(inverseProjection);
        },

        _updatePlanes: function(projection)
        {
            var m = projection._m;

            var left = this._planes[Frustum.PLANE_LEFT];
            var right = this._planes[Frustum.PLANE_RIGHT];
            var top = this._planes[Frustum.PLANE_TOP];
            var bottom = this._planes[Frustum.PLANE_BOTTOM];
            var near = this._planes[Frustum.PLANE_NEAR];
            var far = this._planes[Frustum.PLANE_FAR];

            var r1x = m[0], r1y = m[4], r1z = m[8], r1w = m[12];
            var r2x = m[1], r2y = m[5], r2z = m[9], r2w = m[13];
            var r3x = m[2], r3y = m[6], r3z = m[10], r3w = m[14];
            var r4x = m[3], r4y = m[7], r4z = m[11], r4w = m[15];

            left.x = -(r4x + r1x);
            left.y = -(r4y + r1y);
            left.z = -(r4z + r1z);
            left.w = -(r4w + r1w);
            left.normalizeAsPlane();

            right.x = r1x - r4x;
            right.y = r1y - r4y;
            right.z = r1z - r4z;
            right.w = r1w - r4w;
            right.normalizeAsPlane();

            bottom.x = -(r4x + r2x);
            bottom.y = -(r4y + r2y);
            bottom.z = -(r4z + r2z);
            bottom.w = -(r4w + r2w);
            bottom.normalizeAsPlane();

            top.x = r2x - r4x;
            top.y = r2y - r4y;
            top.z = r2z - r4z;
            top.w = r2w - r4w;
            top.normalizeAsPlane();

            near.x = -(r4x + r3x);
            near.y = -(r4y + r3y);
            near.z = -(r4z + r3z);
            near.w = -(r4w + r3w);
            near.normalizeAsPlane();

            far.x = r3x - r4x;
            far.y = r3y - r4y;
            far.z = r3z - r4z;
            far.w = r3w - r4w;
            far.normalizeAsPlane();
        },

        _updateCorners: function(inverseProjection)
        {
            for (var i = 0; i < 8; ++i) {
                var corner = this._corners[i];
                inverseProjection.transform(Frustum.CLIP_SPACE_CORNERS[i], corner);
                corner.scale(1.0 / corner.w);
            }
        }
    };

/**
 * @classdesc
 * Camera is an abstract base class for camera objects.
 *
 * @constructor
 *
 * @property {number} nearDistance The minimum distance to be able to render. Anything closer gets cut off.
 * @property {number} farDistance The maximum distance to be able to render. Anything farther gets cut off.
 * @property {Matrix4x4} viewProjectionMatrix The matrix transforming coordinates from world space to the camera's homogeneous projective space.
 * @property {Matrix4x4} viewMatrix The matrix transforming coordinates from world space to the camera's local coordinate system (eye space).
 * @property {Matrix4x4} projectionMatrix The matrix transforming coordinates from eye space to the camera's homogeneous projective space.
 * @property {Matrix4x4} inverseViewProjectionMatrix The matrix that transforms from the homogeneous projective space to world space.
 * @property {Matrix4x4} inverseProjectionMatrix The matrix that transforms from the homogeneous projective space to view space.
 *
 * @see {@linkcode PerspectiveCamera}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Camera()
{
    Entity.call(this);

    this._renderTargetWidth = 0;
    this._renderTargetHeight = 0;
    this._viewProjectionMatrixInvalid = true;
    this._viewProjectionMatrix = new Matrix4x4();
    this._inverseProjectionMatrix = new Matrix4x4();
    this._inverseViewProjectionMatrix = new Matrix4x4();
    this._projectionMatrix = new Matrix4x4();
    this._viewMatrix = new Matrix4x4();
    this._projectionMatrixDirty = true;
    this._nearDistance = .1;
    this._farDistance = 1000;
    this._frustum = new Frustum();

    this.position.set(0.0, 0.0, -1.0);
}

Camera.prototype = Object.create(Entity.prototype, {
    nearDistance: {
        get: function() {
            return this._nearDistance;
        },

        set: function(value) {
            if (this._nearDistance === value) return;
            this._nearDistance = value;
            this._invalidateProjectionMatrix();
        }
    },

    farDistance: {
        get: function() {
            return this._farDistance;
        },

        set: function(value) {
            if (this._farDistance === value) return;
            this._farDistance = value;
            this._invalidateProjectionMatrix();
        }
    },

    viewProjectionMatrix: {
        get: function() {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._viewProjectionMatrix;
        }
    },

    viewMatrix: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._viewMatrix;
        }
    },

    projectionMatrix: {
        get: function()
        {
            if (this._projectionMatrixDirty)
                this._updateProjectionMatrix();

            return this._projectionMatrix;
        }
    },

    inverseViewProjectionMatrix: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._inverseViewProjectionMatrix;
        }
    },

    inverseProjectionMatrix: {
        get: function()
        {
            if (this._projectionMatrixDirty)
                this._updateProjectionMatrix();

            return this._inverseProjectionMatrix;
        }
    },

    frustum: {
        get: function()
        {
            if (this._viewProjectionMatrixInvalid)
                this._updateViewProjectionMatrix();

            return this._frustum;
        }
    }
});

/**
 * Returns a ray in world space at the given coordinates.
 * @param x The x-coordinate in NDC [-1, 1] range.
 * @param y The y-coordinate in NDC [-1, 1] range.
 */
Camera.prototype.getRay = function(x, y)
{
    var ray = new Ray();
    var dir = ray.direction;
    dir.set(x, y, 1, 1);
    this.inverseProjectionMatrix.transform(dir, dir);
    dir.homogeneousProject();
    this.worldMatrix.transformVector(dir, dir);
    dir.normalize();
    this.worldMatrix.getColumn(3, ray.origin);
    return ray;
};

/**
 * @ignore
 * @param width
 * @param height
 * @private
 */
Camera.prototype._setRenderTargetResolution = function(width, height)
{
    this._renderTargetWidth = width;
    this._renderTargetHeight = height;
};

/**
 * @ignore
 */
Camera.prototype._invalidateViewProjectionMatrix = function()
{
    this._viewProjectionMatrixInvalid = true;
};

/**
 * @ignore
 */
Camera.prototype._invalidateWorldMatrix = function()
{
    Entity.prototype._invalidateWorldMatrix.call(this);
    this._invalidateViewProjectionMatrix();
};

/**
 * @ignore
 */
Camera.prototype._updateViewProjectionMatrix = function()
{
    this._viewMatrix.inverseAffineOf(this.worldMatrix);
    this._viewProjectionMatrix.multiply(this.projectionMatrix, this._viewMatrix);
    this._inverseProjectionMatrix.inverseOf(this._projectionMatrix);
    this._inverseViewProjectionMatrix.inverseOf(this._viewProjectionMatrix);
    this._frustum.update(this._viewProjectionMatrix, this._inverseViewProjectionMatrix);
    this._viewProjectionMatrixInvalid = false;
};

/**
 * @ignore
 */
Camera.prototype._invalidateProjectionMatrix = function()
{
    this._projectionMatrixDirty = true;
    this._invalidateViewProjectionMatrix();
};

/**
 * @ignore
 */
Camera.prototype._updateProjectionMatrix = function()
{
    throw new Error("Abstract method!");
};

/**
 * @ignore
 */
Camera.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @ignore
 */
Camera.prototype.toString = function()
{
    return "[Camera(name=" + this._name + ")]";
};

/**
 * @classdesc
 * Only used for things like shadow map rendering.
 *
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OrthographicOffCenterCamera()
{
    Camera.call(this);
    this._left = -1;
    this._right = 1;
    this._top = 1;
    this._bottom = -1;
}

OrthographicOffCenterCamera.prototype = Object.create(Camera.prototype);

OrthographicOffCenterCamera.prototype.setBounds = function(left, right, top, bottom)
{
    this._left = left;
    this._right = right;
    this._top = top;
    this._bottom = bottom;
    this._invalidateProjectionMatrix();
};

OrthographicOffCenterCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.fromOrthographicOffCenterProjection(this._left, this._right, this._top, this._bottom, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};

/**
 * @classdesc
 * WriteOnlyDepthBuffer is a depth buffer that can be used with {@linkcode FrameBuffer} as a depth buffer if read-backs
 * are not required.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function WriteOnlyDepthBuffer()
{
    this._renderBuffer = GL.gl.createRenderbuffer();
    this._format = null;
}

WriteOnlyDepthBuffer.prototype = {
    /**
     * The width of the depth buffer.
     */
    get width() { return this._width; },

    /**
     * The height of the depth buffer.
     */
    get height() { return this._height; },

    /**
     * The format of the depth buffer.
     */
    get format() { return this._format; },

    /**
     * Initializes the depth buffer.
     * @param width The width of the depth buffer.
     * @param height The height of the depth buffer.
     * @param stencil Whether or not a stencil buffer is required.
     */
    init: function(width, height, stencil)
    {
        var gl = GL.gl;
        stencil = stencil === undefined? true : stencil;
        this._width = width;
        this._height = height;
        this._format = stencil? gl.DEPTH_STENCIL : gl.DEPTH_COMPONENT16;

        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, this._format, width, height);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }
};

/**
 * @classdesc
 * Rect is a value object describing an axis-aligned rectangle.
 * @param x The x-coordinate of the "top-left" corner.
 * @param y The y-coordinate of the "top-left" corner.
 * @param width The width of the rectangle.
 * @param height The height of the rectangle.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Rect(x, y, width, height)
{
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
}

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
var RenderUtils =
{
    /**
     * @param renderer The actual renderer doing the rendering.
     * @param passType
     * @param renderItems
     * @param data (optional) depending on the type of pass being rendered, data could contain extra stuff to be injected
     * For example. Dynamic dir lights will use this
     * @returns The index for the first unrendered renderItem in the list
     * @private
     */
    renderPass: function (renderer, passType, renderItems, data)
    {
        var len = renderItems.length;
        var activePass = null;
        var lastMesh = null;

        for(var i = 0; i < len; ++i) {
            var renderItem = renderItems[i];
            var material = renderItem.material;
            var pass = material.getPass(passType);
            if (!pass) continue;
            var meshInstance = renderItem.meshInstance;

            if (pass !== activePass) {
                pass.updatePassRenderState(renderItem.camera, renderer, data);
                activePass = pass;
                lastMesh = null;    // need to reset mesh data too
            }

            // make sure renderstate is propagated
            pass.updateInstanceRenderState(renderItem.camera, renderItem, data);

            if (lastMesh !== meshInstance._mesh) {
                meshInstance.updateRenderState(passType);
                lastMesh = meshInstance._mesh;
            }

            var mesh = meshInstance._mesh;
            GL.drawElements(pass._elementType, mesh._numIndices, 0, mesh._indexType);
        }

        GL.setBlendState(null);
        return len;
    }
};

/**
 * @ignore
 * @param light
 * @param shadowMapSize
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CascadeShadowMapRenderer(light, shadowMapSize)
{
    this._light = light;
    this._shadowMapSize = shadowMapSize || 1024;
    this._shadowMapInvalid = true;
    this._fboFront = null;
    this._fboFrontNoDepth = null;
    this._fboBack = null;
    this._depthBuffer = null;   // only used if depth textures aren't supported

    this._shadowMap = this._createShadowBuffer();
    this._blurShader = META.OPTIONS.directionalShadowFilter.blurShader;
    this._shadowBackBuffer = this._blurShader? this._createShadowBuffer() : null;
    this._softness = META.OPTIONS.directionalShadowFilter.softness ? META.OPTIONS.directionalShadowFilter.softness : .002;

    this._shadowMatrices = [ new Matrix4x4(), new Matrix4x4(), new Matrix4x4(), new Matrix4x4() ];
    this._transformToUV = [ new Matrix4x4(), new Matrix4x4(), new Matrix4x4(), new Matrix4x4() ];
    this._inverseLightMatrix = new Matrix4x4();
    this._splitRatios = null;
    this._splitDistances = null;
    this._shadowMapCameras = null;
    this._collectorCamera = new OrthographicOffCenterCamera();
    this._maxZ = 0;
    this._numCullPlanes = 0;
    this._cullPlanes = [];
    this._localBounds = new BoundingAABB();
    this._casterCollector = new CascadeShadowCasterCollector();

    this._initSplitProperties();
    this._initCameras();

    this._viewports = [];
}

CascadeShadowMapRenderer.prototype =
{
    get shadowMapSize()
    {
        return this._shadowMapSize;
    },

    set shadowMapSize(value)
    {
        if (this._shadowMapSize === value) return;
        this._shadowMapSize = value;
        this._invalidateShadowMap();
    },

    render: function(viewCamera, scene)
    {
        if (this._shadowMapInvalid)
            this._initShadowMap();

        this._inverseLightMatrix.inverseAffineOf(this._light.worldMatrix);
        this._updateCollectorCamera(viewCamera);
        this._updateSplits(viewCamera);
        this._updateCullPlanes(viewCamera);
        this._collectShadowCasters(scene);
        this._updateCascadeCameras(viewCamera, this._casterCollector.getBounds());

        GL.setRenderTarget(this._fboFront);
        var gl = GL.gl;

        var passType = MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS;
        GL.setClearColor(Color.WHITE);
        GL.clear();

        var numCascades = META.OPTIONS.numShadowCascades;

        for (var cascadeIndex = 0; cascadeIndex < numCascades; ++cascadeIndex) {
            var viewport = this._viewports[cascadeIndex];
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
            RenderUtils.renderPass(this, passType, this._casterCollector.getRenderList(cascadeIndex));
        }

        GL.setColorMask(true);

        if (this._blurShader)
            this._blur();

        GL.setRenderTarget();

        GL.setClearColor(Color.BLACK);
    },

    _updateCollectorCamera: function(viewCamera)
    {
        var corners = viewCamera.frustum._corners;
        var min = new Float4();
        var max = new Float4();
        var tmp = new Float4();

        this._inverseLightMatrix.transformPoint(corners[0], min);
        max.copyFrom(min);

        for (var i = 1; i < 8; ++i) {
            this._inverseLightMatrix.transformPoint(corners[i], tmp);
            min.minimize(tmp);
            max.maximize(tmp);
        }

        this._maxZ = max.z;

        this._collectorCamera.matrix.copyFrom(this._light.worldMatrix);
        this._collectorCamera._invalidateWorldMatrix();
        this._collectorCamera.setBounds(min.x, max.x + 1, max.y + 1, min.y);
        this._collectorCamera._setRenderTargetResolution(this._shadowMap._width, this._shadowMap._height);
    },

    _updateSplits: function(viewCamera)
    {
        return function(viewCamera) {
            var nearDist = viewCamera.nearDistance;
            var frustumRange = viewCamera.farDistance - nearDist;
            var numCascades = META.OPTIONS.numShadowCascades;

            for (var i = 0; i < numCascades; ++i) {
                this._splitDistances[i] = nearDist + this._splitRatios[i] * frustumRange;
            }
        }
    }(),

    _updateCascadeCameras: function(viewCamera, bounds)
    {
        this._localBounds.transformFrom(bounds, this._inverseLightMatrix);

        var minBound = this._localBounds.minimum;
        var maxBound = this._localBounds.maximum;

        var scaleSnap = 1.0;	// always scale snap to a meter

        var localNear = new Float4();
        var localFar = new Float4();
        var min = new Float4();
        var max = new Float4();

        var corners = viewCamera.frustum.corners;

        // camera distances are suboptimal? need to constrain to local near too?

        var nearRatio = 0;
        var numCascades = META.OPTIONS.numShadowCascades;
        for (var cascade = 0; cascade < numCascades; ++cascade) {
            var farRatio = this._splitRatios[cascade];
            var camera = this._shadowMapCameras[cascade];

            camera.matrix = this._light.worldMatrix;

            // figure out frustum bound
            for (var i = 0; i < 4; ++i) {
                var nearCorner = corners[i];
                var farCorner = corners[i + 4];

                var nx = nearCorner.x;
                var ny = nearCorner.y;
                var nz = nearCorner.z;
                var dx = farCorner.x - nx;
                var dy = farCorner.y - ny;
                var dz = farCorner.z - nz;
                localNear.x = nx + dx*nearRatio;
                localNear.y = ny + dy*nearRatio;
                localNear.z = nz + dz*nearRatio;
                localFar.x = nx + dx*farRatio;
                localFar.y = ny + dy*farRatio;
                localFar.z = nz + dz*farRatio;

                this._inverseLightMatrix.transformPoint(localNear, localNear);
                this._inverseLightMatrix.transformPoint(localFar, localFar);

                if (i === 0) {
                    min.copyFrom(localNear);
                    max.copyFrom(localNear);
                }
                else {
                    min.minimize(localNear);
                    max.maximize(localNear);
                }

                min.minimize(localFar);
                max.maximize(localFar);
            }

            nearRatio = farRatio;

            // do not render beyond range of view camera or scene depth
            max.z = Math.min(this._maxZ, max.z);

            var left = Math.max(min.x, minBound.x);
            var right = Math.min(max.x, maxBound.x);
            var bottom = Math.max(min.y, minBound.y);
            var top = Math.min(max.y, maxBound.y);

            var width = right - left;
            var height = top - bottom;

            width = Math.ceil(width / scaleSnap) * scaleSnap;
            height = Math.ceil(height / scaleSnap) * scaleSnap;
            width = Math.max(width, scaleSnap);
            height = Math.max(height, scaleSnap);

            // snap to pixels
            var offsetSnapX = this._shadowMap._width / width * .5;
            var offsetSnapY = this._shadowMap._height / height * .5;

            left = Math.floor(left * offsetSnapX) / offsetSnapX;
            bottom = Math.floor(bottom * offsetSnapY) / offsetSnapY;
            right = left + width;
            top = bottom + height;

            var softness = this._softness;

            camera.setBounds(left - softness, right + softness, top + softness, bottom - softness);

            // cannot clip nearDistance to frustum, because casters in front may cast into this frustum
            camera.nearDistance = minBound.z;
            camera.farDistance = max.z;

            camera._setRenderTargetResolution(this._shadowMap._width, this._shadowMap._height);

            this._shadowMatrices[cascade].multiply(this._transformToUV[cascade], camera.viewProjectionMatrix);
        }
    },

    _updateCullPlanes: function(viewCamera)
    {
        var frustum = this._collectorCamera.frustum;
        var planes = frustum._planes;

        for (var i = 0; i < 4; ++i)
            this._cullPlanes[i] = planes[i];

        this._numCullPlanes = 4;

        frustum = viewCamera.frustum;
        planes = frustum._planes;

        var dir = this._light.direction;

        for (var j = 0; j < 6; ++j) {
            var plane = planes[j];

            // view frustum planes facing away from the light direction mark a boundary beyond which no shadows need to be known
            if (plane.dot3(dir) > 0.001)
                this._cullPlanes[this._numCullPlanes++] = plane;
        }
    },

    _collectShadowCasters: function(scene)
    {
        // this._casterCollector.setSplitPlanes(this._splitPlanes);
        this._casterCollector.setCullPlanes(this._cullPlanes, this._numCullPlanes);
        this._casterCollector.setRenderCameras(this._shadowMapCameras);
        this._casterCollector.collect(this._collectorCamera, scene);
    },

    get splitDistances()
    {
        return this._splitDistances;
    },

    /**
     * The ratios that define every cascade's split distance. Reset when numCascades change. 1 is at the far plane, 0 is at the near plane.
     * @param r1
     * @param r2
     * @param r3
     * @param r4
     */
    setSplitRatios: function(r1, r2, r3, r4)
    {
        this._splitRatios[0] = r1;
        this._splitRatios[1] = r2;
        this._splitRatios[2] = r3;
        this._splitRatios[3] = r4;
    },

    getShadowMatrix: function(cascade)
    {
        return this._shadowMatrices[cascade];
    },

    _invalidateShadowMap: function()
    {
        this._shadowMapInvalid = true;
    },

    _initShadowMap: function()
    {
        var numCascades = META.OPTIONS.numShadowCascades;
        var numMapsW = numCascades > 1? 2 : 1;
        var numMapsH = Math.ceil(numCascades / 2);

        var texWidth = this._shadowMapSize * numMapsW;
        var texHeight = this._shadowMapSize * numMapsH;

        this._shadowMap.initEmpty(texWidth, texHeight, META.OPTIONS.directionalShadowFilter.getShadowMapFormat(), META.OPTIONS.directionalShadowFilter.getShadowMapDataType());
        if (!this._depthBuffer) this._depthBuffer = new WriteOnlyDepthBuffer();
        if (!this._fboFront) this._fboFront = new FrameBuffer(this._shadowMap, this._depthBuffer);

        this._depthBuffer.init(texWidth, texHeight, false);
        this._fboFront.init();
        this._shadowMapInvalid = false;

        if (this._shadowBackBuffer) {
            this._shadowBackBuffer.initEmpty(texWidth, texHeight, META.OPTIONS.directionalShadowFilter.getShadowMapFormat(), META.OPTIONS.directionalShadowFilter.getShadowMapDataType());
            if (!this._fboBack) {
                this._fboFrontNoDepth = new FrameBuffer(this._shadowMap);
                this._fboBack = new FrameBuffer(this._shadowBackBuffer);
            }
            this._fboFrontNoDepth.init();
            this._fboBack.init();
        }

        this._viewports = [];
        this._viewports.push(new Rect(0, 0, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new Rect(this._shadowMapSize, 0, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new Rect(0, this._shadowMapSize, this._shadowMapSize, this._shadowMapSize));
        this._viewports.push(new Rect(this._shadowMapSize, this._shadowMapSize, this._shadowMapSize, this._shadowMapSize));

        this._initViewportMatrices(1.0 / numMapsW, 1.0 / numMapsH);
    },

    _initSplitProperties: function()
    {
        var ratio = 1.0;
        this._splitRatios = [];
        this._splitDistances = [];
        // this._splitPlanes = [];

        for (var i = META.OPTIONS.numShadowCascades - 1; i >= 0; --i)
        {
            this._splitRatios[i] = ratio;
            // this._splitPlanes[i] = new Float4();
            this._splitDistances[i] = 0;
            ratio *= .5;
        }
    },

    _initCameras: function()
    {
        this._shadowMapCameras = [];
        for (var i = 0; i < META.OPTIONS.numShadowCascades; ++i)
        {
            this._shadowMapCameras[i] = new OrthographicOffCenterCamera();
        }
    },

    _initViewportMatrices: function(scaleW, scaleH)
    {
        var halfVec = new Float4(.5,.5,.5);
        for (var i = 0; i < 4; ++i) {
            // transform [-1, 1] to [0 - 1] (also for Z)
            this._transformToUV[i].fromScale(.5);
            this._transformToUV[i].appendTranslation(halfVec);

            // transform to tiled size
            this._transformToUV[i].appendScale(scaleW, scaleH, 1.0);
        }

        this._transformToUV[1].appendTranslation(new Float4(0.5, 0.0, 0.0));
        this._transformToUV[2].appendTranslation(new Float4(0.0, 0.5, 0.0));
        this._transformToUV[3].appendTranslation(new Float4(0.5, 0.5, 0.0));
    },

    _createShadowBuffer: function()
    {
        var tex = new Texture2D();
        //tex.filter = TextureFilter.NEAREST_NOMIP;
        // while filtering doesn't actually work on encoded values, it looks much better this way since at least it can filter
        // the MSB, which is useful for ESM etc
        tex.filter = TextureFilter.BILINEAR_NOMIP;
        tex.wrapMode = TextureWrapMode.CLAMP;
        return tex;
    },

    _blur: function()
    {
        var shader = this._blurShader;
        var numPasses = META.OPTIONS.directionalShadowFilter.numBlurPasses;

        for (var i = 0; i < numPasses; ++i) {
            GL.setRenderTarget(this._fboBack);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._shadowMap, 1.0 / this._shadowMapSize, 0.0);

            GL.setRenderTarget(this._fboFrontNoDepth);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._shadowBackBuffer, 0.0, 1.0 / this._shadowMapSize);
        }
    }
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DeferredDirectionalShader(shadows)
{
    Shader.call(this);
    var defines = {};
    if (shadows) {
        defines.HX_SHADOW_MAP = 1;
    }

    var vertex = ShaderLibrary.get("deferred_dir_light_vertex.glsl", defines);
    var fragment =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        META.OPTIONS.deferredLightingModel + "\n\n\n" +
        META.OPTIONS.directionalShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("directional_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_dir_light_fragment.glsl");

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._colorLocation = gl.getUniformLocation(p, "hx_directionalLight.color");
    this._dirLocation = gl.getUniformLocation(p, "hx_directionalLight.direction");

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);

    if (shadows) {
        this._shadowMatricesLocation = gl.getUniformLocation(p, "hx_directionalLight.shadowMapMatrices[0]");
        this._shadowSplitsLocation = gl.getUniformLocation(p, "hx_directionalLight.splitDistances");
        this._depthBiasLocation = gl.getUniformLocation(p, "hx_directionalLight.depthBias");
        this._maxShadowDistanceLocation = gl.getUniformLocation(p, "hx_directionalLight.maxShadowDistance");
        var shadowMapSlot = gl.getUniformLocation(p, "hx_shadowMap");
        var ditherSlot = gl.getUniformLocation(p, "hx_dither2D");
        gl.uniform1i(shadowMapSlot, 3);
        gl.uniform1i(ditherSlot, 4);
    }
}

DeferredDirectionalShader.prototype = Object.create(Shader.prototype);

DeferredDirectionalShader.prototype.execute = function(renderer, light)
{
    var dir = new Float4();
    var matrix = new Matrix4x4();
    var matrixData = new Float32Array(64);

    return function(renderer, light) {
        var gl = GL.gl;

        gl.useProgram(this._program);

        var texs = renderer._gbuffer.textures;
        texs[0].bind(0);
        texs[1].bind(1);
        texs[2].bind(2);

        var camera = renderer._camera;
        var col = light._scaledIrradiance;

        camera.viewMatrix.transformVector(light.direction, dir);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._dirLocation, dir.x, dir.y, dir.z);

        if (light._castShadows) {
            var shadowRenderer = light._shadowMapRenderer;
            shadowRenderer._shadowMap.bind(3);

            var numCascades = META.OPTIONS.numShadowCascades;
            var splits = shadowRenderer._splitDistances;
            var k = 0;

            for (var j = 0; j < numCascades; ++j) {
                matrix.multiply(shadowRenderer.getShadowMatrix(j), camera.worldMatrix);
                var m = matrix._m;
                for (var l = 0; l < 16; ++l) {
                    matrixData[k++] = m[l];
                }
            }

            gl.uniformMatrix4fv(this._shadowMatricesLocation, false, matrixData);
            gl.uniform4f(this._shadowSplitsLocation, splits[0], splits[1], splits[2], splits[3]);
            gl.uniform1f(this._depthBiasLocation, light.depthBias);
            gl.uniform1f(this._maxShadowDistanceLocation, splits[numCascades - 1]);

            DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.bind(4);
        }

        GL.setCullMode(CullMode.NONE);

        this.updatePassRenderState(camera, renderer);

        var rect = RectMesh.DEFAULT;
        rect._vertexBuffers[0].bind();
        rect._indexBuffer.bind();

        gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

        GL.enableAttributes(2);

        GL.drawElements(ElementType.TRIANGLES, 6, 0);
    }
}();

/**
 * @classdesc
 * DirectionalLight represents a light source that is "infinitely far away", used as an approximation for sun light where
 * locally all sun rays appear to be parallel.
 *
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 * @property {number} shadowMapSize The shadow map size used by this light.
 * @property {Float4} direction The direction in *world space* of the light rays. This cannot be set per component but
 * needs to be assigned as a whole Float4.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DirectionalLight()
{
    Light.call(this);

    if (!DirectionalLight._deferredShader && META.OPTIONS.deferredLightingModel)
        DirectionalLight._initDeferredShaders();

    this.depthBias = .0;
    this._shadowMapSize = 1024;
    this._shadowMapRenderer = null;
    this.direction = new Float4(-1.0, -1.0, -1.0, 0.0);
    // this is just a storage vector
    this._direction = new Float4();
}

/**
 * @ignore
 * @private
 */
DirectionalLight._initDeferredShaders = function()
{
    DirectionalLight._deferredShader = new DeferredDirectionalShader(false);
    DirectionalLight._deferredShadowShader = new DeferredDirectionalShader(true);
};

DirectionalLight.prototype = Object.create(Light.prototype,
    {
        castShadows: {
            get: function()
            {
                return this._castShadows;
            },

            set: function(value)
            {
                if (this._castShadows === value) return;

                this._castShadows = value;

                if (value) {
                    this._shadowMapRenderer = new CascadeShadowMapRenderer(this, this._shadowMapSize);
                }
                else {
                    this._shadowMapRenderer = null;
                }
            }
        },

        shadowMapSize: {
            get: function()
            {
                return this._shadowMapSize;
            },

            set: function(value)
            {
                this._shadowMapSize = value;
                if (this._shadowMapRenderer) this._shadowMapRenderer.shadowMapSize = value;
            }
        },

        direction: {
            get: function()
            {
                var dir = this._direction;
                this.worldMatrix.getColumn(2, dir);
                return dir;
            },

            set: function(value)
            {
                var matrix = new Matrix4x4();
                var position = this.worldMatrix.getColumn(3);
                var target = Float4.add(value, position);
                matrix.lookAt(target, position, Float4.Y_AXIS);
                this.matrix = matrix;
            }
        }
    });

/**
 * The ratios that define every shadow cascade's split distance. Reset when numCascades change. 1 is at the far plane, 0 is at the near plane. Passing more than InitOptions.numShadowCascades has no effect.
 */
DirectionalLight.prototype.setCascadeRatios = function(r1, r2, r3, r4)
{
    this._shadowMapRenderer.setSplitRatios(r1, r2, r3, r4);
};

/**
 * @ignore
 */
DirectionalLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @ignore
 */
DirectionalLight.prototype.renderDeferredLighting = function(renderer)
{
    var shader = this._castShadows? DirectionalLight._deferredShadowShader : DirectionalLight._deferredShader;
    shader.execute(renderer, this);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @param shadows
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ForwardLitDirPass(geometryVertex, geometryFragment, lightingModel, shadows)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel, shadows));

    this._colorLocation = this.getUniformLocation("hx_directionalLight.color");
    this._dirLocation = this.getUniformLocation("hx_directionalLight.direction");

    if (shadows) {
        this._shadowMatricesLocation = this.getUniformLocation("hx_directionalLight.shadowMapMatrices[0]");
        this._shadowSplitsLocation = this.getUniformLocation("hx_directionalLight.splitDistances");
        this._depthBiasLocation = this.getUniformLocation("hx_directionalLight.depthBias");
        this._maxShadowDistanceLocation = this.getUniformLocation("hx_directionalLight.maxShadowDistance");
        this._shadowMapSlot = this.getTextureSlot("hx_shadowMap");
    }
}

ForwardLitDirPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitDirPass.prototype.updatePassRenderState = function(camera, renderer, light)
{
    var dir = new Float4();
    var matrix = new Matrix4x4();
    var matrixData = new Float32Array(64);

    return function(camera, renderer, light) {
        var gl = GL.gl;
        var col = light._scaledIrradiance;

        gl.useProgram(this._shader._program);

        camera.viewMatrix.transformVector(light.direction, dir);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._dirLocation, dir.x, dir.y, dir.z);


        if (light.castShadows) {
            var shadowRenderer = light._shadowMapRenderer;
            var numCascades = META.OPTIONS.numShadowCascades;
            var splits = shadowRenderer._splitDistances;
            var k = 0;

            this._shadowMapSlot.texture = shadowRenderer._shadowMap;

            for (var j = 0; j < numCascades; ++j) {
                matrix.multiply(shadowRenderer.getShadowMatrix(j), camera.worldMatrix);
                var m = matrix._m;
                for (var l = 0; l < 16; ++l) {
                    matrixData[k++] = m[l];
                }
            }

            gl.uniformMatrix4fv(this._shadowMatricesLocation, false, matrixData);
            gl.uniform4f(this._shadowSplitsLocation, splits[0], splits[1], splits[2], splits[3]);
            gl.uniform1f(this._depthBiasLocation, light.depthBias);
            gl.uniform1f(this._maxShadowDistanceLocation, splits[numCascades - 1]);
        }

        MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
    }
}();

ForwardLitDirPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel, shadows)
{
    var defines = {};

    if (shadows) {
        defines.HX_SHADOW_MAP = 1;
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_dir_vertex.glsl", defines);

    var fragmentShader =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.directionalShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("directional_light.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_dir_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ForwardLitPointPass(geometryVertex, geometryFragment, lightingModel, shadows)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel, shadows));

    this._colorLocation = this.getUniformLocation("hx_pointLight.color");
    this._posLocation = this.getUniformLocation("hx_pointLight.position");
    this._radiusLocation = this.getUniformLocation("hx_pointLight.radius");
    this._rcpRadiusLocation = this.getUniformLocation("hx_pointLight.rcpRadius");

    if (shadows) {
        this._depthBiasLocation = this.getUniformLocation("hx_pointLight.depthBias");
        this._shadowMatrixLocation = this.getUniformLocation("hx_pointLight.shadowMapMatrix");
        this._shadowMapSlot = this.getTextureSlot("hx_shadowMap");
    }
}

ForwardLitPointPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitPointPass.prototype.updatePassRenderState = function(camera, renderer, light)
{
    var pos = new Float4();

    return function(camera, renderer, light) {
        var gl = GL.gl;
        var col = light._scaledIrradiance;

        gl.useProgram(this._shader._program);

        light.worldMatrix.getColumn(3, pos);
        camera.viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);
        gl.uniform1f(this._radiusLocation, light._radius);
        gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);

        MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);

        if (light.castShadows) {
            var shadowRenderer = light._shadowMapRenderer;
            gl.uniform1f(this._depthBiasLocation, light.depthBias);
            this._shadowMapSlot.texture = shadowRenderer._shadowMap;

            gl.uniformMatrix4fv(this._shadowMatrixLocation, false, camera.worldMatrix._m);
        }
    }
}();

ForwardLitPointPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel, shadows)
{
    var defines = {};

    if (shadows) {
        defines.HX_SHADOW_MAP = 1;
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_point_vertex.glsl", defines);

    var fragmentShader =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.pointShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_point_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ForwardLitSpotPass(geometryVertex, geometryFragment, lightingModel, shadows)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel, shadows));

    this._colorLocation = this.getUniformLocation("hx_spotLight.color");
    this._posLocation = this.getUniformLocation("hx_spotLight.position");
    this._radiusLocation = this.getUniformLocation("hx_spotLight.radius");
    this._anglesLocation = this.getUniformLocation("hx_spotLight.angleData");
    this._dirLocation = this.getUniformLocation("hx_spotLight.direction");
    this._rcpRadiusLocation = this.getUniformLocation("hx_spotLight.rcpRadius");

    if (shadows) {
        this._depthBiasLocation = this.getUniformLocation("hx_spotLight.depthBias");
        this._shadowMatrixLocation = this.getUniformLocation("hx_spotLight.shadowMapMatrix");
        this._shadowMapSlot = this.getTextureSlot("hx_shadowMap");
    }
}

ForwardLitSpotPass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitSpotPass.prototype.updatePassRenderState = function(camera, renderer, light)
{
    var pos = new Float4();
    var matrix = new Matrix4x4();

    return function(camera, renderer, light) {
        var gl = GL.gl;
        var col = light._scaledIrradiance;

        gl.useProgram(this._shader._program);

        var worldMatrix = light.worldMatrix;
        var viewMatrix = camera.viewMatrix;
        worldMatrix.getColumn(3, pos);
        viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);

        worldMatrix.getColumn(2, pos);
        viewMatrix.transformVector(pos, pos);
        gl.uniform3f(this._dirLocation, pos.x, pos.y, pos.z);

        gl.uniform1f(this._radiusLocation, light._radius);
        gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);
        gl.uniform2f(this._anglesLocation, light._cosOuter, 1.0 / Math.max((light._cosInner - light._cosOuter), .00001));

        if (light.castShadows) {
            var shadowRenderer = light._shadowMapRenderer;
            gl.uniform1f(this._depthBiasLocation, light.depthBias);
            matrix.multiply(shadowRenderer.shadowMatrix, camera.worldMatrix);
            gl.uniformMatrix4fv(this._shadowMatrixLocation, false, matrix._m);

            this._shadowMapSlot.texture = shadowRenderer._shadowMap;
        }

        MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
    }
}();

ForwardLitSpotPass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel, shadows)
{
    var defines = {};

    if (shadows) {
        defines.HX_SHADOW_MAP = 1;
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_spot_vertex.glsl", defines);

    var fragmentShader =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.spotShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_spot_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @param lightingModel
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ForwardLitProbePass(geometryVertex, geometryFragment, lightingModel)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel));
    this._diffuseSlot = this.getTextureSlot("hx_diffuseProbeMap");
    this._specularSlot = this.getTextureSlot("hx_specularProbeMap");
    this._numMipsLocation = this.getUniformLocation("hx_specularProbeNumMips");
    this._localLocation = this.getUniformLocation("hx_probeLocal");
    this._sizeLocation = this.getUniformLocation("hx_probeSize");
    this._positionLocation = this.getUniformLocation("hx_probePosition");
}

ForwardLitProbePass.prototype = Object.create(MaterialPass.prototype);

// the light is passed in as data
ForwardLitProbePass.prototype.updatePassRenderState = function(camera, renderer, probe)
{
    var gl = GL.gl;
    gl.useProgram(this._shader._program);

    // TODO: allow setting locality of probes
    this._diffuseSlot.texture = probe.diffuseTexture || DEFAULTS.DARK_CUBE_TEXTURE;
    var specularTex = probe.specularTexture || DEFAULTS.DARK_CUBE_TEXTURE;

    this._specularSlot.texture = specularTex;
    gl.uniform1f(this._numMipsLocation, Math.floor(MathX.log2(specularTex.size)));
    gl.uniform1f(this._localLocation, probe._size? 1.0 : 0.0);
    gl.uniform1f(this._sizeLocation, probe._size || 0.0);
    var m = probe.worldMatrix._m;
    gl.uniform3f(this._positionLocation, m[12], m[13], m[14]);
    MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
};

ForwardLitProbePass.prototype._generateShader = function(geometryVertex, geometryFragment, lightingModel)
{
    var extensions = "";
    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_probe_vertex.glsl");

    var fragmentShader =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        lightingModel + "\n\n\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_probe_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @classdesc
 * SpherePrimitive provides a primitive cylinder {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>radius: The radius of the sphere</li>
 *     <li>invert: Whether or not the faces should point inwards</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpherePrimitive(definition)
{
    Primitive.call(this, definition);
}

SpherePrimitive.prototype = Object.create(Primitive.prototype);

SpherePrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var numSegmentsW = definition.numSegmentsW || 16;
    var numSegmentsH = definition.numSegmentsH || 10;
    var radius = definition.radius || .5;

    var flipSign = definition.invert? -1 : 1;

    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    for (var polarSegment = 0; polarSegment <= numSegmentsH; ++polarSegment) {
        var ratioV = polarSegment * rcpNumSegmentsH;
        var theta = ratioV * Math.PI;

        var y = -Math.cos(theta);
        var segmentUnitRadius = Math.sin(theta);

        if (flipSign < 0) ratioV = 1.0 - ratioV;

        for (var azimuthSegment = 0; azimuthSegment <= numSegmentsW; ++azimuthSegment) {
            var ratioU = azimuthSegment * rcpNumSegmentsW;
            var phi = ratioU * Math.PI * 2.0;

            if (flipSign) ratioU = 1.0 - ratioU;

            var normalX = Math.cos(phi) * segmentUnitRadius * flipSign;
            var normalY = y * flipSign;
            var normalZ = Math.sin(phi) * segmentUnitRadius * flipSign;

            // position
            positions.push(normalX*radius, normalY*radius, normalZ*radius);

            if (normals)
                normals.push(normalX * flipSign, normalY * flipSign, normalZ * flipSign);

            if (uvs)
                uvs.push(ratioU, ratioV);
        }
    }

    var indices = target.indices;

    for (polarSegment = 0; polarSegment < numSegmentsH; ++polarSegment) {
        for (azimuthSegment = 0; azimuthSegment < numSegmentsW; ++azimuthSegment) {
            var w = numSegmentsW + 1;
            var base = azimuthSegment + polarSegment*w;

            indices.push(base, base + w + 1, base + w);
            indices.push(base, base + 1, base + w + 1);

            if (doubleSided) {
                indices.push(base, base + w, base + w + 1);
                indices.push(base, base + w + 1, base + 1);
            }
        }
    }
};

/**
 * @classdesc
 * BoundingAABB represents a bounding sphere.
 *
 * @constructor
 *
 * @extends BoundingVolume
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BoundingSphere()
{
    BoundingVolume.call(this, BoundingSphere);
}

BoundingSphere.prototype = Object.create(BoundingVolume.prototype);

/**
 * Sets the center and radius explicitly.
 */
BoundingSphere.prototype.setExplicit = function(center, radius)
{
    this._center.copyFrom(center);
    this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    this._expanse = BoundingVolume.EXPANSE_FINITE;
    this._updateMinAndMax();
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.growToIncludeMesh = function(mesh)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    var attribute = mesh.getVertexAttributeByName("hx_position");
    var index = attribute.offset;
    var stride = mesh.getVertexStride(attribute.streamIndex);
    var vertices = mesh.getVertexData(attribute.streamIndex);
    var len = vertices.length;
    var minX, minY, minZ;
    var maxX, maxY, maxZ;

    if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        maxX = minX = vertices[index];
        maxY = minY = vertices[index + 1];
        maxZ = minZ = vertices[index + 2];
        index += stride;
    }
    else {
        minX = this._minimumX; minY = this._minimumY; minZ = this._minimumZ;
        maxX = this._maximumX; maxY = this._maximumY; maxZ = this._maximumZ;
    }

    for (; index < len; index += stride) {
        var x = vertices[index];
        var y = vertices[index + 1];
        var z = vertices[index + 2];

        if (x > maxX) maxX = x;
        else if (x < minX) minX = x;
        if (y > maxY) maxY = y;
        else if (y < minY) minY = y;
        if (z > maxZ) maxZ = z;
        else if (z < minZ) minZ = z;
    }
    var centerX = (maxX + minX) * .5;
    var centerY = (maxY + minY) * .5;
    var centerZ = (maxZ + minZ) * .5;
    var maxSqrRadius = 0.0;

    index = attribute.offset;
    for (; index < len; index += stride) {
        var dx = centerX - vertices[index];
        var dy = centerY - vertices[index + 1];
        var dz = centerZ - vertices[index + 2];
        var sqrRadius = dx*dx + dy*dy + dz*dz;
        if (sqrRadius > maxSqrRadius) maxSqrRadius = sqrRadius;
    }

    this._center.x = centerX;
    this._center.y = centerY;
    this._center.z = centerZ;

    var radius = Math.sqrt(maxSqrRadius);
    this._halfExtentX = radius;
    this._halfExtentY = radius;
    this._halfExtentZ = radius;

    this._expanse = BoundingVolume.EXPANSE_FINITE;

    this._updateMinAndMax();
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.growToIncludeBound = function(bounds)
{
    if (bounds._expanse === BoundingVolume.EXPANSE_EMPTY ||
        bounds._expanse === BoundingVolume.EXPANSE_INHERIT ||
        this._expanse === BoundingVolume.EXPANSE_INFINITE) return;

    if (bounds._expanse === BoundingVolume.EXPANSE_INFINITE)
        this._expanse = BoundingVolume.EXPANSE_INFINITE;

    else if (this._expanse === BoundingVolume.EXPANSE_EMPTY) {
        this._center.x = bounds._center.x;
        this._center.y = bounds._center.y;
        this._center.z = bounds._center.z;
        if (bounds._type === this._type) {
            this._halfExtentX = bounds._halfExtentX;
            this._halfExtentY = bounds._halfExtentY;
            this._halfExtentZ = bounds._halfExtentZ;
        }
        else {
            this._halfExtentX = this._halfExtentY = this._halfExtentZ = bounds.getRadius();
        }
        this._expanse = BoundingVolume.EXPANSE_FINITE;
    }

    else {
        var minX = this._minimumX; var minY = this._minimumY; var minZ = this._minimumZ;
        var maxX = this._maximumX; var maxY = this._maximumY; var maxZ = this._maximumZ;

        if (bounds._maximumX > maxX)
            maxX = bounds._maximumX;
        if (bounds._maximumY > maxY)
            maxY = bounds._maximumY;
        if (bounds._maximumZ > maxZ)
            maxZ = bounds._maximumZ;
        if (bounds._minimumX < minX)
            minX = bounds._minimumX;
        if (bounds._minimumY < minY)
            minY = bounds._minimumY;
        if (bounds._minimumZ < minZ)
            minZ = bounds._minimumZ;

        this._center.x = (minX + maxX) * .5;
        this._center.y = (minY + maxY) * .5;
        this._center.z = (minZ + maxZ) * .5;

        var dx = maxX - this._center.x;
        var dy = maxY - this._center.y;
        var dz = maxZ - this._center.z;
        var radius = Math.sqrt(dx*dx + dy*dy + dz*dz);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;
    }

    this._updateMinAndMax();
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.growToIncludeMinMax = function(min, max)
{
    // temp solution, not run-time perf critical
    var aabb = new BoundingAABB();
    aabb.growToIncludeMinMax(min, max);
    this.growToIncludeBound(aabb);
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.getRadius = function()
{
    return this._halfExtentX;
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.transformFrom = function(sourceBound, matrix)
{
    if (sourceBound._expanse === BoundingVolume.EXPANSE_INFINITE || sourceBound._expanse === BoundingVolume.EXPANSE_EMPTY)
        this.clear(sourceBound._expanse);
    else {
        var arr = matrix._m;
        var m00 = arr[0], m10 = arr[1], m20 = arr[2];
        var m01 = arr[4], m11 = arr[5], m21 = arr[6];
        var m02 = arr[8], m12 = arr[9], m22 = arr[10];

        var x = sourceBound._center.x;
        var y = sourceBound._center.y;
        var z = sourceBound._center.z;

        this._center.x = m00 * x + m01 * y + m02 * z + arr[12];
        this._center.y = m10 * x + m11 * y + m12 * z + arr[13];
        this._center.z = m20 * x + m21 * y + m22 * z + arr[14];


        if (m00 < 0) m00 = -m00; if (m10 < 0) m10 = -m10; if (m20 < 0) m20 = -m20;
        if (m01 < 0) m01 = -m01; if (m11 < 0) m11 = -m11; if (m21 < 0) m21 = -m21;
        if (m02 < 0) m02 = -m02; if (m12 < 0) m12 = -m12; if (m22 < 0) m22 = -m22;
        x = sourceBound._halfExtentX;
        y = sourceBound._halfExtentY;
        z = sourceBound._halfExtentZ;

        var hx = m00 * x + m01 * y + m02 * z;
        var hy = m10 * x + m11 * y + m12 * z;
        var hz = m20 * x + m21 * y + m22 * z;

        var radius = Math.sqrt(hx * hx + hy * hy + hz * hz);
        this._halfExtentX = this._halfExtentY = this._halfExtentZ = radius;

        this._minimumX = this._center.x - this._halfExtentX;
        this._minimumY = this._center.y - this._halfExtentY;
        this._minimumZ = this._center.z - this._halfExtentZ;
        this._maximumX = this._center.x + this._halfExtentX;
        this._maximumY = this._center.y + this._halfExtentY;
        this._maximumZ = this._center.z + this._halfExtentZ;

        this._expanse = BoundingVolume.EXPANSE_FINITE;
    }
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.intersectsConvexSolid = function(cullPlanes, numPlanes)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE || this._expanse === BoundingVolume.EXPANSE_INHERIT)
        return true;
    else if (this._expanse === BoundingVolume.EXPANSE_EMPTY)
        return false;

    var centerX = this._center.x, centerY = this._center.y, centerZ = this._center.z;
    var radius = this._halfExtentX;

    for (var i = 0; i < numPlanes; ++i) {
        var plane = cullPlanes[i];
        var signedDist = plane.x * centerX + plane.y * centerY + plane.z * centerZ + plane.w;

        if (signedDist > radius)
            return false;
    }

    return true;
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.intersectsBound = function(bounds)
{
    if (this._expanse === BoundingVolume.EXPANSE_EMPTY || bounds._expanse === BoundingVolume.EXPANSE_EMPTY)
        return false;

    if (this._expanse === BoundingVolume.EXPANSE_INFINITE || bounds._expanse === BoundingVolume.EXPANSE_INFINITE || this._expanse === BoundingVolume.EXPANSE_INHERIT || bounds._expanse === BoundingVolume.EXPANSE_INHERIT)
        return true;

    // both Spheres
    if (bounds._type === this._type) {
        var dx = this._center.x - bounds._center.x;
        var dy = this._center.y - bounds._center.y;
        var dz = this._center.z - bounds._center.z;
        var touchDistance = this._halfExtentX + bounds._halfExtentX;
        return dx*dx + dy*dy + dz*dz < touchDistance*touchDistance;
    }
    else
        return BoundingVolume._testAABBToSphere(bounds, this);
};

/**
 * @inheritDoc
 */
BoundingSphere.prototype.classifyAgainstPlane = function(plane)
{
    var dist = plane.x * this._center.x + plane.y * this._center.y + plane.z * this._center.z + plane.w;
    var radius = this._halfExtentX;
    if (dist > radius) return PlaneSide.FRONT;
    else if (dist < -radius) return PlaneSide.BACK;
    else return PlaneSide.INTERSECTING;
};

/**
 * @ignore
 * @private
 */
BoundingSphere.prototype._updateMinAndMax = function()
{
    var centerX = this._center.x, centerY = this._center.y, centerZ = this._center.z;
    var radius = this._halfExtentX;
    this._minimumX = centerX - radius;
    this._minimumY = centerY - radius;
    this._minimumZ = centerZ - radius;
    this._maximumX = centerX + radius;
    this._maximumY = centerY + radius;
    this._maximumZ = centerZ + radius;
};

/**
 * @ignore
 */
BoundingSphere.prototype.intersectsRay = function(ray)
{
    if (this._expanse === BoundingVolume.EXPANSE_INFINITE) return true;
    if (this._expanse === BoundingVolume.EXPANSE_EMPTY || this._expanse === BoundingVolume.EXPANSE_INHERIT) return false;

    var centerX = this._center.x, centerY = this._center.y, centerZ = this._center.z;
    var radius = this._halfExtentX;
    var o = ray.origin;
    var d = ray.direction;
    var oX = o.x, oY = o.y, oZ = o.z;
    var dirX = d.x, dirY = d.y, dirZ = d.z;
    var diffX = centerX - oX;
    var diffY = centerY - oY;
    var diffZ = centerZ - oZ;

    // project center onto ray
    var dot = diffX * dirX + diffY * dirY + diffZ * dirZ;
    var sqrDist;
    if (dot > 0.0) {
        // projection of c on the line
        var cx = oX + dot * dirX;
        var cy = oY + dot * dirY;
        var cz = oZ + dot * dirZ;
        // vector from projection to center is perpendicular length
        cx = centerX - cx;
        cy = centerY - cy;
        cz = centerZ - cz;
        sqrDist = cx * cx + cy * cy + cz * cz;
    }
    else
        sqrDist = diffX * diffX + diffY * diffY + diffZ * diffZ;

    // larger than the radius, so cannot intersect
    return sqrDist <= radius * radius;
};

/**
 * @ignore
 */
BoundingSphere.prototype.createDebugModel = function()
{
    return new SpherePrimitive({doubleSided:true});
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DeferredPointShader(useSphere, shadows)
{
    Shader.call(this);
    this._useSphere = useSphere;

    var defines = {};

    if (shadows)
        defines.HX_SHADOW_MAP = 1;

    if (useSphere) {
        var primitive = new SpherePrimitive({
            // overshoot a bit
            radius: 1.1
        });
        this._mesh = primitive.getMesh(0);
        defines.HX_SPHERE_MESH = 1;
    }

    var vertex =
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        META.OPTIONS.deferredLightingModel + "\n\n\n" +
        META.OPTIONS.pointShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_point_light_vertex.glsl", defines);
    var fragment =
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        META.OPTIONS.deferredLightingModel + "\n\n\n" +
        META.OPTIONS.pointShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_point_light_fragment.glsl", defines);

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._colorLocation = gl.getUniformLocation(p, "hx_pointLight.color");
    this._posLocation = gl.getUniformLocation(p, "hx_pointLight.position");
    this._radiusLocation = gl.getUniformLocation(p, "hx_pointLight.radius");
    this._rcpRadiusLocation = gl.getUniformLocation(p, "hx_pointLight.rcpRadius");

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);

    if (shadows) {
        this._shadowMatrixLocation = gl.getUniformLocation(p, "hx_pointLight.shadowMapMatrix");
        this._depthBiasLocation = gl.getUniformLocation(p, "hx_pointLight.depthBias");
        var shadowMapSlot = gl.getUniformLocation(p, "hx_shadowMap");
        var ditherSlot = gl.getUniformLocation(p, "hx_dither2D");
        gl.uniform1i(shadowMapSlot, 3);
        gl.uniform1i(ditherSlot, 4);
    }
}

DeferredPointShader.prototype = Object.create(Shader.prototype);

DeferredPointShader.prototype.execute = function(renderer, light)
{
    var pos = new Float4();

    return function(renderer, light) {
        var gl = GL.gl;

        gl.useProgram(this._program);

        var texs = renderer._gbuffer.textures;
        texs[0].bind(0);
        texs[1].bind(1);
        texs[2].bind(2);

        var camera = renderer._camera;
        var col = light._scaledIrradiance;

        light.worldMatrix.getColumn(3, pos);
        camera.viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);
        gl.uniform1f(this._radiusLocation, light._radius);
        gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);

        if (light._castShadows) {
            var shadowRenderer = light._shadowMapRenderer;
            shadowRenderer._shadowMap.bind(3);

            gl.uniformMatrix4fv(this._shadowMatrixLocation, false, camera.worldMatrix._m);
            gl.uniform1f(this._depthBiasLocation, light.depthBias);

            DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.bind(4);
        }

        this.updatePassRenderState(camera, renderer);

        if (this._useSphere) {
            GL.setCullMode(CullMode.FRONT);
            var mesh = this._mesh;
            mesh._vertexBuffers[0].bind();
            mesh._indexBuffer.bind();

            gl.vertexAttribPointer(this._positionAttributeLocation, 3, gl.FLOAT, false, 48, 0);
            GL.enableAttributes(1);
            GL.drawElements(ElementType.TRIANGLES, mesh.numIndices, 0);
        }
        else {
            GL.setCullMode(CullMode.NONE);
            var rect = RectMesh.DEFAULT;
            rect._vertexBuffers[0].bind();
            rect._indexBuffer.bind();

            gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
            gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

            GL.enableAttributes(2);

            GL.drawElements(ElementType.TRIANGLES, 6, 0);
        }
    }
}();

/**
 * @extends Camera
 *
 * @classdesc
 * PerspectiveCamera is a Camera used for rendering with perspective.
 *
 * @property {number} verticalFOV The vertical field of view in radians.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PerspectiveCamera()
{
    Camera.call(this);

    this._vFOV = 1.047198;  // radians!
    this._aspectRatio = 1;
}


PerspectiveCamera.prototype = Object.create(Camera.prototype, {
    verticalFOV: {
        get: function()
        {
            return this._vFOV;
        },
        set: function(value)
        {
            if (this._vFOV === value) return;
            this._vFOV = value;
            this._invalidateProjectionMatrix();
        }
    }
});

/**
 * @ignore
 */
PerspectiveCamera.prototype._setAspectRatio = function(value)
{
    if (this._aspectRatio === value) return;

    this._aspectRatio = value;
    this._invalidateProjectionMatrix();
};

/**
 * @ignore
 */
PerspectiveCamera.prototype._setRenderTargetResolution = function(width, height)
{
    Camera.prototype._setRenderTargetResolution.call(this, width, height);
    this._setAspectRatio(width / height);
};

/**
 * @ignore
 */
PerspectiveCamera.prototype._updateProjectionMatrix = function()
{
    this._projectionMatrix.fromPerspectiveProjection(this._vFOV, this._aspectRatio, this._nearDistance, this._farDistance);
    this._projectionMatrixDirty = false;
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OmniShadowCasterCollector()
{
    SceneVisitor.call(this);
    this._lightBounds = null;
    this._renderLists = [];
    this._renderItemPool = new ObjectPool(RenderItem);
    this._cameraZAxis = new Float4();
    this._octantPlanes = [];
    this._cameraPos = new Float4();

    this._octantPlanes[0] = new Float4(0.0, 1.0, -1.0, 0.0);
    this._octantPlanes[1] = new Float4(1.0, 0.0, -1.0, 0.0);
    this._octantPlanes[2] = new Float4(-1.0, 0.0, -1.0, 0.0);
    this._octantPlanes[3] = new Float4(0.0, -1.0, -1.0, 0.0);
    this._octantPlanes[4] = new Float4(1.0, 1.0, 0.0, 0.0);
    this._octantPlanes[5] = new Float4(-1.0, 1.0, 0.0, 0.0);

    for (var i = 0; i < 6; ++i) {
        this._octantPlanes[i].normalize();
    }
}

OmniShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

OmniShadowCasterCollector.prototype.getRenderList = function(faceIndex) { return this._renderLists[faceIndex]; };

OmniShadowCasterCollector.prototype.setLightBounds = function(value)
{
    this._lightBounds = value;
};

OmniShadowCasterCollector.prototype.collect = function(cameras, scene)
{
    this._cameras = cameras;
    this._renderLists = [];

    var pos = this._cameraPos;
    for (var i = 0; i < 6; ++i) {
        var plane = this._octantPlanes[i];
        plane.w = -(pos.x * plane.x + pos.y * plane.y + pos.z * plane.z);
        this._renderLists[i] = [];
    }

    this._renderItemPool.reset();

    scene.acceptVisitor(this);

    for (i = 0; i < 6; ++i)
        this._renderLists[i].sort(RenderSortFunctions.sortOpaques);
};

OmniShadowCasterCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    if (!modelInstance._castShadows) return;

    // basically, this does 6 frustum tests at once
    var planes = this._octantPlanes;
    var side0 = worldBounds.classifyAgainstPlane(planes[0]);
    var side1 = worldBounds.classifyAgainstPlane(planes[1]);
    var side2 = worldBounds.classifyAgainstPlane(planes[2]);
    var side3 = worldBounds.classifyAgainstPlane(planes[3]);
    var side4 = worldBounds.classifyAgainstPlane(planes[4]);
    var side5 = worldBounds.classifyAgainstPlane(planes[5]);

    if (side1 >= 0 && side2 <= 0 && side4 >= 0 && side5 <= 0)
        this._addTo(modelInstance, 0, worldBounds, worldMatrix);

    if (side1 <= 0 && side2 >= 0 && side4 <= 0 && side5 >= 0)
        this._addTo(modelInstance, 1, worldBounds, worldMatrix);

    if (side0 >= 0 && side3 <= 0 && side4 >= 0 && side5 >= 0)
        this._addTo(modelInstance, 2, worldBounds, worldMatrix);

    if (side0 <= 0 && side3 >= 0 && side4 <= 0 && side5 <= 0)
        this._addTo(modelInstance, 3, worldBounds, worldMatrix);

    if (side0 <= 0 && side1 <= 0 && side2 <= 0 && side3 <= 0)
        this._addTo(modelInstance, 4, worldBounds, worldMatrix);

    if (side0 >= 0 && side1 >= 0 && side2 >= 0 && side3 >= 0)
        this._addTo(modelInstance, 5, worldBounds, worldMatrix);
};

OmniShadowCasterCollector.prototype._addTo = function(modelInstance, cubeFace, worldBounds, worldMatrix)
{
    var numMeshes = modelInstance.numMeshInstances;
    var skeleton = modelInstance.skeleton;
    var skeletonMatrices = modelInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var camPos = this._cameraPos;
    var camPosX = camPos.x, camPosY = camPos.y, camPosZ = camPos.z;
    var renderList = this._renderLists[cubeFace];
    var camera = this._cameras[cubeFace];

    for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
        var meshInstance = modelInstance.getMeshInstance(meshIndex);
        if (!meshInstance.visible) continue;

        var material = meshInstance.material;

        var renderItem = renderPool.getItem();

        renderItem.material = material;
        renderItem.meshInstance = meshInstance;
        renderItem.skeleton = skeleton;
        renderItem.skeletonMatrices = skeletonMatrices;
        var center = worldBounds._center;
        var dx = camPosX - center.x;
        var dy = camPosY - center.y;
        var dz = camPosZ - center.z;
        renderItem.renderOrderHint = dx * dx + dy * dy + dz * dz;
        renderItem.worldMatrix = worldMatrix;
        renderItem.camera = camera;
        renderItem.worldBounds = worldBounds;

        renderList.push(renderItem);
    }
};

OmniShadowCasterCollector.prototype.qualifies = function(object)
{
    // for now, only interested if it intersects the point light volume at all
    return object.visible && object.worldBounds.intersectsBound(this._lightBounds);
};

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

        rotations[0].fromAxisAngle(Float4.Y_AXIS, Math.PI * .5);
        rotations[1].fromAxisAngle(Float4.Y_AXIS, -Math.PI * .5);
        rotations[2].fromAxisAngle(Float4.X_AXIS, -Math.PI * .5);
        rotations[3].fromAxisAngle(Float4.X_AXIS, Math.PI * .5);
        rotations[4].fromAxisAngle(Float4.Y_AXIS, 0);
        rotations[5].fromAxisAngle(Float4.Y_AXIS, Math.PI);

        var radius = this._light._radius;

        var cubeFaces = [ CubeFace.POSITIVE_X, CubeFace.NEGATIVE_X, CubeFace.POSITIVE_Y, CubeFace.NEGATIVE_Y, CubeFace.POSITIVE_Z, CubeFace.NEGATIVE_Z ];
        for (var i = 0; i < 6; ++i) {
            var camera = new PerspectiveCamera();
            camera.nearDistance = 0.01;
            camera.farDistance = radius;
            camera.verticalFOV = Math.PI * .5;
            camera.rotation.copyFrom(rotations[i]);
            camera.scale.set(1, -1, 1);
            this._cameras.push(camera);

            this._fbos.push(new FrameBuffer(this._shadowMap, this._depthBuffer, cubeFaces[i]));
        }
    }
};

/**
 * @classdesc
 * PointLight represents an omnidirectional light source with a single point as origin. The light strength falls off
 * according to the inverse square rule.
 *
 * @property {number} radius The maximum reach of the light. While this is physically incorrect, it's necessary to limit the lights to a given area for performance.
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 * @property {number} shadowMapSize The shadow map size used by this light.
 *
 * @constructor
 *
 * @extends Light
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PointLight()
{
    Light.call(this);

    if (!PointLight._deferredShaderSphere && META.OPTIONS.deferredLightingModel) {
        PointLight._deferredShaderSphere = new DeferredPointShader(true, false);
        PointLight._deferredShaderRect = new DeferredPointShader(false, false);
        PointLight._deferredShaderSphereShadows = new DeferredPointShader(true, true);
        PointLight._deferredShaderRectShadows = new DeferredPointShader(false, true);
    }

    this._radius = 100.0;
    this.intensity = 3.1415;
    this.depthBias = .0;
    this._shadowMapSize = 256;
    this._shadowMapRenderer = null;
}

PointLight.prototype = Object.create(Light.prototype,
    {
        castShadows: {
            get: function()
            {
                return this._castShadows;
            },

            set: function(value)
            {
                if (this._castShadows === value) return;

                this._castShadows = value;

                if (value) {
                    this._shadowMapRenderer = new OmniShadowMapRenderer(this, this._shadowMapSize);
                }
                else {
                    this._shadowMapRenderer = null;
                }
            }
        },

        shadowMapSize: {
            get: function()
            {
                return this._shadowMapSize;
            },

            set: function(value)
            {
                this._shadowMapSize = value;
                if (this._shadowMapRenderer) this._shadowMapRenderer.shadowMapSize = value;
            }
        },

        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
                this._updateWorldBounds();
            }
        }
    });

/**
 * @ignore
 */
PointLight.prototype._createBoundingVolume = function()
{
    return new BoundingSphere();
};

/**
 * @ignore
 */
PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.worldMatrix.getColumn(3), this._radius);
};

/**
 * @ignore
 */
PointLight.prototype.renderDeferredLighting = function(renderer)
{
    var camPos = new Float4();
    var thisPos = new Float4();
    return function(renderer) {

        // distance camera vs light to estimate projected size
        renderer._camera.worldMatrix.getColumn(3, camPos);
        this.worldMatrix.getColumn(3, thisPos);
        var distSqr = camPos.squareDistanceTo(thisPos);
        var rad = this._radius * 1.1;

        var shader;
        if (distSqr > rad * rad)
            shader = this._castShadows? PointLight._deferredShaderSphereShadows : PointLight._deferredShaderSphere;
        else
            shader = this._castShadows? PointLight._deferredShaderRectShadows : PointLight._deferredShaderRect;

        shader.execute(renderer, this);
    }
}();

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DeferredLightProbeShader(probe)
{
    Shader.call(this);
    var defines = {};

    var extensions = "";
    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    if (probe.size)
        defines.HX_LOCAL_PROBE = 1;

    this._probe = probe;

    if (probe.diffuseTexture)
        defines.HX_DIFFUSE_PROBE = 1;

    if (probe.specularTexture)
        defines.HX_SPECULAR_PROBE = 1;

    var vertex = ShaderLibrary.get("deferred_probe_vertex.glsl", defines);
    var fragment =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        META.OPTIONS.deferredLightingModel + "\n\n\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        ShaderLibrary.get("deferred_probe_fragment.glsl");

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    if (probe.size) {
        this._sizeLocation = gl.getUniformLocation(p, "hx_probeSize");
        this._positionLocation = gl.getUniformLocation(p, "hx_probePosition");
    }

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");
    var specProbeSlot = gl.getUniformLocation(p, "hx_specularProbeMap");
    var diffuseProbeSlot = gl.getUniformLocation(p, "hx_diffuseProbeMap");
    var ssaoSlot = gl.getUniformLocation(p, "hx_ssao");

    this._numMipsLocation = this.getUniformLocation("hx_specularProbeNumMips");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);
    gl.uniform1i(ssaoSlot, 3);
    gl.uniform1i(specProbeSlot, 4);
    gl.uniform1i(diffuseProbeSlot, 5);
}

DeferredLightProbeShader.prototype = Object.create(Shader.prototype);

DeferredLightProbeShader.prototype.execute = function(renderer)
{
    var gl = GL.gl;

    gl.useProgram(this._program);

    var texs = renderer._gbuffer.textures;
    texs[0].bind(0);
    texs[1].bind(1);
    texs[2].bind(2);

    var specularProbe = this._probe.specularTexture;
    var diffuseProbe = this._probe.diffuseTexture;

    if ((specularProbe && specularProbe.size === 0) ||
        (diffuseProbe && diffuseProbe.size === 0)) return;

    if (renderer._ssaoTexture)
        renderer._ssaoTexture.bind(3);

    if (specularProbe) {
        specularProbe.bind(4);
        gl.uniform1f(this._numMipsLocation, Math.floor(MathX.log2(specularProbe.size)));
    }

    if (diffuseProbe)
        diffuseProbe.bind(5);

    if (this._sizeLocation) {
        var m = this._probe.worldMatrix._m;
        gl.uniform1f(this._sizeLocation, this._probe._size * .5);
        gl.uniform3f(this._positionLocation, m[12], m[13], m[14]);
    }

    GL.setCullMode(CullMode.NONE);

    this.updatePassRenderState(renderer._camera, renderer);

    var rect = RectMesh.DEFAULT;
    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    GL.drawElements(ElementType.TRIANGLES, 6, 0);
};

/**
 * @classdesc
 * LightProbe provides functionality to store global illumination information and apply it to the scene lighting.
 * Only providing a simple specularTexture will behave like environment mapping, but diffuse convolution can be applied
 * for global diffuse illumination.
 *
 * @property {TextureCube} diffuseTexture A cube map texture containing diffuse global illumination information
 * @property {TextureCube} specularTexture A cube map texture containing specular global illumination information
 * @property {number} size Defines the virtual size of the environment map box. Useful for local reflections. Leave undefined for a traditional environment map "at infinity"
 *
 * @see {@linkcode https://www.knaldtech.com/lys/} for an example tool to generate the required images.
 *
 * @constructor
 * @param {TextureCube} diffuseTexture A cube map texture containing diffuse global illumination information
 * @param {TextureCube} specularTexture A cube map texture containing specular global illumination information
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function LightProbe(diffuseTexture, specularTexture)
{
    Entity.call(this);
    this._specularTexture = specularTexture;
    this._diffuseTexture = diffuseTexture;
    this._size = undefined;

    if (META.OPTIONS.deferredLightingModel)
        this._deferredShader = new DeferredLightProbeShader(this);
}

// conversion range for spec power to mip. Lys style.
LightProbe.powerRange0 = .00098;
LightProbe.powerRange1 = .9921;

LightProbe.prototype = Object.create(Entity.prototype,
    {
        specularTexture: {
            get: function() { return this._specularTexture; }
        },
        diffuseTexture: {
            get: function() { return this._diffuseTexture; }
        },
        size: {
            get: function()
            {
                return this._size;
            },
            set: function(value)
            {
                if (this._size === value) return;
                var deferredInvalid = false;
                if (META.OPTIONS.deferredLightingModel && (this._size === undefined || value === undefined))
                    deferredInvalid = true;

                this._size = value;
                this._invalidateWorldBounds();

                if (deferredInvalid) this._deferredShader = new DeferredLightProbeShader(this);
            },
        }
    });

/**
 * @ignore
 */
LightProbe.prototype._updateWorldBounds = function()
{
    var min = new Float4();
    var max = new Float4();
    return function()
    {
        if (!this._size)
            this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
        else {
            this.worldMatrix.getColumn(3, min);
            this.worldMatrix.getColumn(3, max);
            var rad = this._size * .5;
            min.x -= rad;
            min.y -= rad;
            min.z -= rad;
            max.x += rad;
            max.y += rad;
            max.z += rad;
            this._worldBounds.setExplicit(min, max);
        }
    }
}();

/**
 * ignore
 */
LightProbe.prototype.acceptVisitor = function (visitor)
{
    Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitLight(this);
};

/**
 * ignore
 */
LightProbe.prototype.renderDeferredLighting = function(renderer)
{
    this._deferredShader.execute(renderer);
};

/**
 * @classdesc
 * ConePrimitive provides a primitive cone {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>radius: The radius of the cone base</li>
 *     <li>height: The height of the cone</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ConePrimitive(definition)
{
    Primitive.call(this, definition);
}

ConePrimitive.prototype = Object.create(Primitive.prototype);

/**
 * The alignment dictates which access should be parallel to the sides of the cone
 * @type {number}
 */
ConePrimitive.ALIGN_X = 1;
ConePrimitive.ALIGN_Y = 2;
ConePrimitive.ALIGN_Z = 3;

ConePrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var alignment = definition.alignment || ConePrimitive.ALIGN_Y;
    var numSegmentsH = definition.numSegmentsH || 1;
    var numSegmentsW = definition.numSegmentsW || 16;
    var radius = definition.radius || 1;
    var height = definition.height || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;
    var hi, ci;
    var cx, cy;
    var angle;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    // sides
    for (hi = 0; hi <= numSegmentsH; ++hi) {
        var rad = (1.0 - hi * rcpNumSegmentsH) * radius;
        var h = (hi*rcpNumSegmentsH - .5)*height;
        for (ci = 0; ci <= numSegmentsW; ++ci) {
            angle = ci * rcpNumSegmentsW * Math.PI * 2;
            var nx = Math.sin(angle);
            var ny = Math.cos(angle);
            cx = nx * rad;
            cy = ny * rad;

            switch (alignment) {
                case ConePrimitive.ALIGN_X:
                    positions.push(-h, cx, -cy);
                    if (normals) normals.push(0, nx, -ny);
                    break;
                case ConePrimitive.ALIGN_Z:
                    positions.push(cx, cy, h);
                    if (normals) normals.push(nx, ny, 0);
                    break;
                default:
                    // Y
                    positions.push(cx, h, -cy);
                    if (normals) normals.push(nx, 0, -ny);
                    break;
            }

            if (uvs) uvs.push(1.0 - ci*rcpNumSegmentsW, hi*rcpNumSegmentsH);
        }
    }

    var w = numSegmentsW + 1;
    var base;
    for (ci = 0; ci < numSegmentsW; ++ci) {
        for (hi = 0; hi < numSegmentsH - 1; ++hi) {
            base = ci + hi*w;
            indices.push(base, base + w + 1, base + w);
            indices.push(base, base + 1, base + w + 1);

            if (doubleSided) {
                indices.push(base, base + w, base + w + 1);
                indices.push(base, base + w + 1, base + 1);
            }
        }

        // tip only needs 1 tri
        base = ci + (numSegmentsH - 1)*w;
        indices.push(base, base + 1, base + w + 1);
    }

    // bottom
    var indexOffset = positions.length / 3;
    var halfH = height * .5;
    for (ci = 0; ci < numSegmentsW; ++ci) {
        angle = ci * rcpNumSegmentsW * Math.PI * 2;
        var u = Math.sin(angle);
        var v = Math.cos(angle);
        cx = u * radius;
        cy = v * radius;

        u = -u * .5 + .5;
        v = v * .5 + .5;

        switch (alignment) {
            case ConePrimitive.ALIGN_X:
                positions.push(halfH, cx, -cy);
                if (normals) normals.push(1, 0, 0);
                if (uvs) uvs.push(v, 1.0 - u);
                break;

            case ConePrimitive.ALIGN_Z:
                positions.push(cx, cy, -halfH);
                if (normals) normals.push(0, 0, -1);
                if (uvs) uvs.push(u, v);
                break;
            default:
                positions.push(cx, -halfH, -cy);
                if (normals) normals.push(0, -1, 0);
                if (uvs) uvs.push(u, v);
                break;
        }
    }

    for (ci = 1; ci < numSegmentsW - 1; ++ci)
        indices.push(indexOffset, indexOffset + ci + 1, indexOffset + ci);
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DeferredSpotShader(useCone, shadows)
{
    Shader.call(this);
    this._useCone = useCone;

    var defines = {};

    if (shadows)
        defines.HX_SHADOW_MAP = 1;

    if (useCone) {
        var primitive = new ConePrimitive({
            // overshoot a bit
            radius: 1.1,
            numSegmentsH: 1,
            alignment: ConePrimitive.ALIGN_Z
        });
        this._mesh = primitive.getMesh(0);
        defines.HX_CONE_MESH = 1;
    }

    var vertex =
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        META.OPTIONS.deferredLightingModel + "\n\n\n" +
        META.OPTIONS.spotShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_spot_light_vertex.glsl", defines);
    var fragment =
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        META.OPTIONS.deferredLightingModel + "\n\n\n" +
        META.OPTIONS.spotShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_spot_light_fragment.glsl", defines);

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._colorLocation = gl.getUniformLocation(p, "hx_spotLight.color");
    this._posLocation = gl.getUniformLocation(p, "hx_spotLight.position");
    this._radiusLocation = gl.getUniformLocation(p, "hx_spotLight.radius");
    this._dirLocation = gl.getUniformLocation(p, "hx_spotLight.direction");
    this._rcpRadiusLocation = gl.getUniformLocation(p, "hx_spotLight.rcpRadius");
    this._anglesLocation = gl.getUniformLocation(p, "hx_spotLight.angleData");
    if (useCone) {
        this._sinOuterAngleLocation = gl.getUniformLocation(p, "hx_spotLight.sinOuterAngle");
        this._worldMatrixLocation = gl.getUniformLocation(p, "hx_spotLightWorldMatrix");
    }

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);

    if (shadows) {
        this._shadowMatrixLocation = gl.getUniformLocation(p, "hx_spotLight.shadowMapMatrix");
        this._depthBiasLocation = gl.getUniformLocation(p, "hx_spotLight.depthBias");
        var shadowMapSlot = gl.getUniformLocation(p, "hx_shadowMap");
        var ditherSlot = gl.getUniformLocation(p, "hx_dither2D");
        gl.uniform1i(shadowMapSlot, 3);
        gl.uniform1i(ditherSlot, 4);
    }
}

DeferredSpotShader.prototype = Object.create(Shader.prototype);

DeferredSpotShader.prototype.execute = function(renderer, light)
{
    var pos = new Float4();
    var matrix = new Matrix4x4();

    return function(renderer, light) {
        var gl = GL.gl;

        gl.useProgram(this._program);

        var texs = renderer._gbuffer.textures;
        texs[0].bind(0);
        texs[1].bind(1);
        texs[2].bind(2);

        var camera = renderer._camera;
        var col = light._scaledIrradiance;

        var worldMatrix = light.worldMatrix;
        worldMatrix.getColumn(3, pos);
        camera.viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);

        worldMatrix.getColumn(2, pos);
        camera.viewMatrix.transformVector(pos, pos);
        gl.uniform3f(this._dirLocation, pos.x, pos.y, pos.z);
        gl.uniform1f(this._radiusLocation, light._radius);
        gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);
        gl.uniform2f(this._anglesLocation, light._cosOuter, 1.0 / Math.max((light._cosInner - light._cosOuter), .00001));

        if (this._useCone) {
            gl.uniform1f(this._sinOuterAngleLocation, light._sinOuter);
            gl.uniformMatrix4fv(this._worldMatrixLocation, false, worldMatrix._m);
        }

        if (light._castShadows) {
            var shadowRenderer = light._shadowMapRenderer;
            shadowRenderer._shadowMap.bind(3);

            matrix.multiply(shadowRenderer.shadowMatrix, camera.worldMatrix);
            gl.uniformMatrix4fv(this._shadowMatrixLocation, false, matrix._m);
            gl.uniform1f(this._depthBiasLocation, light.depthBias);

            DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.bind(4);
        }

        this.updatePassRenderState(camera, renderer);

        if (this._useCone) {
            GL.setCullMode(CullMode.FRONT);
            var mesh = this._mesh;
            mesh._vertexBuffers[0].bind();
            mesh._indexBuffer.bind();

            gl.vertexAttribPointer(this._positionAttributeLocation, 3, gl.FLOAT, false, 48, 0);
            GL.enableAttributes(1);
            GL.drawElements(ElementType.TRIANGLES, mesh.numIndices, 0);
        }
        else {
            GL.setCullMode(CullMode.NONE);
            var rect = RectMesh.DEFAULT;
            rect._vertexBuffers[0].bind();
            rect._indexBuffer.bind();

            gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
            gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

            GL.enableAttributes(2);

            GL.drawElements(ElementType.TRIANGLES, 6, 0);
        }
    }
}();

/**
 * @ignore
 */
var RenderPath = {
    // forward with dynamic light picking
    FORWARD_DYNAMIC: 0,
    // forward with fixed assigned set of lights
    FORWARD_FIXED: 1,
    // deferred lighting
    DEFERRED: 2,

    NUM_PATHS: 3
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function RenderCollector()
{
    SceneVisitor.call(this);

    this._renderItemPool = new ObjectPool(RenderItem);

    this._opaques = [];
    this._transparents = null;
    this._camera = null;
    this._cameraZAxis = new Float4();
    this._frustumPlanes = null;
    this._lights = null;
    this._ambientColor = new Color();
    this._shadowCasters = null;
    this._effects = null;
    this._needsNormalDepth = false;
    this._needsForwardPath = false;
    this._needsBackbuffer = false;
}

RenderCollector.prototype = Object.create(SceneVisitor.prototype, {
    ambientColor: {
        get: function() { return this._ambientColor; }
    },

    needsNormalDepth: {
        get: function() { return this._needsNormalDepth; }
    },

    needsForwardPath: {
        get: function() { return this._needsForwardPath; }
    },

    needsBackbuffer: {
        get: function() { return this._needsBackbuffer; }
    }
});

RenderCollector.prototype.getOpaqueRenderList = function(path) { return this._opaques[path]; };
RenderCollector.prototype.getTransparentRenderList = function() { return this._transparents; };
RenderCollector.prototype.getLights = function() { return this._lights; };
RenderCollector.prototype.getShadowCasters = function() { return this._shadowCasters; };
RenderCollector.prototype.getEffects = function() { return this._effects; };

RenderCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    camera.worldMatrix.getColumn(2, this._cameraZAxis);
    this._frustumPlanes = camera.frustum._planes;
    this._reset();

    scene.acceptVisitor(this);

    for (var i = 0; i < RenderPath.NUM_PATHS; ++i)
        this._opaques[i].sort(RenderSortFunctions.sortOpaques);

    this._transparents.sort(RenderSortFunctions.sortTransparents);

    this._lights.sort(RenderSortFunctions.sortLights);

    var effects = this._camera._effects;
    // add camera effects at the end
    if (effects) {
        var len = effects.length;

        for (var i = 0; i < len; ++i) {
            var effect = effects[i];
            this._needsNormalDepth = this._needsNormalDepth || effect._needsNormalDepth;
            this._effects.push(effect);
        }
    }

    // allows optimizing the render loop, skipping the entire forward path (which rerenders the light accumulation)
    // if no forward is needed
    this._needsForwardPath =
        this._transparents.length > 0 ||
        this._opaques[RenderPath.FORWARD_FIXED].length > 0 ||
        this._opaques[RenderPath.FORWARD_DYNAMIC].length > 0;
};

RenderCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._frustumPlanes, 6);
};

RenderCollector.prototype.visitScene = function (scene)
{
    var skybox = scene._skybox;
    if (skybox)
        this.visitModelInstance(skybox._modelInstance, scene._rootNode.worldMatrix, scene._rootNode.worldBounds);
};

RenderCollector.prototype.visitEffects = function(effects)
{
    // camera does not pass effects
    //if (ownerNode === this._camera) return;
    var len = effects.length;

    for (var i = 0; i < len; ++i) {
        this._effects.push(effects[i]);
    }
};

RenderCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    var numMeshes = modelInstance.numMeshInstances;
    var cameraZAxis = this._cameraZAxis;
    var cameraZ_X = cameraZAxis.x, cameraZ_Y = cameraZAxis.y, cameraZ_Z = cameraZAxis.z;
    var skeleton = modelInstance.skeleton;
    var skeletonMatrices = modelInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var camera = this._camera;
    var opaqueLists = this._opaques;
    var transparentList = this._transparents;

    for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
        var meshInstance = modelInstance.getMeshInstance(meshIndex);
        if (!meshInstance.visible) continue;

        var material = meshInstance.material;

        var path = material.renderPath;

        // only required for the default lighting model (if not unlit)
        this._needsNormalDepth = this._needsNormalDepth || material._needsNormalDepth;
        this._needsBackbuffer = this._needsBackbuffer || material._needsBackbuffer;

        var renderItem = renderPool.getItem();

        renderItem.material = material;
        renderItem.meshInstance = meshInstance;
        renderItem.skeleton = skeleton;
        renderItem.skeletonMatrices = skeletonMatrices;
        // distance along Z axis:
        var center = worldBounds._center;
        renderItem.renderOrderHint = center.x * cameraZ_X + center.y * cameraZ_Y + center.z * cameraZ_Z;
        renderItem.worldMatrix = worldMatrix;
        renderItem.camera = camera;
        renderItem.worldBounds = worldBounds;

        var bucket = (material.blendState || material._needsBackbuffer)? transparentList : opaqueLists[path];
        bucket.push(renderItem);
    }
};

RenderCollector.prototype.visitAmbientLight = function(light)
{
    var color = light._scaledIrradiance;
    this._ambientColor.r += color.r;
    this._ambientColor.g += color.g;
    this._ambientColor.b += color.b;
};

RenderCollector.prototype.visitLight = function(light)
{
    this._lights.push(light);
    if (light._castShadows) this._shadowCasters.push(light._shadowMapRenderer);
};

RenderCollector.prototype._reset = function()
{
    this._renderItemPool.reset();

    for (var i = 0; i < RenderPath.NUM_PATHS; ++i)
        this._opaques[i] = [];

    this._transparents = [];

    this._lights = [];
    this._shadowCasters = [];
    this._effects = [];
    this._needsNormalDepth = META.OPTIONS.ambientOcclusion;
    this._ambientColor.set(0, 0, 0, 1);
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DeferredAmbientShader()
{
    Shader.call(this);
    var defines = {};

    var vertex = ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment =
        ShaderLibrary.get("snippets_geometry.glsl", defines) + "\n" +
        ShaderLibrary.get("deferred_ambient_light_fragment.glsl");

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");
    var ssaoSlot = gl.getUniformLocation(p, "hx_ssao");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);
    gl.uniform1i(ssaoSlot, 3);
}

DeferredAmbientShader.prototype = Object.create(Shader.prototype);

DeferredAmbientShader.prototype.execute = function(renderer)
{
    var gl = GL.gl;

    gl.useProgram(this._program);

    var texs = renderer._gbuffer.textures;
    texs[0].bind(0);
    texs[1].bind(1);
    texs[2].bind(2);

    if (renderer._ssaoTexture)
        renderer._ssaoTexture.bind(3);

    this.updatePassRenderState(renderer._camera, renderer);

    GL.setCullMode(CullMode.NONE);

    var rect = RectMesh.DEFAULT;
    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    GL.drawElements(ElementType.TRIANGLES, 6, 0);
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotShadowCasterCollector()
{
    SceneVisitor.call(this);
    this._frustumPlanes = null;
    this._renderList = [];
    this._renderItemPool = new ObjectPool(RenderItem);
    this._cameraZAxis = new Float4();
}

SpotShadowCasterCollector.prototype = Object.create(SceneVisitor.prototype);

SpotShadowCasterCollector.prototype.getRenderList = function() { return this._renderList; };

SpotShadowCasterCollector.prototype.collect = function(camera, scene)
{
    this._camera = camera;
    this._renderList = [];
    camera.worldMatrix.getColumn(2, this._cameraZAxis);
    this._frustumPlanes = camera.frustum._planes;
    this._renderItemPool.reset();

    scene.acceptVisitor(this);

    this._renderList.sort(RenderSortFunctions.sortOpaques);
};

SpotShadowCasterCollector.prototype.visitModelInstance = function (modelInstance, worldMatrix, worldBounds)
{
    if (!modelInstance._castShadows) return;

    var numMeshes = modelInstance.numMeshInstances;
    var cameraZAxis = this._cameraZAxis;
    var cameraZ_X = cameraZAxis.x, cameraZ_Y = cameraZAxis.y, cameraZ_Z = cameraZAxis.z;
    var skeleton = modelInstance.skeleton;
    var skeletonMatrices = modelInstance.skeletonMatrices;
    var renderPool = this._renderItemPool;
    var camera = this._camera;
    var renderList = this._renderList;

    for (var meshIndex = 0; meshIndex < numMeshes; ++meshIndex) {
        var meshInstance = modelInstance.getMeshInstance(meshIndex);
        if (!meshInstance.visible) continue;

        var material = meshInstance.material;

        var renderItem = renderPool.getItem();

        renderItem.material = material;
        renderItem.meshInstance = meshInstance;
        renderItem.skeleton = skeleton;
        renderItem.skeletonMatrices = skeletonMatrices;
        // distance along Z axis:
        var center = worldBounds._center;
        renderItem.renderOrderHint = center.x * cameraZ_X + center.y * cameraZ_Y + center.z * cameraZ_Z;
        renderItem.worldMatrix = worldMatrix;
        renderItem.camera = camera;
        renderItem.worldBounds = worldBounds;

        renderList.push(renderItem);
    }
};

SpotShadowCasterCollector.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsConvexSolid(this._frustumPlanes, 6);
};

/**
 * @ignore
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotShadowMapRenderer(light, shadowMapSize)
{
    this._light = light;
    this._shadowMapSize = shadowMapSize || 256;
    this._shadowMapInvalid = true;
    this._fboFront = null;
    this._fboBack = null;
    this._depthBuffer = null;   // only used if depth textures aren't supported

    // TODO: Some day, we might want to create a shadow atlas and dynamically assign regions, sized based on screen-size
    this._shadowMap = this._createShadowBuffer();
    this._blurShader = META.OPTIONS.spotShadowFilter.blurShader;
    this._shadowBackBuffer = this._blurShader? this._createShadowBuffer() : null;
    this._softness = META.OPTIONS.spotShadowFilter.softness ? META.OPTIONS.spotShadowFilter.softness : .002;

    this._casterCollector = new SpotShadowCasterCollector();

    this._camera = new PerspectiveCamera();
    this._camera.near = .01;
    this._scene = null;

}

SpotShadowMapRenderer.prototype =
{
    get shadowMatrix() {
        return this._camera.viewProjectionMatrix;
    },

    get shadowMapSize()
    {
        return this._shadowMapSize;
    },

    set shadowMapSize(value)
    {
        if (this._shadowMapSize === value) return;
        this._shadowMapSize = value;
        this._invalidateShadowMap();
    },

    render: function (viewCamera, scene)
    {
        if (this._shadowMapInvalid)
            this._initShadowMap();

        var light = this._light;
        this._camera.verticalFOV = light.outerAngle;
        this._camera.far = light._radius;
        this._camera.matrix.copyFrom(light.worldMatrix);
        this._camera._invalidateWorldMatrix();

        this._casterCollector.collect(this._camera, scene);

        GL.setRenderTarget(this._fboFront);
        GL.setClearColor(Color.WHITE);
        GL.clear();

        RenderUtils.renderPass(this, MaterialPass.SPOT_LIGHT_SHADOW_MAP_PASS, this._casterCollector.getRenderList());

        GL.setColorMask(true);

        if (this._blurShader)
            this._blur();

        GL.setRenderTarget();
        GL.setClearColor(Color.BLACK);
    },

    _createShadowBuffer: function()
    {
        var tex = new Texture2D();
        //tex.filter = TextureFilter.NEAREST_NOMIP;
        // while filtering doesn't actually work on encoded values, it looks much better this way since at least it can filter
        // the MSB, which is useful for ESM etc
        tex.filter = TextureFilter.BILINEAR_NOMIP;
        tex.wrapMode = TextureWrapMode.CLAMP;
        return tex;
    },

    _invalidateShadowMap: function()
    {
        this._shadowMapInvalid = true;
    },

    _initShadowMap: function()
    {
        var size = this._shadowMapSize;

        this._shadowMap.initEmpty(size, size, META.OPTIONS.spotShadowFilter.getShadowMapFormat(), META.OPTIONS.spotShadowFilter.getShadowMapDataType());
        if (!this._depthBuffer) this._depthBuffer = new WriteOnlyDepthBuffer();
        if (!this._fboFront) this._fboFront = new FrameBuffer(this._shadowMap, this._depthBuffer);

        this._depthBuffer.init(size, size, false);
        this._fboFront.init();
        this._shadowMapInvalid = false;

        if (this._shadowBackBuffer) {
            this._shadowBackBuffer.initEmpty(size, size, META.OPTIONS.spotShadowFilter.getShadowMapFormat(), META.OPTIONS.spotShadowFilter.getShadowMapDataType());
            if (!this._fboBack) this._fboBack = new FrameBuffer(this._shadowBackBuffer, this._depthBuffer);
            this._fboBack.init();
        }
    },

    _blur: function()
    {
        var shader = this._blurShader;
        var numPasses = META.OPTIONS.spotShadowFilter.numBlurPasses;

        for (var i = 0; i < numPasses; ++i) {
            GL.setRenderTarget(this._fboBack);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._shadowMap, 1.0 / this._shadowMapSize, 0.0);

            GL.setRenderTarget(this._fboFront);
            GL.clear();
            shader.execute(RectMesh.DEFAULT, this._shadowBackBuffer, 0.0, 1.0 / this._shadowMapSize);
        }
    }
};

/**
 * @classdesc
 * SpotLight represents an light source with a single point as origin and a conical range. The light strength falls off
 * according to the inverse square rule.
 *
 * @property {number} radius The maximum reach of the light. While this is physically incorrect, it's necessary to limit the lights to a given area for performance.
 * @property {number} innerAngle The angle of the spot light where it starts attenuating outwards. In radians!
 * @property {number} outerAngle The maximum angle of the spot light's reach. In radians!
 * @property {boolean} castShadows Defines whether or not this light casts shadows.
 * @property {number} shadowMapSize The shadow map size used by this light.
 *
 * @constructor
 *
 * @extends Light
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotLight()
{
    Light.call(this);

    if (!SpotLight._deferredShaderSphere && META.OPTIONS.deferredLightingModel) {
        SpotLight._deferredShaderCone = new DeferredSpotShader(true, false);
        SpotLight._deferredShaderRect = new DeferredSpotShader(false, false);
        SpotLight._deferredShaderConeShadows = new DeferredSpotShader(true, true);
        SpotLight._deferredShaderRectShadows = new DeferredSpotShader(false, true);
    }

    this._localBounds = new BoundingAABB();
    this._radius = 50.0;
    this._innerAngle = 1.2;
    this._outerAngle = 1.3;
    this._cosInner = Math.cos(this._innerAngle * .5);
    this._cosOuter = Math.cos(this._outerAngle * .5);
    this._sinOuter = Math.sin(this._outerAngle * .5);
    this.intensity = 3.1415;
    this.lookAt(new Float4(0, -1, 0));
    this._localBoundsInvalid = true;

    this.depthBias = .0;
    this._shadowMapSize = 256;
    this._shadowMapRenderer = null;
}

SpotLight.prototype = Object.create(Light.prototype,
    {
        castShadows: {
            get: function()
            {
                return this._castShadows;
            },

            set: function(value)
            {
                if (this._castShadows === value) return;

                this._castShadows = value;

                if (value) {
                    this._shadowMapRenderer = new SpotShadowMapRenderer(this, this._shadowMapSize);
                }
                else {
                    this._shadowMapRenderer = null;
                }
            }
        },

        shadowMapSize: {
            get: function()
            {
                return this._shadowMapSize;
            },

            set: function(value)
            {
                this._shadowMapSize = value;
                if (this._shadowMapRenderer) this._shadowMapRenderer.shadowMapSize = value;
            }
        },

        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
                this._updateWorldBounds();
                this._invalidateLocalBounds();
            }
        },

        innerAngle: {
            get: function() {
                return this._innerAngle;
            },

            set: function(value) {
                this._innerAngle = MathX.clamp(value, 0, Math.PI);
                this._outerAngle = MathX.clamp(this._outerAngle, this._innerAngle, Math.PI);
                this._cosInner = Math.cos(this._innerAngle * .5);
                this._cosOuter = Math.cos(this._outerAngle * .5);
                this._sinOuter = Math.cos(this._sinOuter * .5);
                this._invalidateLocalBounds();
            }
        },

        outerAngle: {
            get: function() {
                return this._outerAngle;
            },

            set: function(value) {
                this._outerAngle = MathX.clamp(value, 0, Math.PI);
                this._innerAngle = MathX.clamp(this._innerAngle, 0, this._outerAngle);
                this._cosInner = Math.cos(this._innerAngle * .5);
                this._cosOuter = Math.cos(this._outerAngle * .5);
                this._sinOuter = Math.cos(this._sinOuter * .5);
                this._invalidateLocalBounds();
            }
        }
    });

/**
 * @ignore
 */
SpotLight.prototype._createBoundingVolume = function()
{
    return new BoundingAABB();
};

/**
 * @ignore
 */
SpotLight.prototype._updateWorldBounds = function()
{
    if (this._localBoundsInvalid)
        this._updateLocalBounds();

    this._worldBounds.transformFrom(this._localBounds, this.worldMatrix);
};

/**
 * @ignore
 */
SpotLight.prototype.renderDeferredLighting = function(renderer)
{
    var camPos = new Float4();
    var thisPos = new Float4();

    return function(renderer) {

        var camera = renderer._camera;
        // distance camera vs light to estimate projected size
        camera.worldMatrix.getColumn(3, camPos);
        this.worldMatrix.getColumn(3, thisPos);
        var side = this.worldBounds.classifyAgainstPlane(camera.frustum.planes[Frustum.PLANE_NEAR]);

        var shader;
        if (side === PlaneSide.FRONT)
            shader = this._castShadows? SpotLight._deferredShaderConeShadows : SpotLight._deferredShaderCone;
        else
            shader = this._castShadows? SpotLight._deferredShaderRectShadows : SpotLight._deferredShaderRect;

        shader.execute(renderer, this);
    }
}();

/**
 * @ignore
 * @private
 */
SpotLight.prototype._updateLocalBounds = function()
{
    var min = new Float4();
    var max = new Float4();

    return function() {
        // spotlight points in posZ direction, with range [0, radius]
        max.z = this._radius;

        // most basic trig
        var b = this._sinOuter * this._radius;
        min.x = -b;
        min.y = -b;
        max.x = b;
        max.y = b;

        if (this._radius === undefined) {
            throw new Error("No radius!");
        }

        this._localBounds.setExplicit(min, max);
        this._localBoundsInvalid = false;
    };
}();

SpotLight.prototype._invalidateLocalBounds = function()
{
    this._localBoundsInvalid = true;
    this._invalidateWorldBounds();
};

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
function ForwardFixedLitPass(geometryVertex, geometryFragment, lightingModel, lights) {
    this._dirLights = null;
    this._dirLightCasters = null;
    this._pointLights = null;
    this._pointLightCasters = null;
    this._spotLights = null;
    this._spotLightCasters = null;
    this._diffuseLightProbes = null;
    this._specularLightProbes = null;

    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment, lightingModel, lights));

    this._getUniformLocations();

    this._assignShadowMaps();
    this._assignLightProbes();
}

ForwardFixedLitPass.prototype = Object.create(MaterialPass.prototype);

ForwardFixedLitPass.prototype.updatePassRenderState = function (camera, renderer) {
    GL.gl.useProgram(this._shader._program);
    this._assignDirLights(camera);
    this._assignDirLightCasters(camera);
    this._assignPointLights(camera);
    this._assignPointLightCasters(camera);
    this._assignSpotLights(camera);
    this._assignSpotLightCasters(camera);
    this._assignLightProbes(camera);

    MaterialPass.prototype.updatePassRenderState.call(this, camera, renderer);
};

ForwardFixedLitPass.prototype._generateShader = function (geometryVertex, geometryFragment, lightingModel, lights) {
    this._dirLights = [];
    this._dirLightCasters = [];
    this._pointLights = [];
    this._pointLightCasters = [];
    this._spotLights = [];
    this._spotLightCasters = [];
    this._diffuseLightProbes = [];
    this._specularLightProbes = [];

    for (var i = 0; i < lights.length; ++i) {
        var light = lights[i];

        // I don't like typechecking, but do we have a choice? :(
        if (light instanceof DirectionalLight) {
            if (light.castShadows)
                this._dirLightCasters.push(light);
            else
                this._dirLights.push(light);
        }
        else if (light instanceof PointLight) {
            if (light.castShadows)
                this._pointLightCasters.push(light);
            else
                this._pointLights.push(light);
        }
        else if (light instanceof SpotLight) {
            if (light.castShadows)
                this._spotLightCasters.push(light);
            else
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
        HX_NUM_DIR_LIGHT_CASTERS: this._dirLightCasters.length,
        HX_NUM_POINT_LIGHTS: this._pointLights.length,
        HX_NUM_POINT_LIGHT_CASTERS: this._pointLightCasters.length,
        HX_NUM_SPOT_LIGHTS: this._spotLights.length,
        HX_NUM_SPOT_LIGHT_CASTERS: this._spotLightCasters.length,
        HX_NUM_DIFFUSE_PROBES: this._diffuseLightProbes.length,
        HX_NUM_SPECULAR_PROBES: this._specularLightProbes.length
    };

    if (capabilities.EXT_SHADER_TEXTURE_LOD) {
        extensions += "#texturelod\n";
    }

    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_all_vertex.glsl", defines);

    var fragmentShader =
        extensions +
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        lightingModel + "\n\n\n" +
        META.OPTIONS.directionalShadowFilter.getGLSL() + "\n" +
        META.OPTIONS.spotShadowFilter.getGLSL() + "\n" +
        META.OPTIONS.pointShadowFilter.getGLSL() + "\n" +
        ShaderLibrary.get("directional_light.glsl", defines) + "\n" +
        ShaderLibrary.get("point_light.glsl") + "\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        ShaderLibrary.get("light_probe.glsl") + "\n" +
        geometryFragment + "\n" +
        ShaderLibrary.get("material_fwd_all_fragment.glsl");

    return new Shader(vertexShader, fragmentShader);
};

ForwardFixedLitPass.prototype._assignDirLights = function (camera) {
    var dir = new Float4();

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
        }
    }
}();

ForwardFixedLitPass.prototype._assignDirLightCasters = function (camera) {
    var dir = new Float4();
    var matrix = new Matrix4x4();
    var matrixData = new Float32Array(64);

    return function(camera) {
        var lights = this._dirLightCasters;
        if (!lights) return;

        var len = lights.length;
        var gl = GL.gl;

        for (var i = 0; i < len; ++i) {
            var light = lights[i];
            camera.viewMatrix.transformVector(light.direction, dir);

            var locs = this._dirCasterLocations[i];

            var col = light._scaledIrradiance;
            gl.uniform3f(locs.color, col.r, col.g, col.b);
            gl.uniform3f(locs.direction, dir.x, dir.y, dir.z);

            var shadowRenderer = light._shadowMapRenderer;
            var numCascades = META.OPTIONS.numShadowCascades;
            var splits = shadowRenderer._splitDistances;
            var k = 0;
            for (var j = 0; j < numCascades; ++j) {
                matrix.multiply(shadowRenderer.getShadowMatrix(j), camera.worldMatrix);
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
}();

ForwardFixedLitPass.prototype._assignPointLights = function (camera) {
    var pos = new Float4();

    return function(camera) {
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
        }
    }
}();

ForwardFixedLitPass.prototype._assignPointLightCasters = function (camera) {
    var pos = new Float4();

    return function(camera) {
        var lights = this._pointLightCasters;
        if (!lights) return;

        var gl = GL.gl;

        var len = lights.length;

        for (var i = 0; i < len; ++i) {
            var locs = this._pointCasterLocations[i];
            var light = lights[i];
            light.worldMatrix.getColumn(3, pos);
            camera.viewMatrix.transformPoint(pos, pos);

            var col = light._scaledIrradiance;
            gl.uniform3f(locs.color, col.r, col.g, col.b);
            gl.uniform3f(locs.position, pos.x, pos.y, pos.z);
            gl.uniform1f(locs.radius, light._radius);
            gl.uniform1f(locs.rcpRadius, 1.0 / light._radius);

            gl.uniform1f(locs.depthBias, light.depthBias);
            gl.uniformMatrix4fv(locs.matrix, false, camera.worldMatrix._m);
        }
    }
}();

ForwardFixedLitPass.prototype._assignSpotLights = function (camera) {
    var pos = new Float4();

    return function(camera) {
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

            worldMatrix.getColumn(2, pos);
            viewMatrix.transformVector(pos, pos);
            gl.uniform3f(locs.direction, pos.x, pos.y, pos.z);
        }
    }
}();

ForwardFixedLitPass.prototype._assignSpotLightCasters = function (camera) {
    var pos = new Float4();
    var matrix = new Matrix4x4();

    return function(camera) {
        var lights = this._spotLightCasters;
        if (!lights) return;

        var gl = GL.gl;

        var len = lights.length;

        for (var i = 0; i < len; ++i) {
            var locs = this._spotCasterLocations[i];
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

            worldMatrix.getColumn(2, pos);
            viewMatrix.transformVector(pos, pos);
            gl.uniform3f(locs.direction, pos.x, pos.y, pos.z);

            matrix.multiply(light._shadowMapRenderer.shadowMatrix, camera.worldMatrix);

            gl.uniformMatrix4fv(locs.matrix, false, matrix._m);
            gl.uniform1f(locs.depthBias, light.depthBias);
        }
    }
}();

ForwardFixedLitPass.prototype._assignShadowMaps = function () {
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

    lights = this._spotLightCasters;
    len = lights.length;
    if (len > 0) {
        var shadowMaps = [];

        for (var i = 0; i < len; ++i) {
            var light = lights[i];
            var shadowRenderer = light._shadowMapRenderer;
            shadowMaps[i] = shadowRenderer._shadowMap;
        }

        this.setTextureArray("hx_spotShadowMaps", shadowMaps);
    }

    lights = this._pointLightCasters;
    len = lights.length;
    if (len > 0) {
        var shadowMaps = [];

        for (var i = 0; i < len; ++i) {
            var light = lights[i];
            var shadowRenderer = light._shadowMapRenderer;
            shadowMaps[i] = shadowRenderer._shadowMap;
        }

        this.setTextureArray("hx_pointShadowMaps", shadowMaps);
    }
};

ForwardFixedLitPass.prototype._assignLightProbes = function () {
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

ForwardFixedLitPass.prototype._getUniformLocations = function()
{
    this._dirLocations = [];
    this._dirCasterLocations = [];
    this._pointLocations = [];
    this._pointCasterLocations = [];
    this._spotLocations = [];
    this._spotCasterLocations = [];

    for (var i = 0; i < this._dirLights.length; ++i) {
        this._dirLocations.push({
            color: this.getUniformLocation("hx_directionalLights[" + i + "].color"),
            direction: this.getUniformLocation("hx_directionalLights[" + i + "].direction")
        });
    }

    for (i = 0; i < this._dirLightCasters.length; ++i) {
        this._dirCasterLocations.push({
            color: this.getUniformLocation("hx_directionalLightCasters[" + i + "].color"),
            direction: this.getUniformLocation("hx_directionalLightCasters[" + i + "].direction"),
            matrices: this.getUniformLocation("hx_directionalLightCasters[" + i + "].shadowMapMatrices[0]"),
            splits: this.getUniformLocation("hx_directionalLightCasters[" + i + "].splitDistances"),
            depthBias: this.getUniformLocation("hx_directionalLightCasters[" + i + "].depthBias"),
            maxShadowDistance: this.getUniformLocation("hx_directionalLightCasters[" + i + "].maxShadowDistance")
        });
    }

    for (i = 0; i < this._pointLights.length; ++i) {
        this._pointLocations.push({
            color: this.getUniformLocation("hx_pointLights[" + i + "].color"),
            position: this.getUniformLocation("hx_pointLights[" + i + "].position"),
            radius: this.getUniformLocation("hx_pointLights[" + i + "].radius"),
            rcpRadius: this.getUniformLocation("hx_pointLights[" + i + "].rcpRadius")
        });
    }

    for (i = 0; i < this._pointLightCasters.length; ++i) {
        this._pointCasterLocations.push({
            color: this.getUniformLocation("hx_pointLightCasters[" + i + "].color"),
            position: this.getUniformLocation("hx_pointLightCasters[" + i + "].position"),
            radius: this.getUniformLocation("hx_pointLightCasters[" + i + "].radius"),
            rcpRadius: this.getUniformLocation("hx_pointLightCasters[" + i + "].rcpRadius"),
            depthBias: this.getUniformLocation("hx_pointLightCasters[" + i + "].depthBias"),
            matrix: this.getUniformLocation("hx_pointLightCasters[" + i + "].shadowMapMatrix"),
        });
    }

    for (i = 0; i < this._spotLights.length; ++i) {
        this._spotLocations.push({
            color: this.getUniformLocation("hx_spotLights[" + i + "].color"),
            position: this.getUniformLocation("hx_spotLights[" + i + "].position"),
            direction: this.getUniformLocation("hx_spotLights[" + i + "].direction"),
            radius: this.getUniformLocation("hx_spotLights[" + i + "].radius"),
            rcpRadius: this.getUniformLocation("hx_spotLights[" + i + "].rcpRadius"),
            angleData: this.getUniformLocation("hx_spotLights[" + i + "].angleData")
        });
    }

    for (i = 0; i < this._spotLightCasters.length; ++i) {
        this._spotCasterLocations.push({
            color: this.getUniformLocation("hx_spotLightCasters[" + i + "].color"),
            position: this.getUniformLocation("hx_spotLightCasters[" + i + "].position"),
            direction: this.getUniformLocation("hx_spotLightCasters[" + i + "].direction"),
            radius: this.getUniformLocation("hx_spotLightCasters[" + i + "].radius"),
            angleData: this.getUniformLocation("hx_spotLightCasters[" + i + "].angleData"),
            depthBias: this.getUniformLocation("hx_spotLightCasters[" + i + "].depthBias"),
            matrix: this.getUniformLocation("hx_spotLightCasters[" + i + "].shadowMapMatrix"),
        });
    }
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function GBufferAlbedoPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

GBufferAlbedoPass.prototype = Object.create(MaterialPass.prototype);

GBufferAlbedoPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines =
        "#define HX_SKIP_NORMALS\n" +
        "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_gbuffer_albedo_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_gbuffer_albedo_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function GBufferNormalDepthPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

GBufferNormalDepthPass.prototype = Object.create(MaterialPass.prototype);

GBufferNormalDepthPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines = "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_gbuffer_normal_depth_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_gbuffer_normal_depth_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function GBufferSpecularPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

GBufferSpecularPass.prototype = Object.create(MaterialPass.prototype);

GBufferSpecularPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines = "#define HX_SKIP_NORMALS\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_gbuffer_specular_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_gbuffer_specular_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function GBufferFullPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

GBufferFullPass.prototype = Object.create(MaterialPass.prototype);

GBufferFullPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var fragmentShader = ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_gbuffer_full_fragment.glsl");
    var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_gbuffer_full_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ApplyGBufferPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

ApplyGBufferPass.prototype = Object.create(MaterialPass.prototype);

ApplyGBufferPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines =
        "#define HX_SKIP_NORMALS\n" +
        "#define HX_SKIP_SPECULAR\n";
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_apply_gbuffer_vertex.glsl");
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n\n" + ShaderLibrary.get("material_apply_gbuffer_fragment.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SpotShadowPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
}

SpotShadowPass.prototype = Object.create(MaterialPass.prototype);

SpotShadowPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines =
        "#define HX_SKIP_NORMALS\n" +
        "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + META.OPTIONS.spotShadowFilter.getGLSL() + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_spot_shadow_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_unlit_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PointShadowPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
    this._rcpRadiusLocation = this.getUniformLocation("hx_rcpRadius");
}

PointShadowPass.prototype = Object.create(MaterialPass.prototype);

PointShadowPass.prototype.updatePassRenderState = function(geometryVertex, geometryFragment, light)
{
    MaterialPass.prototype.updatePassRenderState.call(this, geometryVertex, geometryFragment);
    GL.gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);
};

PointShadowPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    var defines =
        "#define HX_SKIP_NORMALS\n" +
        "#define HX_SKIP_SPECULAR\n";
    var fragmentShader = defines + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + META.OPTIONS.pointShadowFilter.getGLSL() + "\n" + geometryFragment + "\n" + ShaderLibrary.get("material_point_shadow_fragment.glsl");
    var vertexShader = defines + geometryVertex + "\n" + ShaderLibrary.get("material_point_shadow_vertex.glsl");
    return new Shader(vertexShader, fragmentShader);
};

/**
 * @ignore
 */
var MATERIAL_ID_COUNTER = 0;

/**
 * @classdesc
 * Material is a base class for materials. It splits up into two components: the geometry stage, and the lighting model.
 *
 * @constructor
 *
 * @param geometryVertexShader The vertex code for the geometry stage.
 * @param geometryFragmentShader The fragment code for the geometry stage.
 * @param [lightingModel] The {@linkcode LightingModel} to use. Defaults to what was passed in (if anything) with {@linkcode InitOptions#defaultLightingModel}.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Material(geometryVertexShader, geometryFragmentShader, lightingModel)
{
    // dispatched when the material's code changed and a link with a mesh may have become invalid
    this.onChange = new Signal();

    this._elementType = ElementType.TRIANGLES;
    this._cullMode = CullMode.BACK;
    this._writeDepth = true;
    this._writeColor = true;
    this._passes = new Array(Material.NUM_PASS_TYPES);
    this._renderOrderHint = ++MATERIAL_ID_COUNTER;
    this._renderPath = null;
    // forced render order by user:
    this._renderOrder = 0;
    this._textures = {};
    this._uniforms = {};
    this._fixedLights = null;
    this._useMorphing = false;
    this._useSkinning = false;

    this._name = null;
    this._geometryVertexShader = geometryVertexShader;
    this._geometryFragmentShader = geometryFragmentShader;
    this._lightingModel = lightingModel || META.OPTIONS.defaultLightingModel;

    this._initialized = false;
    this._blendState = null;
    this._additiveBlendState = BlendState.ADD;    // additive blend state is used for dynamic lighting
    this._needsNormalDepth = false;
    this._needsBackbuffer = false;
}

Material.ID_COUNTER = 0;

Material.prototype =
{
    /**
     * @ignore
     */
    init: function()
    {
        if (this._initialized || !this._geometryVertexShader || !this._geometryFragmentShader)
            return;

        this._needsNormalDepth = false;
        this._needsBackbuffer = false;

        if (!this._lightingModel) {
            this._renderPath = RenderPath.FORWARD_FIXED;
            this.setPass(MaterialPass.BASE_PASS, new UnlitPass(this._geometryVertexShader, this._geometryFragmentShader));
        }
        else if (this._fixedLights) {
            this._renderPath = RenderPath.FORWARD_FIXED;
            this.setPass(MaterialPass.BASE_PASS, new ForwardFixedLitPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, this._fixedLights));
        }
        else if (this._lightingModel !== META.OPTIONS.deferredLightingModel || this._blendState) {
            this._renderPath = RenderPath.FORWARD_DYNAMIC;

            this.setPass(MaterialPass.BASE_PASS, new ForwardLitBasePass(this._geometryVertexShader, this._geometryFragmentShader));

            this.setPass(MaterialPass.DIR_LIGHT_PASS, new ForwardLitDirPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, false));
            this.setPass(MaterialPass.DIR_LIGHT_SHADOW_PASS, new ForwardLitDirPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, true));
            this.setPass(MaterialPass.POINT_LIGHT_PASS, new ForwardLitPointPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, false));
            this.setPass(MaterialPass.POINT_LIGHT_SHADOW_PASS, new ForwardLitPointPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, true));
            this.setPass(MaterialPass.SPOT_LIGHT_PASS, new ForwardLitSpotPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, false));
            this.setPass(MaterialPass.SPOT_LIGHT_SHADOW_PASS, new ForwardLitSpotPass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel, true));
            this.setPass(MaterialPass.LIGHT_PROBE_PASS, new ForwardLitProbePass(this._geometryVertexShader, this._geometryFragmentShader, this._lightingModel));
        }
        else {
            this._renderPath = RenderPath.DEFERRED;
            this.setPass(MaterialPass.BASE_PASS, new ApplyGBufferPass(this._geometryVertexShader, this._geometryFragmentShader));

            // only deferred needs these passes:
            if (!capabilities.GBUFFER_MRT) {
                this.setPass(MaterialPass.GBUFFER_ALBEDO_PASS, new GBufferAlbedoPass(this._geometryVertexShader, this._geometryFragmentShader));
                this.setPass(MaterialPass.GBUFFER_SPECULAR_PASS, new GBufferSpecularPass(this._geometryVertexShader, this._geometryFragmentShader));
            }
        }

        this.setPass(MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS, new DirectionalShadowPass(this._geometryVertexShader, this._geometryFragmentShader));
        this.setPass(MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS, new PointShadowPass(this._geometryVertexShader, this._geometryFragmentShader));
        this.setPass(MaterialPass.SPOT_LIGHT_SHADOW_MAP_PASS, new SpotShadowPass(this._geometryVertexShader, this._geometryFragmentShader));

        // always may need these passes for AO
        if (capabilities.GBUFFER_MRT)
            this.setPass(MaterialPass.GBUFFER_PASS, new GBufferFullPass(this._geometryVertexShader, this._geometryFragmentShader));

        // may need this even with MRT, if no deferred materials are selected
        this.setPass(MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, new GBufferNormalDepthPass(this._geometryVertexShader, this._geometryFragmentShader));

        this._initialized = true;
    },

    /**
     * Whether or not the Material was initialized and ready to use.
     * @ignore
     */
    get initialized() { return this._initialized; },

    /**
     * The blend state used for this material.
     *
     * @see {BlendState}
     */
    get blendState()
    {
        return this._blendState;
    },

    set blendState(value)
    {
        this._blendState = value;
        if (value) {
            this._additiveBlendState = value.clone();
            this._additiveBlendState.dstFactor = BlendFactor.ONE;
        }
        else {
            this._additiveBlendState = BlendState.ADD;
        }

        // blend state can require different render path, so shaders need to adapt
        this._invalidate();
    },

    /**
     * Allows setting a specific set of lights to this material, avoiding having to figure out lighting dynamically.
     * This will cause all lighting to happen in a single pass, which is generally *much* faster than any other option.
     */
    get fixedLights()
    {
        return this._fixedLights;
    },

    set fixedLights(value)
    {
        this._fixedLights = value;
        this._invalidate();
    },

    /**
     * The name of the material.
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    /**
     * The {@options LightingModel} used to light this material. If this is set to {@linkcode InitOptions#deferredLightingModel}
     * and no blendState is assigned, this material will be rendered using the deferred render path.
     */
    get lightingModel()
    {
        return this._lightingModel;
    },

    set lightingModel(value)
    {
        this._lightingModel = value;
        this._invalidate();
    },

    /**
     * A Number that can force the order in which the material is rendered. Higher values will be rendered later!
     */
    get renderOrder()
    {
        return this._renderOrder;
    },

    set renderOrder(value)
    {
        this._renderOrder = value;
    },

    /**
     * An {@linkcode ElementType} to describe the type of elements to render.
     */
    get elementType()
    {
        return this._elementType;
    },

    set elementType(value)
    {
        this._elementType = value;
        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].elementType = value;
        }
    },

    /**
     * Defines whether or not this material should write depth information.
     */
    get writeDepth()
    {
        return this._writeDepth;
    },

    set writeDepth(value)
    {
        this._writeDepth = value;

        if (!value && this._passes[MaterialPass.GBUFFER_NORMAL_DEPTH_PASS]) {
            this._passes[MaterialPass.GBUFFER_NORMAL_DEPTH_PASS] = null;
        }
        else if (value && !this._passes[MaterialPass.GBUFFER_NORMAL_DEPTH_PASS])
            this._invalidate();

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].writeDepth = value;
        }
    },

    /**
     * Defines whether or not this material should write color information. This should only be used for some special
     * cases.
     */
    get writeColor()
    {
        return this._writeColor;
    },

    set writeColor(value)
    {
        this._writeColor = value;

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].writeColor = value;
        }
    },

    /**
     * Defines how back-face culling is applied. One of {@linkcode CullMode}.
     */
    get cullMode()
    {
        return this._cullMode;
    },

    set cullMode(value)
    {
        this._cullMode = value;
        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (i !== MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS  &&
                i !== MaterialPass.SPOT_LIGHT_SHADOW_MAP_PASS &&
                i !== MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS &&
                this._passes[i])
                this._passes[i].cullMode = value;
        }
    },

    /**
     * @ignore
     */
    get renderPath()
    {
        // make sure that if we request the path, it's figured out
        if (!this._initialized) this.init();
        return this._renderPath;
    },

    /**
     * @ignore
     */
    getPass: function (type)
    {
        if (!this._initialized) this.init();
        return this._passes[type];
    },

    /**
     * @ignore
     */
    setPass: function (type, pass)
    {
        this._passes[type] = pass;

        if (pass) {
            if(type === MaterialPass.DIR_LIGHT_SHADOW_MAP_PASS)
                pass.cullMode = META.OPTIONS.directionalShadowFilter.cullMode;
            else if(type === MaterialPass.SPOT_LIGHT_SHADOW_MAP_PASS)
                pass.cullMode = META.OPTIONS.spotShadowFilter.cullMode;
            else if(type === MaterialPass.POINT_LIGHT_SHADOW_MAP_PASS)
                pass.cullMode = META.OPTIONS.pointShadowFilter.cullMode;
            else
                pass.cullMode = this._cullMode;

            pass.elementType = this._elementType;
            pass.writeDepth = this._writeDepth;
            pass.writeColor = this._writeColor;

            // one of the lit ones
            if (type >= MaterialPass.DIR_LIGHT_PASS  && type <= MaterialPass.LIGHT_PROBE_PASS)
                pass.blendState = this._additiveBlendState;

            if (type === MaterialPass.BASE_PASS)
                pass.blendState = this._blendState;

            if (pass.getTextureSlot("hx_gbufferNormalDepth"))
                this._needsNormalDepth = true;

            if (pass.getTextureSlot("hx_backbuffer"))
                this._needsBackbuffer = true;

            for (var slotName in this._textures) {
                if (this._textures.hasOwnProperty(slotName)) {
                    var texture = this._textures[slotName];
                    if (texture instanceof Array)
                        pass.setTextureArray(slotName, texture);
                    else
                        pass.setTexture(slotName, texture);
                }
            }

            for (var uniformName in this._uniforms) {
                if (this._uniforms.hasOwnProperty(uniformName)) {
                    if (uniformName.charAt(uniformName.length - 1) === ']')
                        pass.setUniformArray(uniformName.substr(0, uniformName.length - 3), this._uniforms[uniformName]);
                    else
                        pass.setUniform(uniformName, this._uniforms[uniformName]);
                }
            }
        }

        this.onChange.dispatch();
    },

    /**
     * @ignore
     */
    hasPass: function (type)
    {
        if (!this._initialized) this.init();
        return !!this._passes[type];
    },

    /**
     * Assigns a texture to the shaders with a given name.
     * @param {string} slotName The name of the texture as it appears in the shader code.
     * @param {Texture2D} texture The texture to assign
     */
    setTexture: function(slotName, texture)
    {
        if (texture)
            this._textures[slotName] = texture;
        else
            delete this._textures[slotName];

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i)
            if (this._passes[i]) this._passes[i].setTexture(slotName, texture);
    },

    /**
     * Assigns a texture array to the shaders with a given name.
     * @param {string} slotName The name of the texture array as it appears in the shader code.
     * @param {Array} texture An Array of {@linkcode Texture2D} objects
     */
    setTextureArray: function(slotName, textures)
    {
        if (textures)
            this._textures[slotName] = textures;
        else
            delete this._textures[slotName];

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i)
            if (this._passes[i]) this._passes[i].setTextureArray(slotName, textures);
    },

    /**
     * Sets a uniform value to the shaders.
     * @param name The uniform name as it appears in the shader code.
     * @param value The uniform value. For vectors, this can be a {@linkcode Float2}, {@linkcode Float4}, or an Array
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniform: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name))
            return;

        this._uniforms[name] = value;

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniform(name, value);
        }
    },

    /**
     * Sets the value for a uniform array to the shaders.
     * @param name The uniform array name as it appears in the shader code.
     * @param value An array of values.
     * @param overwrite (Optional) If the value was already set, ignore the new value.
     */
    setUniformArray: function(name, value, overwrite)
    {
        if (overwrite === undefined) overwrite = true;

        if (!overwrite && this._uniforms.hasOwnProperty(name + '[0]'))
            return;

        this._uniforms[name + '[0]'] = value;

        for (var i = 0; i < MaterialPass.NUM_PASS_TYPES; ++i) {
            if (this._passes[i])
                this._passes[i].setUniformArray(name, value);
        }
    },

    /**
     * @ignore
     */
    _setUseSkinning: function(value)
    {
        this._useSkinning = value;
    },

    /**
     * @ignore
     */
    _setUseMorphing: function(value)
    {
        this._useMorphing = value;
    },

    /**
     * Called by subclasses when their shaders are invalidated
     * @ignore
     */
    _invalidate: function()
    {
        this._initialized = false;
        this._passes = new Array(Material.NUM_PASS_TYPES);
        this.onChange.dispatch();
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[Material(name=" + this._name + ")]";
    }
};

/**
 * @classdesc
 * BasicMaterial is the default physically plausible rendering material.
 *
 * @property {boolean} doubleSided Defines whether the material is double sided (no back-face culling) or not. An easier-to-read alternative to {@linkcode Material#cullMode}
 * @property {number} alpha The overall transparency of the object. Has no effect without a matching blendState value.
 * @property {boolean} useVertexColors Defines whether the material should use the hx_vertexColor attribute. Only available for meshes that have this attribute.
 * @property {Color} color The base color of the material. Multiplied with the colorMap if provided.
 * @property {Color} emissiveColor The emission color of the material. Multiplied with the emissionMap if provided.
 * @property {Texture2D} colorMap A {@linkcode Texture2D} object containing color data.
 * @property {Texture2D} normalMap A {@linkcode Texture2D} object containing surface normals.
 * @property {Texture2D} occlusionMap A {@linkcode Texture2D} object containing baked ambient occlusion.
 * @property {Texture2D} emissionMap A {@linkcode Texture2D} object containing color emission.
 * @property {Texture2D} specularMap A texture containing specular reflection data. The contents of the map depend on {@linkcode BasicMaterial#specularMapMode}. The roughness in the specular map is encoded as shininess; ie: lower values result in higher roughness to reflect the apparent brighness of the reflection. This is visually more intuitive.
 * @property {Texture2D} maskMap A {@linkcode Texture2D} object containing transparency data. Requires a matching blendState.
 * @property {number} specularMapMode Defines the contents of the specular map. One of the following:
 * <ul>
 *     <li>{@linkcode BasicMaterial#SPECULAR_MAP_ROUGHNESS_ONLY}</li>
 *     <li>{@linkcode BasicMaterial#SPECULAR_MAP_ALL}</li>
 *     <li>{@linkcode BasicMaterial#SPECULAR_MAP_SHARE_NORMAL_MAP}</li>
 *     <li>{@linkcode BasicMaterial#SPECULAR_MAP_METALLIC_ROUGHNESS}</li>
 * </ul>
 * @property {number} metallicness A value describing the overall "metallicness" of an object. Normally 0 or 1, but it can be used for some hybrid materials.
 * @property {number} normalSpecularReflectance The amount of light reflecting off a surface at 90 degrees (ie: the minimum reflectance in the Fresnel equation according to Schlick's approximation). This is generally 0.027 for most materials.
 * @property {number} roughness The microfacet roughness of the material. Higher values will result in dimmer but larger highlights.
 * @property {number} roughnessRange Represents the range at which the roughness map operates. When using a roughness texture, roughness represents the middle roughness, range the deviation from there. So textured roughness ranges from [roughness - roughnessRange, roughness + roughnessRange]
 * @property {number} alphaThreshold The alpha threshold that prevents pixels with opacity below this from being rendered. This is not recommended on certain mobile platforms due to depth buffer hierarchy performance.
 *
 * @constructor
 *
 * @param options An object with key/value pairs describing the initial values of the material.
 *
 * <ul>
 * <li>color: {@linkcode Color} or hexcode Number</li>
 * <li>colorMap: {@linkcode Texture2D}</li>
 * <li>doubleSided: Boolean</li>
 * <li>normalMap: {@linkcode Texture2D}</li>
 * <li>specularMap: {@linkcode Texture2D}</li>
 * <li>maskMap: {@linkcode Texture2D}</li>
 * <li>specularMapMode: {@linkcode BasicMaterial#SPECULAR_MAP_ROUGHNESS_ONLY}</li>
 * <li>metallicness: Number</li>
 * <li>alpha: Number</li>
 * <li>roughness: Number</li>
 * <li>roughnessRange: Number</li>
 * <li>normalSpecularReflectance: Number</li>
 * <li>alphaThreshold: Number</li>
 * <li>useVertexColors: Boolean</li>
 * <li>lightingModel: {@linkcode LightingModel}</li>
 * </ul>
 *
 * @extends Material
 *
 * @author derschmale <http://www.derschmale.com>
 */
function BasicMaterial(options)
{
    Material.call(this);

    options = options || {};

    this._color = options.color || new Color(1, 1, 1, 1);
    this._emissiveColor = options.emissiveColor || new Color(0, 0, 0, 1);
    this._colorMap = options.colorMap || null;
    this._doubleSided = !!options.doubleSided;
    this._normalMap = options.normalMap || null;
    this._specularMap = options.specularMap || null;
    this._maskMap = options.maskMap || null;
    this._specularMapMode = options.specularMapMode || BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY;
    this._metallicness = options.metallicness === undefined? 0.0 : options.metallicness;
    this._alpha = options.alpha === undefined? 1.0 : options.alpha;
    this._roughness = options.roughness === undefined ? 0.5 : options.roughness;
    this._roughnessRange = options.roughnessRange === undefined? .5 : options.roughnessRange;
    this._normalSpecularReflectance = options.normalSpecularReflectance === undefined? 0.027 : options.normalSpecularReflectance;
    this._alphaThreshold = options.alphaThreshold === undefined? 1.0 : options.alphaThreshold;
    this._useVertexColors = !!options.useVertexColors;

    // trigger assignments
    this.color = this._color;
    this.emissiveColor = this._emissiveColor;
    this.alpha = this._alpha;
    this.metallicness = this._metallicness;
    this.roughness = this._roughness;
    this.normalSpecularReflectance = this._normalSpecularReflectance;

    if (options.lightingModel !== undefined)
        this.lightingModel = options.lightingModel;
}

/**
 * Converts to roughness from a "shininess" or "gloss" property, traditionally used in Phong lighting.
 * @param specularPower The specular power used as the gloss parameter.
 */
BasicMaterial.roughnessFromShininess = function(specularPower)
{
    return Math.sqrt(2.0/(specularPower + 2.0));
};

/**
 * Used for specularMapMode to specify the specular map only uses roughness data
 */
BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY = 1;
/**
 * Used for specularMapMode to specify the specular map has rgb channels containing roughness, normal reflectance and metallicness, respectively
 */
BasicMaterial.SPECULAR_MAP_ALL = 2;
/**
 * Used for specularMapMode to specify there is no explicit specular map, but roughness data is present in the alpha channel of the normal map.
 */
BasicMaterial.SPECULAR_MAP_SHARE_NORMAL_MAP = 3;
/**
 * Used for specularMapMode to specify the specular map has gb channels containing metallicness and roughness. This is the glTF standard.
 */
BasicMaterial.SPECULAR_MAP_METALLIC_ROUGHNESS = 4;


BasicMaterial.prototype = Object.create(Material.prototype,
    {
        doubleSided: {
            get: function()
            {
                return this._doubleSided;
            },

            set: function(value)
            {
                if (this._doubleSided !== value)
                    this._invalidate();

                this._doubleSided = value;
                this.cullMode = value? CullMode.NONE : CullMode.BACK;
            }
        },

        alpha: {
            get: function ()
            {
                return this._alpha;
            },
            set: function (value)
            {
                this._alpha = MathX.saturate(value);
                this.setUniform("alpha", this._alpha);
            }
        },

        useVertexColors: {
            get: function ()
            {
                return this._useVertexColors;
            },
            set: function (value)
            {
                if (this._useVertexColors !== value)
                    this._invalidate();

                this._useVertexColors = value;
            }
        },

        color: {
            get: function ()
            {
                return this._color;
            },
            set: function (value)
            {
                this._color = isNaN(value) ? value : new Color(value);
                this.setUniform("color", this._color);
            }
        },

        colorMap: {
            get: function ()
            {
                return this._colorMap;
            },

            set: function (value)
            {
                if (!!this._colorMap !== !!value) {
                    this._invalidate();
                }

                this._colorMap = value;

                this.setTexture("colorMap", value);
            }
        },

        normalMap: {
            get: function ()
            {
                return this._normalMap;
            },
            set: function (value)
            {
                if (!!this._normalMap !== !!value)
                    this._invalidate();

                this.setTexture("normalMap", value);

                this._normalMap = value;
            }
        },

        occlusionMap: {
            get: function ()
            {
                return this._occlusionMap;
            },
            set: function (value)
            {
                if (!!this._occlusionMap !== !!value)
                    this._invalidate();

                this.setTexture("occlusionMap", value);

                this._occlusionMap = value;
            }
        },

        emissiveColor: {
            get: function ()
            {
                return this._emissiveColor;
            },
            set: function (value)
            {
                this._emissiveColor = isNaN(value) ? value : new Color(value);
                this.setUniform("emissiveColor", this._emissiveColor);
            }
        },

        emissionMap: {
            get: function ()
            {
                return this._emissionMap;
            },
            set: function (value)
            {
                if (!!this._emissionMap !== !!value)
                    this._invalidate();

                this.setTexture("emissionMap", value);

                this._emissionMap = value;
            }
        },

        specularMap: {
            get: function ()
            {
                return this._specularMap;
            },
            set: function (value)
            {
                if (!!this._specularMap !== !!value)
                    this._invalidate();

                this.setTexture("specularMap", value);

                this._specularMap = value;
            }
        },

        maskMap: {
            get: function ()
            {
                return this._maskMap;
            },
            set: function (value)
            {
                if (!!this._maskMap !== !!value)
                    this._invalidate();

                this.setTexture("maskMap", value);

                this._maskMap = value;
            }
        },

        specularMapMode: {
            get: function ()
            {
                return this._specularMapMode;
            },
            set: function (value)
            {
                if (this._specularMapMode !== value)
                    this._invalidate();

                this._specularMapMode = value;
            }
        },

        metallicness: {
            get: function ()
            {
                return this._metallicness;
            },
            set: function (value)
            {
                this._metallicness = MathX.saturate(value);
                this.setUniform("metallicness", this._metallicness);
            }
        },

        normalSpecularReflectance: {
            get: function ()
            {
                return this._normalSpecularReflectance;
            },
            set: function (value)
            {
                this._normalSpecularReflectance = MathX.saturate(value);
                this.setUniform("normalSpecularReflectance", this._normalSpecularReflectance);
            }
        },

        roughness:
            {
                get: function ()
                {
                    return this._roughness;
                },

                set: function(value)
                {
                    this._roughness = value;
                    this.setUniform("roughness", this._roughness);
                }
            },

        roughnessRange:
            {
                get: function ()
                {
                    return this._roughnessRange;
                },

                set: function(value)
                {
                    this._roughnessRange = value;
                    this.setUniform("roughnessRange", this._roughnessRange * 2.0);
                }
            },

        alphaThreshold:
            {
                get: function() { return this._alphaThreshold; },
                set: function(value) {
                    value = MathX.saturate(value);
                    if ((this._alphaThreshold === 1.0) !== (value === 1.0))
                        this._invalidate();

                    this._alphaThreshold = value;
                    this.setUniform("alphaThreshold", value);
                }
            }
    }
);

/**
 * @ignore
 */
BasicMaterial.prototype.init = function()
{
    var defines = this._generateDefines();

    this._geometryVertexShader = ShaderLibrary.get("default_geometry_vertex.glsl", defines);
    this._geometryFragmentShader = ShaderLibrary.get("default_geometry_fragment.glsl", defines);

    Material.prototype.init.call(this);
};

/**
 * @ignore
 */
BasicMaterial.prototype._generateDefines = function()
{
    var defines = {};
    if (this._colorMap) defines.COLOR_MAP = 1;
    if (this._useVertexColors) defines.VERTEX_COLORS = 1;
    if (this._normalMap) defines.NORMAL_MAP = 1;
    if (this._occlusionMap) defines.OCCLUSION_MAP = 1;
    if (this._emissionMap) defines.EMISSION_MAP = 1;
    if (this._maskMap) defines.MASK_MAP = 1;
    if (this._alphaThreshold < 1.0) defines.ALPHA_THRESHOLD = 1;
    if (this._useSkinning) defines.HX_USE_SKINNING = 1;
    if (this._useMorphing) {
        defines.HX_USE_MORPHING = 1;
        defines.HX_NUM_MORPH_TARGETS = capabilities.NUM_MORPH_TARGETS;
    }

    switch (this._specularMapMode) {
        case BasicMaterial.SPECULAR_MAP_ROUGHNESS_ONLY:
            if (this._specularMap) defines.ROUGHNESS_MAP = 1;
            break;
        case BasicMaterial.SPECULAR_MAP_ALL:
            if (this._specularMap) defines.SPECULAR_MAP = 1;
            break;
        case BasicMaterial.SPECULAR_MAP_METALLIC_ROUGHNESS:
            if (this._specularMap) defines.METALLIC_ROUGHNESS_MAP = 1;
            break;
        default:
            defines.NORMAL_ROUGHNESS_MAP = 1;
    }

    if (this._doubleSided) {
        defines.DOUBLE_SIDED = 1;
    }

    return defines;
};

/**
 * @ignore
 */
BasicMaterial.prototype._setUseSkinning = function(value)
{
    if (this._useSkinning !== value)
        this._invalidate();

    this._useSkinning = value;
};

/**
 * @classdesc
 * WireWireBoxPrimitive provides a primitive box {@linkcode Model} to use with line types, useful for debugging.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>width: The width of the box</li>
 *     <li>height: The height of the box</li>
 *     <li>depth: The depth of the box</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function WireBoxPrimitive(definition)
{
    Primitive.call(this, definition);
}

WireBoxPrimitive.prototype = Object.create(Primitive.prototype);

WireBoxPrimitive.prototype._generate = function(target, definition)
{
    var width = definition.width || 1;
    var height = definition.height || width;
    var depth = definition.depth || width;

    var halfW = width * .5;
    var halfH = height * .5;
    var halfD = depth * .5;

    var positions = target.positions;
    var indices = target.indices;

    positions.push(-halfW, -halfH, -halfD);
    positions.push(halfW, -halfH, -halfD);
    positions.push(-halfW, halfH, -halfD);
    positions.push(halfW, halfH, -halfD);

    positions.push(-halfW, -halfH, halfD);
    positions.push(halfW, -halfH, halfD);
    positions.push(-halfW, halfH, halfD);
    positions.push(halfW, halfH, halfD);

    indices.push(0, 1);
    indices.push(2, 3);
    indices.push(0, 2);
    indices.push(1, 3);

    indices.push(4, 5);
    indices.push(6, 7);
    indices.push(4, 6);
    indices.push(5, 7);

    indices.push(0, 4);
    indices.push(2, 6);
    indices.push(1, 5);
    indices.push(3, 7);
};

/**
 * @classdesc
 * VertexLayout links the mesh's vertex attributes to a shader's attributes
 *
 * @param mesh
 * @param pass
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VertexLayout(mesh, pass)
{
    var shader = pass.getShader();
    this.attributes = [];
    this.morphAttributes = [];

    this._numAttributes = -1;

    for (var i = 0; i < mesh.numVertexAttributes; ++i) {
        var attribute = mesh.getVertexAttributeByIndex(i);
        var index = shader.getAttributeLocation(attribute.name);

        if (!(index >= 0)) continue;

        var stride = mesh.getVertexStride(attribute.streamIndex);
        var attrib = {
            index: index,
            offset: attribute.offset * 4,
            external: false,
            numComponents: attribute.numComponents,
            stride: stride * 4,
            streamIndex: attribute.streamIndex
        };

        // morph attributes are handled differently because their associated vertex buffers change dynamically
        if (attribute.name.indexOf("hx_morph") === 0) {
            this.morphAttributes.push(attrib);
            attrib.external = true;
        }

        // so in some cases, it occurs that - when attributes are optimized out by the driver - the indices don't change,
        // but those unused become -1, leaving gaps. This keeps the gaps so we can take care of them
        this.attributes[index] = attrib;

        this._numAttributes = Math.max(this._numAttributes, index + 1);
    }
}

/**
 * @classdesc
 * MeshInstance allows bundling a {@linkcode Mesh} with a {@linkcode Material} for rendering, allowing both the geometry
 * and materials to be shared regardless of the combination of both. MeshInstance is managed by {@linkcode ModelInstance}
 * internally and should never be created manually.
 *
 * @constructor
 * @param mesh The {@linkcode Mesh} providing the geometry for this instance.
 * @param material The {@linkcode Material} to use to render the given Mesh.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MeshInstance(mesh, material)
{
    this._mesh = mesh;
    this._meshMaterialLinkInvalid = false;
    this._vertexLayouts = null;
    this._visible = true;

    mesh.onLayoutChanged.bind(this._onMaterialOrMeshChange, this);

    if (mesh.hasMorphData) {
        this._morphTargets = [];
        var w = [];
        for (var i = 0; i < capabilities.NUM_MORPH_TARGETS; ++i) {
            w[i] = 0;
        }
        this._morphWeights = new Float32Array(w);
    }

    this.material = material;
}

MeshInstance.prototype = {
    /**
     * Defines whether this MeshInstance should be rendered or not.
     */
    get visible()
    {
        return this._visible;
    },

    set visible(value)
    {
        this._visible = value;
    },

    /**
     * The {@linkcode Mesh} providing the geometry for this instance
     */
    get mesh()
    {
        return this._mesh;
    },

    /**
     * @ignore
     */
    setMorphTarget: function(targetIndex, vertexBuffer, weight)
    {
        this._morphTargets[targetIndex] = vertexBuffer;
        this._morphWeights[targetIndex] = vertexBuffer? weight : 0.0;
    },

    /**
     * The {@linkcode Material} used to render the Mesh.
     */
    get material()
    {
        return this._material;
    },

    set material(value)
    {
        if (this._material)
            this._material.onChange.unbind(this._onMaterialOrMeshChange);

        this._material = value;

        if (this._material) {
            this._material.onChange.bind(this._onMaterialOrMeshChange, this);

            this._material._setUseSkinning(this._material._useSkinning || !!this._mesh._model.skeleton);
            this._material._setUseMorphing(this._material._useMorphing || this._mesh.hasMorphData);
        }

        this._meshMaterialLinkInvalid = true;
    },

    /**
     * Sets state for this mesh/material combination.
     * @param passType
     * @ignore
     */
    updateRenderState: function(passType)
    {
        if (this._meshMaterialLinkInvalid)
            this._linkMeshWithMaterial();

        var vertexBuffers = this._mesh._vertexBuffers;
        this._mesh._indexBuffer.bind();

        var layout = this._vertexLayouts[passType];
        var morphAttributes = layout.morphAttributes;
        var len = morphAttributes.length;
        var attribute;
        var gl = GL.gl;

        for (var i = 0; i < len; ++i) {
            attribute = morphAttributes[i];
            var buffer = this._morphTargets[i] || this._mesh._defaultMorphTarget;
            buffer.bind();
            gl.vertexAttribPointer(attribute.index, attribute.numComponents, gl.FLOAT, false, attribute.stride, attribute.offset);
        }

        var attributes = layout.attributes;
        len = layout._numAttributes;

        GL.enableAttributes(layout._numAttributes);

        for (i = 0; i < len; ++i) {
            attribute = attributes[i];

            if (attribute) {
                // external = in case of morph targets etc
                if (!attribute.external) {
                    vertexBuffers[attribute.streamIndex].bind();
                    gl.vertexAttribPointer(i, attribute.numComponents, gl.FLOAT, false, attribute.stride, attribute.offset);
                }
            }
            else {
                GL.gl.disableVertexAttribArray(i);
                // there seem to be some bugs in ANGLE with disabling vertex attribute arrays, so bind a dummy instead
                // vertexBuffers[0].bind();
                // gl.vertexAttribPointer(i, 1, gl.FLOAT, false, 4, 0);
            }
        }
    },

    /**
     * @ignore
     * @private
     */
    _initVertexLayouts: function()
    {
        this._vertexLayouts = new Array(MaterialPass.NUM_PASS_TYPES);
        for (var type = 0; type < MaterialPass.NUM_PASS_TYPES; ++type) {
            var pass = this._material.getPass(type);
            if (pass)
                this._vertexLayouts[type] = new VertexLayout(this._mesh, pass);
        }
    },

    /**
     * @ignore
     * @private
     */
    _linkMeshWithMaterial: function()
    {
        this._initVertexLayouts();

        this._meshMaterialLinkInvalid = false;
    },

    /**
     * @ignore
     * @private
     */
    _onMaterialOrMeshChange: function()
    {
        this._meshMaterialLinkInvalid = true;
    }
};

/**
 * @classdesc
 * SkeletonJointPose represents the translation, rotation, and scale for a joint to have. Used by {@linkcode SkeletonPose}.
 * Generally not of interest to casual users.
 *
 * @constructor
 *
 * @see {@linkcode SkeletonPose}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonJointPose()
{
    this.position = new Float4();
    this.rotation = new Quaternion();
    this.scale = new Float4(1, 1, 1);
    this.skeletonPose = null;
}

SkeletonJointPose.prototype =
    {
        copyFrom: function(a)
        {
            this.rotation.copyFrom(a.rotation);
            this.position.copyFrom(a.position);
            this.scale.copyFrom(a.scale);
        },

        toString: function()
        {
            return "[SkeletonJointPose]";
        }
    };

/**
 * @classdesc
 * SkeletonPose represents an entire pose a {@linkcode Skeleton} can have. Usually, several poses are interpolated to create animations.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonPose()
{
    this._jointPoses = [];

    this._skinningTexture = null;
    // "global" is in fact model space
    this._globalMatrices = null;
    this._bindMatrices = null;
    this._skeletonMatricesInvalid = true;
}

SkeletonPose.prototype = {
    /**
     * The number of joint poses.
     */
    numJoints: function()
    {
        return this._jointPoses.length;
    },

    /**
     * Returns the joint pose at a given position
     */
    getJointPose: function(index)
    {
        return this._jointPoses[index];
    },

    /**
     * Assigns a joint pose.
     */
    setJointPose: function(index, value)
    {
        this._jointPoses[index] = value;
        value.skeletonPose = this;
    },

    /**
     * Lets the engine know the pose has been updated
     */
    invalidateGlobalPose: function()
    {
        this._skeletonMatricesInvalid = true;
    },

    /**
     * Interpolates between two poses and stores it in the current
     * @param a
     * @param b
     * @param factor
     */
    interpolate: function (a, b, factor)
    {
        a = a._jointPoses;
        b = b._jointPoses;
        var len = a.length;

        if (this._jointPoses.length !== len)
            this._initJointPoses(len);

        var target = this._jointPoses;
        for (var i = 0; i < len; ++i) {
            var t = target[i];
            t.rotation.slerp(a[i].rotation, b[i].rotation, factor);
            t.position.lerp(a[i].position, b[i].position, factor);
            t.scale.lerp(a[i].scale, b[i].scale, factor);
        }
    },

    /**
     * Grabs the inverse bind pose data from a skeleton and generates a local pose from it
     * @param skeleton
     */
    copyBindPose: function (skeleton)
    {
        var m = new Matrix4x4();
        for (var i = 0; i < skeleton.numJoints; ++i) {
            var j = skeleton.getJoint(i);
            var p = this._jointPoses[i] = new SkeletonJointPose();
            // global bind pose matrix
            m.inverseAffineOf(j.inverseBindPose);

            // local bind pose matrix
            if (j.parentIndex >= 0)
                m.append(skeleton.getJoint(j.parentIndex).inverseBindPose);

            m.decompose(p);
        }
    },

    /**
     * Copies another pose.
     */
    copyFrom: function (a)
    {
        a = a._jointPoses;
        var target = this._jointPoses;
        var len = a.length;

        if (this._jointPoses.length !== len)
            this._initJointPoses(len);

        for (var i = 0; i < len; ++i)
            target[i].copyFrom(a[i]);
    },

    /**
     * @ignore
     */
    _initJointPoses: function (numJointPoses)
    {
        this._numJoints = numJointPoses;
        this._jointPoses.length = numJointPoses;
        for (var i = 0; i < numJointPoses; ++i)
            this.setJointPose(i, new SkeletonJointPose());
    },

    /**
     * @ignore
     */
    getBindMatrices: function(skeleton)
    {
        if (this._skeletonMatricesInvalid || this._skeleton !== skeleton)
            this._updateSkeletonMatrices(skeleton);

        this._skeleton = skeleton;

        return this._skinningTexture || this._bindMatrices;
    },

    /**
     * @ignore
     */
    _generateDefault: function (skeleton)
    {
        if (META.OPTIONS.useSkinningTexture) {
            this._skinningTexture = DEFAULTS.DEFAULT_SKINNING_TEXTURE;
            return;
        }

        this._globalMatrices = [];
        this._bindMatrices = [];
        for (var i = 0; i < skeleton.numJoints; ++i) {
            this._globalMatrices[i] = new Matrix4x4();
            this._bindMatrices[i] = new Matrix4x4();
        }
    },

    /**
     * @ignore
     */
    _updateSkeletonMatrices: function (skeleton)
    {
        var globals = this._globalMatrices;
        var binds = this._bindMatrices;

        if (!globals || globals.length !== skeleton.numJoints) {
            this._generateGlobalSkeletonData(skeleton);
            globals = this._globalMatrices;
            binds = this._bindMatrices;
        }

        var len = skeleton.numJoints;

        for (var i = 0; i < len; ++i) {
            var pose = this._jointPoses[i];
            var global = globals[i];
            var joint = skeleton.getJoint(i);
            var parentIndex = joint.parentIndex;

            global.compose(pose);

            if (parentIndex !== -1)
                global.append(globals[parentIndex]);

            if (skeleton._applyInverseBindPose)
                binds[i].multiplyAffine(global, joint.inverseBindPose);
            else
                binds[i].copyFrom(global);
        }

        if (META.OPTIONS.useSkinningTexture)
            this._updateSkinningTexture();
    },

    /**
     * @ignore
     * @private
     */
    _generateGlobalSkeletonData: function (skeleton)
    {
        this._globalMatrices = [];
        this._bindMatrices = [];

        for (var i = 0; i < skeleton.numJoints; ++i) {
            this._globalMatrices[i] = new Matrix4x4();
            this._bindMatrices[i] = new Matrix4x4();
        }

        if (META.OPTIONS.useSkinningTexture) {
            this._skinningTexture = new Texture2D();
            this._skinningTexture.filter = TextureFilter.NEAREST_NOMIP;
            this._skinningTexture.wrapMode = TextureWrapMode.CLAMP;
        }
    },

    /**
     * @ignore
     * @private
     */
    _updateSkinningTexture: function ()
    {
        var data;

        return function()
        {
            data = data || new Float32Array(META.OPTIONS.maxSkeletonJoints * 3 * 4);
            var globals = this._bindMatrices;
            var len = globals.length;
            var j = 0;

            for (var r = 0; r < 3; ++r) {
                for (var i = 0; i < len; ++i) {
                    var m = globals[i]._m;

                    data[j++] = m[r];
                    data[j++] = m[r + 4];
                    data[j++] = m[r + 8];
                    data[j++] = m[r + 12];
                }

                for (i = len; i < META.OPTIONS.maxSkeletonJoints; ++i) {
                    data[j++] = 0.0;
                    data[j++] = 0.0;
                    data[j++] = 0.0;
                    data[j++] = 0.0;
                }
            }

            this._skinningTexture.uploadData(data, META.OPTIONS.maxSkeletonJoints, 3, false, TextureFormat.RGBA, DataType.FLOAT);
        }
    }()
};

/**
 * @classdesc
 * <p>ModelInstance is a scene graph node that contains Model geometry and a Material to use for rendering. It allows
 * reusing geometry multiple times in the scene.</p>
 * <p>ModelInstance creates a matching {@linkcode MeshInstance} for each {@linkcode Mesh} in the {@linkcode Model}, in
 * which the {@linkcode Mesh} is linked with its {@linkcode Material}.
 *
 * @property {Model} model The model to use as the geometry
 * @property {boolean} castShadows Defines whether or not this ModelInstance should cast shadows.
 * @property {number} numMeshInstances The amount of MeshInstance objects.
 * @property {Skeleton} skeleton The skeleton used for skinning animations.
 * @property {SkeletonPose} skeletonPose The SkeletonPose object defining the current local skeleton state.
 * @property {MorphPose} morphPose The MorphPose object defining the current morph target state.
 *
 * @constructor
 * @param model The {@linkcode Model} to use as the geometry
 * @param materials Either a single {@linkcode Material} to link to all Meshes in the Model, or an array of materials to link to the meshes in respective order.
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ModelInstance(model, materials)
{
    Entity.call(this);

    this._meshBounds = new BoundingAABB();
    this._model = null;
    this._meshInstances = [];
    this._castShadows = true;
    this._skeletonMatrices = null;
    this._morphPose = null;
    this._meshInstancesInvalid = false;
    this._skeletonPose = null;

    this.init(model, materials);
}

ModelInstance.prototype = Object.create(Entity.prototype, {
    model:
        {
            get: function() { return this._model; }
        },

    castShadows: {
        get: function()
        {
            return this._castShadows;
        },

        set: function(value)
        {
            this._castShadows = value;
        }
    },

    numMeshInstances: {
        get: function ()
        {
            return this._meshInstances.length;
        }
    },

    skeleton: {
        get: function() {
            return this._model.skeleton;
        }
    },

    /**
     * The global matrices defining the skeleton pose. This could be a Float32Array with flat matrix data, or a texture
     * containing the data (depending on the capabilities). This is usually set by {@linkcode SkeletonAnimation}, and
     * should not be handled manually.
     *
     * @ignore
     */
    skeletonMatrices: {
        get: function()
        {
            return this._skeletonPose? this._skeletonPose.getBindMatrices(this._model._skeleton) : null;
        }
    },

    skeletonPose: {
        get: function()
        {
            return this._skeletonPose;
        },

        set: function(value)
        {
            this._skeletonPose = value;
        }

    },

    morphPose: {
        get: function() {
            return this._morphPose;
        },

        set: function(value) {
            if (this._morphPose)
                this._morphPose.onChange.unbind(this._onMorphChanged);

            this._morphPose = value;

            if (this._morphPose) {
                this._morphPose.onChange.bind(this._onMorphChanged, this);
                this._onMorphChanged();
            }
            else
                this._clearMorph();
        }
    }
});

/**
 * Init allows us to leave the constructor empty and initialize the model lazily.
 * @param model The {@linkcode Model} to use as the geometry
 * @param materials Either a single {@linkcode Material} to link to all Meshes in the Model, or an array of materials to link to the meshes in respective order.
 */
ModelInstance.prototype.init = function(model, materials)
{
    if (this._model || this._materials)
        throw new Error("ModelInstance already initialized");

    if (materials)
        this._materials = materials instanceof Array? materials : [ materials ];

    if (model) {
        this._model = model;

        if (model.skeleton)
            this._generateDefaultSkeletonPose();

        model.onMeshesChange.bind(this._onModelChange, this);
        model.onSkeletonChange.bind(this._onSkeletonChange, this);
        this._onModelChange();
    }

    this._invalidateWorldBounds();
    this._updateMeshInstances();
};

/**
 * Forces all MeshInstances in the ModelInstance to use the material.
 */
ModelInstance.prototype.assignMaterial = function(material)
{
    if (this._meshInstancesInvalid) this._updateMeshInstances();

    for (var i = 0; i < this._meshInstances.length; ++i) {
        this._meshInstances[i].material = material;
    }
};

/**
 * Gets the {@linkcode MeshInstance} at the given index.
 */
ModelInstance.prototype.getMeshInstance = function(index)
{
    return this._meshInstances[index];
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._generateDefaultSkeletonPose = function()
{
    this._skeletonPose = new SkeletonPose();
    this._skeletonPose._generateDefault(this._model._skeleton);
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._updateMeshInstances = function()
{
    this._meshInstances = [];
    var maxIndex = this._materials.length - 1;

    for (var i = 0; i < this._model.numMeshes; ++i) {
        this._meshInstances.push(new MeshInstance(this._model.getMesh(i), this._materials[Math.min(i, maxIndex)]));
    }

    this._meshInstancesInvalid = false;
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._onSkeletonChange = function()
{
    for (var i = 0; i < this._meshInstances.length; ++i) {
        this._meshInstances[i].material._setUseSkinning(!!this._model.skeleton);
    }

    if (this._model.skeleton) {
        this._generateDefaultSkeletonPose();
    }
    else
        this._skeletonPose = null;
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._onModelChange = function()
{
    this._meshInstancesInvalid = true;
    this._invalidateWorldBounds();
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._clearMorph = function()
{
    var numTargets = capabilities.NUM_MORPH_TARGETS;
    var numMeshes = this._meshInstances.length;

    for (var t = 0; t < numTargets; ++t) {
        for (var i = 0; i < numMeshes; ++i) {
            this._meshInstances[i].setMorphTarget(t, null, 0);
        }
    }
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._onMorphChanged = function()
{
    var numTargets = capabilities.NUM_MORPH_TARGETS;
    var numMeshes = this._meshInstances.length;

    for (var t = 0; t < numTargets; ++t) {
        var target = this._morphPose.getMorphTarget(t);
        if (target) {
            var weight = this._morphPose.getWeight(target.name);
            for (var i = 0; i < numMeshes; ++i) {
                var meshInstance = this._meshInstances[i];
                meshInstance.setMorphTarget(t, target.getVertexBuffer(i), weight);
            }
        }
        else {
            for (i = 0; i < numMeshes; ++i) {
                this._meshInstances[i].setMorphTarget(t, null, 0.0);
            }
        }
    }
};

/**
 * @ignore
 * @private
 */
ModelInstance.prototype._updateWorldBounds = function()
{
    if (this._meshInstancesInvalid) this._updateMeshInstances();
    Entity.prototype._updateWorldBounds.call(this);
    this._meshBounds.transformFrom(this._model.localBounds, this.worldMatrix);
    this._worldBounds.growToIncludeBound(this._meshBounds);
};

/**
 * @ignore
 */
ModelInstance.prototype.acceptVisitor = function(visitor)
{
    if (this._meshInstancesInvalid) this._updateMeshInstances();
    visitor.visitModelInstance(this, this.worldMatrix, this.worldBounds);
    Entity.prototype.acceptVisitor.call(this, visitor);
};

/**
 * @ignore
 */
ModelInstance.prototype.toString = function()
{
    return "[ModelInstance(name=" + this._name + ")]";
};

/**
 * @classdesc
 *
 * This is basically only used internally for bounding box stuff
 *
 * @ignore
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DebugModelInstance(model, materials)
{
    ModelInstance.call(this, model, materials);
}

DebugModelInstance.prototype = Object.create(ModelInstance.prototype);

DebugModelInstance.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INHERIT);
};

/**
 * @classdesc
 *
 * DebugBoundsComponent is a component that allows rendering the world-space bounds of scene objects.
 *
 * @property {Color} color The color used to render the debug bounds.
 *
 * @constructor
 *
 * @param {Color} color The color used to render the debug bounds.
 */
function DebugBoundsComponent(color)
{
    Component.call(this);
    this._initModelInstance();
    if (color)
        this._material.color = color;
}

DebugBoundsComponent.prototype = Object.create(Component.prototype, {
    color: {
        get: function ()
        {
            return this._material.color;
        },
        set: function (value)
        {
            this._material.color = value;
        }
    }
});

/**
 * @ignore
 */
DebugBoundsComponent.prototype.onAdded = function()
{
    this.entity.attach(this._modelInstance);
};

/**
 * @ignore
 */
DebugBoundsComponent.prototype.onRemoved = function()
{
    this.entity.detach(this._modelInstance);
    this._modelInstance = null;
};

/**
 * @ignore
 */
DebugBoundsComponent.prototype.onUpdate = function(dt)
{
    var inverse = new Matrix4x4();
    return function(dt) {
        var worldBounds = this.entity.worldBounds;
        var matrix = this._modelInstance.matrix;

        inverse.inverseAffineOf(this.entity.worldMatrix);
        matrix.fromScale(worldBounds._halfExtentX, worldBounds._halfExtentY, worldBounds._halfExtentZ);
        matrix.setColumn(3, worldBounds.center);
        matrix.append(inverse);

        this._modelInstance.matrix = matrix;
    }
}();

/**
 * @ignore
 * @private
 */
DebugBoundsComponent.prototype._initModelInstance = function()
{
    // TODO: Allow rendering spherical bounds
    var box = new WireBoxPrimitive({
        width: 2
    });

    this._material = new BasicMaterial();
    this._material.elementType = ElementType.LINES;
    this._material.doubleSided = true;
    this._material.lightingModel = LightingModel.Unlit;
    this._modelInstance = new DebugModelInstance(box, this._material);
};

/**
 * @classdesc
 * Keeps track and updates entities
 *
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function EntityEngine()
{
    this._updateableEntities = [];
    onPreFrame.bind(this._update, this);
}

EntityEngine.prototype =
{
    registerEntity: function(entity)
    {
        entity._onRequireUpdatesChange.bind(this._onEntityUpdateChange, this);
        if (entity._requiresUpdates)
            this._addUpdatableEntity(entity);
    },

    unregisterEntity: function(entity)
    {
        entity._onRequireUpdatesChange.unbind(this);
        if (entity._requiresUpdates)
            this._removeUpdatableEntity(entity);
    },

    _onEntityUpdateChange: function(entity)
    {
        if (entity._requiresUpdates)
            this._addUpdatableEntity(entity);
        else
            this._removeUpdatableEntity(entity);
    },

    _addUpdatableEntity: function(entity)
    {
        this._updateableEntities.push(entity);
    },

    _removeUpdatableEntity: function(entity)
    {
        var index = this._updateableEntities.indexOf(entity);
        this._updateableEntities.splice(index, 1);
    },

    _update: function(dt)
    {
        var entities = this._updateableEntities;
        var len = entities.length;
        for (var i = 0; i < len; ++i)
            entities[i].update(dt);
    }
};

/**
 * @classdesc
 * Scene forms the base to contain the entire scene graph. It contains a hierarchical structure including
 * {@linknode ModelInstance}, lights, cameras, etc.
 *
 * @param {SceneNode} [rootNode] An optional scene node to use as a root. Useful if an entire scene hierarchy was already loaded.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Scene(rootNode)
{
    // the default partition is a BVH node
    //  -> or this may need to become an infinite bound node?
    this._rootNode = rootNode || new SceneNode();
    this._rootNode._setScene(this);
    this._skybox = null;
    this._entityEngine = new EntityEngine();
}

Scene.prototype = {
    /**
     * The rootnode of the scene.
     */
    get rootNode() { return this._rootNode; },

    /**
     * The {@linkcode Skybox} to use when rendering the scene.
     */
    get skybox() { return this._skybox; },
    set skybox(value) { this._skybox = value; },

    /**
     * Finds a scene node with the given name somewhere in the Scene.
     */
    findNodeByName: function(name)
    {
        return this._rootNode.findNodeByName(name);
    },

    /**
     * Finds a material with the given name somewhere in the Scene.
     */
    findMaterialByName: function(name)
    {
        return this._rootNode.findMaterialByName(name);
    },

    /**
     * Attaches a child to the root node.
     */
    attach: function(child)
    {
        this._rootNode.attach(child);
    },

    /**
     * Removes a child from the root node.
     */
    detach: function(child)
    {
        this._rootNode.detach(child);
    },

    /**
     * The amount of children in the scene root node.
     */
    get numChildren()
    {
        return this._rootNode.numChildren;
    },

    /**
     * Gets the child object at the given index.
     */
    getChild: function(index)
    {
        return this._rootNode.getChild(index);
    },

    /**
     * Returns whether or not the child object is attached to the root node.
     */
    contains: function(child)
    {
        this._rootNode.contains(child);
    },

    /**
     * @ignore
     */
    acceptVisitor: function(visitor)
    {
        visitor.visitScene(this);
        // assume root node will always qualify
        this._rootNode.acceptVisitor(visitor);
    },

    /**
     * @ignore
     */
    get entityEngine()
    {
        return this._entityEngine;
    },

    /**
     * The bounding volume for the entire scene in world coordinates.
     */
    get worldBounds()
    {
        return this._rootNode.worldBounds;
    }
};

/**
 * @classdesc
 * SkyboxMaterial forms the default material to render skyboxes.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkyboxMaterial(texture)
{
    Material.call(this);

    var vertexShader = ShaderLibrary.get("default_skybox_vertex.glsl");
    var fragmentShader = ShaderLibrary.get("default_skybox_fragment.glsl");

    this.writeDepth = false;
    this.cullMode = CullMode.NONE;

    var pass = new UnlitPass(vertexShader, fragmentShader);

    // if no draw buffers, normals and specular don't need to be updated
    this.setPass(MaterialPass.BASE_PASS, pass);
    this._renderPath = RenderPath.FORWARD_FIXED;
    this._initialized = true;
    this._renderOrder = Number.POSITIVE_INFINITY;

    this.setTexture("hx_skybox", texture);
}

SkyboxMaterial.prototype = Object.create(Material.prototype);

/**
 * @classdesc
 * Skybox provides a backdrop "at infinity" for the scene.
 *
 * @param materialOrTexture Either a {@linkcode TextureCube} or a {@linkcode Material} used to render the skybox. If a
 * texture is passed, {@linkcode SkyboxMaterial} is used as material.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Skybox(materialOrTexture)
{
    if (!(materialOrTexture instanceof Material))
        materialOrTexture = new SkyboxMaterial(materialOrTexture);

    //var model = new HX.PlanePrimitive({alignment: HX.PlanePrimitive.ALIGN_XY, width: 2, height: 2});
    var model = new BoxPrimitive({width: 1, invert: true});
    model.localBounds.clear(BoundingVolume.EXPANSE_INFINITE);
    this._modelInstance = new ModelInstance(model, materialOrTexture);
}

Skybox.prototype = {};

/**
 * Terrain provides a paged terrain engine with dynamic LOD. The heightmapping itself happens in the Material.
 *
 * @property {number} terrainSize The world size for the entire terrain.
 *
 * @param terrainSize The world size for the entire terrain.
 * @param minElevation The minimum elevation for the terrain (maps to heightmap value 0)
 * @param maxElevation The maximum elevation for the terrain (maps to heightmap value 1)
 * @param numLevels The amount of levels the page tree should contain. More levels means more(!) triangles.
 * @param material The {@linkcode Material} to use when rendering the terrain.
 * @param detail The grid size.
 * @constructor
 *
 * @extends SceneNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Terrain(terrainSize, minElevation, maxElevation, numLevels, material, detail)
{
    SceneNode.call(this);

    this._terrainSize = terrainSize || 512;
    this._minElevation = minElevation;
    this._maxElevation = maxElevation;
    this._numLevels = numLevels || 4;
    detail = detail || 32;
    var gridSize = Math.ceil(detail * .5) * 2.0; // round off to 2

    // cannot bitshift because we need floating point result
    this._snapSize = (this._terrainSize / detail) / Math.pow(2, this._numLevels);

    this._material = material;
    material.setUniform("hx_elevationOffset", minElevation);
    material.setUniform("hx_elevationScale", maxElevation - minElevation);

    this._initModels(gridSize);
    this._initTree();
}

// TODO: Allow setting material
Terrain.prototype = Object.create(SceneNode.prototype, {
    terrainSize: {
        get: function() {
            return this._terrainSize;
        }
    }
});

/**
 * @ignore
 * @private
 */
Terrain.prototype._createModel = function(size, numSegments, subDiv, lastLevel)
{
    var rcpNumSegments = 1.0 / numSegments;
    var mesh = new Mesh();
    var cellSize = size * rcpNumSegments;
    var halfCellSize = cellSize * .5;

    mesh.addVertexAttribute("hx_position", 3);
    mesh.addVertexAttribute("hx_normal", 3);
    mesh.addVertexAttribute("hx_cellSize", 1);

    var vertices = [];
    var indices = [];

    var numZ = subDiv? numSegments - 1: numSegments;

    var w = numSegments + 1;

    for (var zi = 0; zi <= numZ; ++zi) {
        var z = (zi*rcpNumSegments - .5) * size;

        for (var xi = 0; xi <= numSegments; ++xi) {
            var x = (xi*rcpNumSegments - .5) * size;

            // the one corner that attaches to higher resolution neighbours needs to snap like them
            var s = !lastLevel && xi === numSegments && zi === numSegments? halfCellSize : cellSize;
            vertices.push(x, 0, z, 0, 1, 0, s);

            if (xi !== numSegments && zi !== numZ) {
                var base = xi + zi * w;

                indices.push(base, base + w + 1, base + w);
                indices.push(base, base + 1, base + w + 1);
            }
        }
    }

    var highIndexX = vertices.length / 7;

    if (subDiv) {
        z = (numSegments * rcpNumSegments - .5) * size;
        for (xi = 0; xi <= numSegments; ++xi) {
            x = (xi*rcpNumSegments - .5) * size;
            vertices.push(x, 0, z, 0, 1, 0);
            vertices.push(halfCellSize);

            if (xi !== numSegments) {
                base = xi + numZ * w;
                vertices.push(x + halfCellSize, 0, z, 0, 1, 0, halfCellSize);
                indices.push(base, highIndexX + xi * 2 + 1, highIndexX + xi * 2);
                indices.push(base + 1, highIndexX + xi * 2 + 1, base);
                indices.push(highIndexX + xi * 2 + 2, highIndexX + xi * 2 + 1, base + 1);
            }
        }
    }

    mesh.setVertexData(vertices, 0);
    mesh.setIndexData(indices);

    var model = new Model(mesh);
    model.localBounds.growToIncludeMinMax(new Float4(0, this._minElevation, 0), new Float4(0, this._maxElevation, 0));
    return model;
};

/**
 * @ignore
 * @private
 */
Terrain.prototype._initModels = function(gridSize)
{
    this._models = [];
    var modelSize = this._terrainSize * .25;

    for (var level = 0; level < this._numLevels; ++level) {
        if (level === this._numLevels - 1) {
            // do not subdivide max detail
            var model = this._createModel(modelSize, gridSize, false, true);
            this._models[level] = {
                edge: model,
                corner: model
            };
        }
        else {
            this._models[level] = {
                edge: this._createModel(modelSize, gridSize, true, false),
                corner: this._createModel(modelSize, gridSize, false, false)
            };
        }

        modelSize *= .5;

    }
};

/**
 * @ignore
 * @private
 */
Terrain.prototype._initTree = function()
{
    var level = 0;
    var size = this._terrainSize * .25;
    for (var yi = 0; yi < 4; ++yi) {
        var y = this._terrainSize * (yi / 4 - .5) + size * .5;
        for (var xi = 0; xi < 4; ++xi) {
            var x = this._terrainSize * (xi / 4 - .5) + size * .5;
            var subX = 0, subY = 0;

            if (xi === 1)
                subX = 1;
            else if (xi === 2)
                subX = -1;

            if (yi === 1)
                subY = 1;
            else if (yi === 2)
                subY = -1;

            if (subX && subY) {
                this._subDivide(x, y, subX, subY, level + 1, size * .5);
            }
            else {
                var rotation = 0;
                var mode = "edge";
                var add = true;
                // if both are 0, we have a corner
                if (xi % 3 === yi % 3) {
                    mode = "corner";
                    if (xi === 0 && yi === 0) rotation = 0;
                    if (xi === 0 && yi === 3) rotation = 1;
                    if (xi === 3 && yi === 3) rotation = 2;
                    if (xi === 3 && yi === 0) rotation = -1;
                }
                else {
                    if (yi === 3) rotation = 2;
                    if (xi === 3) rotation = -1;
                    if (xi === 0) rotation = 1;
                }
                if (add)
                    this._addModel(x, y, level, rotation, mode);
            }
        }
    }
};

/**
 * @ignore
 * @private
 */
Terrain.prototype._addModel = function(x, y, level, rotation, mode)
{
    var modelInstance = new ModelInstance(this._models[level][mode], this._material);
    modelInstance.position.set(x, 0, y);
    modelInstance.rotation.fromAxisAngle(Float4.Y_AXIS, rotation * Math.PI * .5);
    this.attach(modelInstance);
};

/**
 * @ignore
 * @private
 */
Terrain.prototype._subDivide = function(x, y, subX, subY, level, size)
{
    size *= .5;

    for (var yi = -1; yi <= 1; yi += 2) {
        for (var xi = -1; xi <= 1; xi += 2) {
            if((xi !== subX || yi !== subY) || level === this._numLevels - 1) {
                var rotation = 0;
                var mode = "corner";
                // messy, I know
                if (x < 0 && y < 0) {
                    if (xi < 0 && yi > 0) {
                        mode = "edge";
                        rotation = 1;
                    }
                    else if (xi > 0 && yi < 0) {
                        mode = "edge";
                        rotation = 0;
                    }
                    else
                        rotation = 0;
                }
                else if (x > 0 && y > 0) {
                    if (xi > 0 && yi < 0) {
                        mode = "edge";
                        rotation = -1;
                    }
                    else if (xi < 0 && yi > 0) {
                        mode = "edge";
                        rotation = 2;
                    }
                    else
                        rotation = 2;
                }
                else if (x < 0 && y > 0) {
                    if (xi > 0 && yi > 0) {
                        mode = "edge";
                        rotation = 2;
                    }
                    else if (xi < 0 && yi < 0) {
                        mode = "edge";
                        rotation = 1;
                    }
                    else
                        rotation = 1;
                }
                else if (x > 0 && y < 0) {
                    if (xi < 0 && yi < 0) {
                        mode = "edge";
                        rotation = 0;
                    }
                    else if (xi > 0 && yi > 0) {
                        mode = "edge";
                        rotation = -1;
                    }
                    else
                        rotation = -1;
                }

                this._addModel(x + size * xi, y + size * yi, level, rotation, mode);
            }
        }
    }

    if (level < this._numLevels - 1)
        this._subDivide(x + size * subX, y + size * subY, subX, subY, level + 1, size);
};

/**
 * @ignore
 */
Terrain.prototype.acceptVisitor = function(visitor)
{
    // typechecking isn't nice, but it does what we want
    if (visitor instanceof RenderCollector) {
        var pos = visitor._camera.position;
        this.position.x = Math.floor(pos.x / this._snapSize) * this._snapSize;
        this.position.z = Math.floor(pos.z / this._snapSize) * this._snapSize;
    }

    SceneNode.prototype.acceptVisitor.call(this, visitor);
};

/**
 * @ignore
 */
Terrain.prototype._updateWorldBounds = function ()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @classdesc
 * CompositeComponent is a {@linkcode Component} that can be used to group together multiple Components. It's usually
 * subclassed to provide easy building blocks for certain combinations of Components.
 *
 * @constructor
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CompositeComponent()
{
    Component.call(this);
    this._subs = [];
}

CompositeComponent.prototype = Object.create(Component.prototype);

/**
 * Adds a {@linkcode Component} to the composite. Usually called in the constructor of the subclass.
 */
CompositeComponent.prototype.addComponent = function(comp)
{
    if (comp._entity)
        throw new Error("Component already added to an entity!");

    this._subs.push(comp);
};

/**
 * Removes a {@linkcode Component} to the composite.
 */
CompositeComponent.prototype.removeComponent = function(comp)
{
    var index = this._subs.indexOf(comp);
    if (index >= 0)
        this._subs.splice(index, 1);
};

/**
 * @inheritDoc
 */
CompositeComponent.prototype.onAdded = function()
{
    for (var i = 0; i < this._subs.length; ++i) {
        var comp = this._subs[i];
        comp._entity = this._entity;
        comp.onAdded();
    }
};

/**
 * @inheritDoc
 */
CompositeComponent.prototype.onRemoved = function()
{
    for (var i = 0; i < this._subs.length; ++i) {
        var comp = this._subs[i];
        comp.onRemoved();
        comp._entity = null;
    }
};

/**
 * @inheritDoc
 */
CompositeComponent.prototype.onUpdate = function(dt)
{
    var len = this._subs.length;
    for (var i = 0; i < len; ++i) {
        var comp = this._subs[i];
        comp.onUpdate(dt);
    }
};

/**
 * @classdesc
 * KeyFrame is a time/value pair for use in {@AnimationClip}.
 * @param time The time in milliseconds of the key frame.
 * @param value The value of the key frame. This can for example be a {@linkcode SkeletonPose} for skinned animation clip.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function KeyFrame(time, value)
{
    this.time = time || 0.0;
    this.value = value;
}

/**
 * @classdesc
 * AnimationClip is a resource that contains key frames (time / value pairs). AnimationClip itself has no playback state,
 * but is only used as a shareable data resource. It can be passed to {@linkcode AnimationPlayhead} or its wrappers
 * (fe: {@linkcode SkeletonClipNode}) which will manage the play head position and allow animations.
 *
 * @constructor
 *
 * @see {@linkcode KeyFrame}
 * @see {@linkcode AnimationPlayhead}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationClip()
{
    this._name = null;
    this._keyFrames = [];
    this._duration = 0;
    this._looping = true;
}

AnimationClip.prototype =
{
    /**
     * Defines whether this clip should repeat or not.
     */
    get looping()
    {
        return this._looping;
    },

    set looping(value)
    {
        this._looping = value;
    },

    /**
     * The name of the animation clip.
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    /**
     * The amount of key frames in this clip.
     */
    get numKeyFrames()
    {
        return this._keyFrames.length;
    },

    /**
     * The total duration of the clip, in milliseconds.
     */
    get duration()
    {
        return this._duration;
    },

    /**
     * Adds a keyframe. Last keyframe is usually the same pose as the first and serves as an "end marker"
     * @param frame A KeyFrame containing a SkeletonPose
     */
    addKeyFrame: function(frame)
    {
        this._keyFrames.push(frame);
        if (frame.time > this._duration) this._duration = frame.time;
    },

    /**
     * Sorts the key frames based on their time. Only call this if for some reason the keyframes were added out of order.
     */
    sortKeyFrames: function()
    {
        this._keyFrames.sort(function(a, b) {
            return a.time - b.time;
        });
    },

    /**
     * Returns the key frame with the given index.
     */
    getKeyFrame: function(index)
    {
        return this._keyFrames[index];
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[AnimationClip(name=" + this.name + ")";
    }
};

/**
 * @classdesc
 * AnimationPlayhead is a 'helper' class that just updates a play head. Returns the keyframes and the ratio between them.
 * This is for example used in {@linkcode SkeletonClipNode}.
 *
 * @param clip {AnimationClip} The clip to play.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationPlayhead(clip)
{
    this._clip = clip;
    this._time = 0;
    this._timeScale = 1.0;
    this._isPlaying = true;
    this._currentFrameIndex = 0;
    this._timeChanged = true;

    this._looping = clip.looping;

    /**
     * The number of times the playhead has wrapped during the last update. Useful when moving skeleton root joint, fe.
     * @type {number}
     */
    this.wraps = 0;

    /**
     * The first before frame the playhead's current position.
     * @type {number}
     */
    this.frame1 = 0;

    /**
     * The frame right after the playhead's current position.
     * @type {number}
     */
    this.frame2 = 0;

    /**
     * The ratio of the play head's position between frame1 and frame2. This is used to interpolate between frame1 and frame2's keyframe values.
     * @type {number}
     */
    this.ratio = 0;
}

AnimationPlayhead.prototype =
    {
        /**
         * A value to control the playback speed.
         */
        get timeScale() { return this._timeScale; },
        set timeScale(value) { this._timeScale = value; },

        /**
         * Determines whether the animation should loop or not. By default, it uses the value determined by the
         * AnimationClip, but can be overridden.
         */
        get looping() { return this._looping; },
        set looping(value) { this._looping = value;},

        /**
         * The current time in milliseconds of the play head.
         */
        get time() { return this._time; },
        set time(value)
        {
            if (!this._looping)
                value = MathX.clamp(value, 0, this._clip.duration);

            if (this._time === value) return;
            this._time = value;
            this._timeChanged = true;
        },

        /**
         * Starts updating the play head when update(dt) is called.
         */
        play: function()
        {
            this._isPlaying = true;
        },

        /**
         * Stops updating the play head when update(dt) is called.
         */
        stop: function()
        {
            this._isPlaying = false;
        },

        /**
         * This needs to be called every frame.
         * @param dt The time passed since last frame in milliseconds.
         * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
         */
        update: function(dt)
        {
            var playheadUpdated = (this._isPlaying && dt !== 0.0);
            if (!playheadUpdated && !this._timeChanged)
                return false;

            this._timeChanged = false;

            if (this._isPlaying) {
                dt *= this._timeScale;
                this._time += dt;
            }

            var clip = this._clip;
            // the last keyframe is just an "end marker" to interpolate with, it has no duration
            var numKeyFrames = clip.numKeyFrames;
            var numBaseFrames = numKeyFrames - 1;
            var duration = clip.duration;
            var wraps = 0;

            if (!this._looping) {
                if (this._time > duration) {
                    this._time = duration;
                    this._isPlaying = false;
                }
                else if (this._time < 0) {
                    this._time = 0;
                    this._isPlaying = false;
                }
            }

            var frameA, frameB;

            if (dt >= 0) {
                // could replace the while loop with an if loop and calculate wrap with division, but it's usually not more
                // than 1 anyway
                while (this._looping && this._time >= duration) {
                    // reset playhead to make sure progressive update logic works
                    this._currentFrameIndex = 0;
                    this._time -= duration;
                    ++wraps;
                }

                do {
                    // advance play head
                    if (++this._currentFrameIndex === numKeyFrames) this._currentFrameIndex = 0;
                    frameB = clip.getKeyFrame(this._currentFrameIndex);
                } while (frameB.time < this._time);

                --this._currentFrameIndex;
                frameA = clip.getKeyFrame(this._currentFrameIndex);
            }
            else {
                while (this._looping && this._time < 0) {
                    // reset playhead to make sure progressive update logic works
                    this._currentFrameIndex = numBaseFrames;
                    this._time += duration;
                    ++wraps;
                }

                ++this._currentFrameIndex;
                do {
                    if (--this._currentFrameIndex < 0) this._currentFrameIndex = numKeyFrames;
                    frameA = clip.getKeyFrame(this._currentFrameIndex);
                } while (frameA.time > this._time);
            }

            this.wraps = wraps;
            this.frame1 = frameA;
            this.frame2 = frameB;
            this.ratio = (this._time - frameA.time) / (frameB.time - frameA.time);

            return true;
        }
    };

/**
 * LayeredAnimation combines a bunch of AnimationLayer objects into a single manageable animation. This acts globally,
 * so it's not a {@linkcode Component} belonging to an {@linkcode Entity}
 *
 * @constructor
 */
function LayeredAnimation()
{
    this._layers = [];
    this._time = 0;
    this._timeScale = 1;
    this._name = null;
    this._looping = true;
}

LayeredAnimation.prototype = {
    /**
     * The name of the animation.
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    /**
     * A value to control the playback speed.
     */
    get timeScale()
    {
        return this._timeScale;
    },
    set timeScale(value)
    {
        this._timeScale = value;
    },

    /**
     * The current time in milliseconds of the play head.
     */
    get time()
    {
        return this._time;
    },
    set time(value)
    {
        this._time = value;
        for (var i = 0; i < this._layers.length; ++i) {
            this._layers[i].time = value;
        }
    },

    /**
     * Determines whether the animation should loop or not. By default, it uses the value determined by the
     * AnimationClip, but can be overridden.
     */
    get looping()
    {
        return this._looping;
    },
    set looping(value)
    {
        this._looping = value;
        for (var i = 0; i < this._layers.length; ++i) {
            this._layers[i].looping = true;
        }
    },

    /**
     * Adds a layer to the animation
     * @param layer
     */
    addLayer: function (layer)
    {
        this._layers.push(layer);
        layer.time = this._time;
        layer.looping = this._looping;
    },

    /**
     * Removes a layer from the animation
     * @param layer
     */
    removeLayer: function (layer)
    {
        var index = this._layers.indexOf(layer);
        if (index >= 0)
            this._layers.splice(index, 1);
    },

    /**
     * Starts playback of the animation
     */
    play: function ()
    {
        onPreFrame.bind(this._update, this);
    },

    /**
     * Stops playback of the animation
     */
    stop: function ()
    {
        onPreFrame.unbind(this._update);
    },

    /**
     * This needs to be called every frame.
     * @param dt The time passed since last frame in milliseconds.
     */
    _update: function (dt)
    {
        dt *= this._timeScale;

        this._time += dt;

        var len = this._layers.length;
        for (var i = 0; i < len; ++i) {
            this._layers[i].update(dt);
        }
    }
};

/**
 * @classdesc
 * AnimationLayer is a wrapper for a clip and a playhead that targets a specific object and that can be used in
 * LayeredAnimation.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayer(targetObject, propertyName, clip)
{
    this._name = null;
    this._clip = clip;
    this._playhead = new AnimationPlayhead(clip);
    this._targetObject = targetObject;
    this._propertyName = propertyName;
}

AnimationLayer.prototype =
{
    /**
     * Defines whether this layer should repeat or not.
     */
    get looping()
    {
        return this._playhead.looping;
    },

    set looping(value)
    {
        this._playhead.looping = value;
    },

    /**
     * The current time in milliseconds of the play head.
     */
    get time() { return this._playhead.time; },
    set time(value) { this._playhead.time = value; },

    /**
     * The total duration of the layer, in milliseconds.
     */
    get duration()
    {
        return this._clip.duration;
    },

    /**
     * Returns the key frame with the given index.
     */
    getKeyFrame: function(index)
    {
        return this._clip.getKeyFrame(index);
    },

    /**
     * This needs to be called every frame.
     * @param dt The time passed since last frame in milliseconds.
     * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
     */
    update: function(dt)
    {
        // this._playhead.update(dt);
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[AnimationLayer(name=" + this.name + ")";
    }
};

/**
 * @classdesc
 * AnimationLayerFloat4 is an {@linkcode AnimationLayer} targeting {@linkcode Float4} objects
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayerFloat4(targetObject, propertyName, clip)
{
    Debug.assert(targetObject[propertyName] instanceof Float4, "Type mismatch!");
    AnimationLayer.call(this, targetObject, propertyName, clip);
    this._skeletonPose = targetObject instanceof SkeletonJointPose? targetObject.skeletonPose : null;
}

AnimationLayerFloat4.prototype = Object.create(AnimationLayer.prototype);

/**
 * This needs to be called every frame.
 * @param dt The time passed since last frame in milliseconds.
 * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
 */
AnimationLayerFloat4.prototype.update = function (dt)
{
    var playhead = this._playhead;
    if (playhead.update(dt)) {
        this._targetObject[this._propertyName].lerp(playhead.frame1.value, playhead.frame2.value, playhead.ratio);
        if (this._skeletonPose) this._skeletonPose.invalidateGlobalPose();
    }
};

/**
 * @classdesc
 * AnimationLayerQuat is an {@linkcode AnimationLayer} targeting {@linkcode Quaternion} objects
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AnimationLayerQuat(targetObject, propertyName, clip)
{
    Debug.assert(targetObject[propertyName] instanceof Quaternion, "Type mismatch!");
    AnimationLayer.call(this, targetObject, propertyName, clip);
    this._skeletonPose = targetObject instanceof SkeletonJointPose? targetObject.skeletonPose : null;
}

AnimationLayerQuat.prototype = Object.create(AnimationLayer.prototype);

/**
 * This needs to be called every frame.
 * @param dt The time passed since last frame in milliseconds.
 * @returns {boolean} Whether or not the playhead moved. This can be used to spare further calculations if the old state is kept.
 */
AnimationLayerQuat.prototype.update = function (dt)
{
    var playhead = this._playhead;

    if (playhead.update(dt)) {
        this._targetObject[this._propertyName].slerp(playhead.frame1.value, playhead.frame2.value, playhead.ratio);
        if (this._skeletonPose) this._skeletonPose.invalidateGlobalPose();
    }
};

/**
 * @classdesc
 * MorphPose defines a certain configuration for blending several morph targets. While this can be used to directly
 * assign to a {@linkcode ModelInstance}, it's usually controlled through a component such as {@MorphAnimation}. Other
 * components could use several MorphPose objects in keyframes and tween between them over a timeline.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MorphPose()
{
    this._targets = [];
    this._weights = {};
    this._stateInvalid = true;
    this.onChange = new Signal();
}

MorphPose.prototype =
{
    /**
     * Gets the morph target as sorted by weight in update()
     * @param {number} index The index of the {@linkcode MorphTarget}
     * @returns {MorphTarget}
     */
    getMorphTarget: function(index)
    {
        return this._targets[index];
    },

    /**
     * The amount of morph targets used in this pose.
     * @returns {Number}
     */
    get numMorphTargets()
    {
        return this._targets.length;
    },

    /**
     * Adds a MorphTarget object to the pose.
     * @param {MorphTarget} morphTarget
     */
    addMorphTarget: function(morphTarget)
    {
        this._targets.push(morphTarget);
        this._weights[morphTarget.name] = 0.0;
        this._stateInvalid = true;
    },

    /**
     * Gets the weight of a morph target with the given name.
     * @param {string} name The name of the morph target.
     * @returns {number}
     */
    getWeight: function(name)
    {
        return this._weights[name];
    },

    /**
     * Sets the weight of a morph target with the given name.
     * @param {string} name The name of the morph target.
     * @param {number} value The new weight.
     */
    setWeight: function(id, value)
    {
        if (this._weights[id] !== value)
            this._stateInvalid = true;

        this._weights[id] = value;
    },

    /**
     * Updates the morph pose given the current weights. Usually called by a wrapping component. If no component is used,
     * update needs to be called manually.
     */
    update: function()
    {
        if (!this._stateInvalid) return;

        var w = this._weights;
        // sort by weights
        this._targets.sort(function(a, b) {
            return w[b.name] - w[a.name];
        });

        this._stateInvalid = false;

        this.onChange.dispatch();
    }
};

/**
 * @classdesc
 * MorphAnimation is a {@linkcode Component} that can be added to ModelInstances to control morph target animations. The Mesh objects
 * used by the ModelInstance's Model must contain morph data generated with {@linkcode Mesh#generateMorphData}.
 * Up to 8 morph targets can be active at a time. If more morph targets have a weight assigned to them, only those with
 * the highest weight are used.
 *
 * @property {number} numMorphTargets The amount of morph targets in total (active and non-active).
 *
 *
 * @param {Array} targets An Array of {@linkcode MorphTarget} objects.
 * @constructor
 *
 * @see {@linkcode MorphPose}
 * @see {@linkcode MorphTarget}
 * @see {@linkcode Mesh#generateMorphData}
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MorphAnimation(targets)
{
    Component.call(this);

    // some day, morph pose could also become a tree using and generating poses?
    this._morphPose = new MorphPose();
    for (var i = 0; i < targets.length; ++i) {
        this._morphPose.addMorphTarget(targets[i]);
    }
}

MorphAnimation.prototype = Object.create(Component.prototype,
    {
        numMorphTargets: {
            get: function() { return this._morphPose.numMorphTargets; }
        }
    }
);

/**
 * Retrieves the morph target at the given index, as sorted by weight.
 * @param {Number} index The index of the morph target.
 * @returns {MorphTarget}
 */
MorphAnimation.prototype.getMorphTarget = function(index)
{
    return this._morphPose.getMorphTarget(index);
};


/**
 * Sets the weight of the morph target with the given name.
 * @param {string} name The name of the morph target to influence.
 * @param {number} value The new weight of the morph target.
 */
MorphAnimation.prototype.setWeight = function(name, value)
{
    this._morphPose.setWeight(name, value);
};

/**
 * @ignore
 */
MorphAnimation.prototype.onAdded = function()
{
    this.entity.morphPose = this._morphPose;
};

/**
 * @ignore
 */
MorphAnimation.prototype.onRemoved = function()
{
    this.entity.morphPose = null;
};

/**
 * @ignore
 */
MorphAnimation.prototype.onUpdate = function(dt)
{
    this._morphPose.update(dt);
};

/**
 * @classdesc
 * MorphTarget defines the displacements per vertex that can be used to displace a Mesh. This can be used to animate
 * vertices between different poses. Several MorphTargets can be used in a {@linkcode MorphPose} or through a component
 * such as {@linkcode MorphAnimation}
 * A MorphTarget describes the offsets for a whole {@linkcode Model}, so several sets might be present (one for each {@linkcode Mesh}).
 *
 * @constructor
 *
 * @see {@linkcode MorphAnimation}
 * @see {@linkcode MorphPose}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MorphTarget()
{
    // So basically, every morph pose is a list of vertex buffers, one for each Mesh in the Model
    // the Mesh objects will have their hx_morphPositionN overwritten depending on their weights
    this.name = null;
    this._vertexBuffers = [];
    this._numVertices = [];
}

MorphTarget.prototype =
{
    /**
     * @ignore
     */
    getNumVertices: function(meshIndex)
    {
        return this._numVertices[meshIndex];
    },

    /**
     * @ignore
     */
    getVertexBuffer: function(meshIndex)
    {
        return this._vertexBuffers[meshIndex];
    },

    /**
     * Initializes the current MorphTarget object.
     * @param {Array} positions An Array of 3 floats per vertex (x, y, z), containing the displacement vectors. The size must match the vertex count of the target Mesh.
     * @param {number} meshIndex The meshIndex for which to assign the vertices.
     */
    init: function(positions, meshIndex)
    {
        this._numVertices[meshIndex] = positions.length / 3;

        this._vertexBuffers[meshIndex] = new VertexBuffer();
        this._vertexBuffers[meshIndex].uploadData(new Float32Array(positions));
    }
};

/**
 * @classdesc
 * Skeleton defines the collection of joints used by the model to handle skinned animations.
 *
 * @see {@linkcode SkeletonJoint}
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Skeleton()
{
    this._applyInverseBindPose = true;
    this._joints = [];
    this._name = "";
}

Skeleton.prototype =
{
    /**
     * Defines whether or not the inverse bind pose should be applied for this skeleton.
     */
    get applyInverseBindPose()
    {
        return this._applyInverseBindPose;
    },

    set applyInverseBindPose(value)
    {
        this._applyInverseBindPose = value;
    },

    /**
     * The amount of joints in the Skeleton.
     * @returns {Number}
     */
    get numJoints()
    {
        return this._joints.length;
    },

    /**
     * Adds a joint to the Skeleton.
     * @param {SkeletonJoint} joint
     */
    addJoint: function(joint)
    {
        this._joints.push(joint);
    },

    /**
     * Gets a joint at the specified index.
     * @param {number} index
     */
    getJoint: function(index)
    {
        return this._joints[index];
    },

    /**
     * The name of this Skeleton.
     */
    get name()
    {
        return this._name;
    },

    set name(value)
    {
        this._name = value;
    },

    /**
     * @ignore
     */
    toString: function()
    {
        return "[Skeleton(name=" + this.name + ")";
    }
};

/**
 * @classdesc
 * An abstract base class for nodes in a {@linkcode SkeletonBlendTree}
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBlendNode()
{
    this._rootJointDeltaPosition = new Float4();
    this._valueID = null;
    this._pose = new SkeletonPose();
}

SkeletonBlendNode.prototype =
{
    /**
     * @ignore
     */
    update: function(dt, transferRootJoint)
    {
    },

    /**
     * @ignore
     */
    setValue: function(id, value)
    {
        if (this._valueID === id) {
            this._applyValue(value);
        }
    },   // a node can have a value associated with it, either time, interpolation value, directional value, ...

    /**
     * @ignore
     */
    get rootJointDeltaPosition() { return this._rootJointDeltaPosition; },

    /**
     * @ignore
     */
    get numJoints() { return -1; },

    /**
     * The value ID linked to this node. The meaning is context dependent.
     *
     * @deprecated
     */
    get valueID() { return this._valueID; },
    set valueID(value) { this._valueID = value; },

    _applyValue: function(value) {}
};

/**
 * @classdesc
 * A node in a SkeletonBlendTree to contain a single animation clip. An AnimationClip on its own is simply a resource and
 * does not contain playback state so it can be used across different animation instances. That relevant state is kept here.
 *
 * @property {number} timeScale A value to control the playback speed.
 * @property {number} time The current time in milliseconds of the play head.
 *
 * @param {AnimationClip} clip The animation clip to be played.
 * @constructor
 *
 * @extends  SkeletonBlendNode
 *
 * @see {@linkcode AnimationClip}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonClipNode(clip)
{
    SkeletonBlendNode.call(this);
    this._playhead = new AnimationPlayhead(clip);
    this._rootPosition = new Float4();

    this._numJoints = clip.getKeyFrame(0).value._jointPoses.length;

    var lastFramePos = clip.getKeyFrame(clip.numKeyFrames - 1).value._jointPoses[0].position;
    var firstFramePos = clip.getKeyFrame(0).value._jointPoses[0].position;
    this._clipRootDelta = Float4.subtract(lastFramePos, firstFramePos);
}

SkeletonClipNode.prototype = Object.create(SkeletonBlendNode.prototype,
    {
        /**
         * @ignore
         */
        numJoints: {
            get: function() { return this._numJoints; }
        },

        timeScale: {
            get: function() { return this._playhead.timeScale; },
            set: function(value) { this._playhead.timeScale = value; }
        },

        time: {
            get: function() { return this._playhead; },
            set: function(value)
            {
                this._playhead.time = value;
                this._timeChanged = true;
            }
        }
    });

/**
 * Starts playback.
 */
SkeletonClipNode.prototype.play = function()
{
    this._animationClipPlayer.play();
};

/**
 * Pauses playback.
 */
SkeletonClipNode.prototype.stop = function()
{
    this._animationClipPlayer.stop();
};

/**
 * @ignore
 */
SkeletonClipNode.prototype.update = function(dt, transferRootJoint)
{
    if (!this._playhead.update(dt))
        return false;

    var playhead = this._playhead;

    this._pose.interpolate(playhead.frame1.value, playhead.frame2.value, playhead.ratio);

    if (transferRootJoint)
        this._transferRootJointTransform(playhead.wraps, dt);

    return true;
};

/**
 * @ignore
 */
SkeletonClipNode.prototype._transferRootJointTransform = function(numWraps, dt)
{
    var rootJointPos = this._pose._jointPoses[0].position;
    var rootPos = this._rootPosition;
    var rootDelta = this._rootJointDeltaPosition;

    Float4.subtract(rootJointPos, rootPos, rootDelta);

    if (dt > 0 && numWraps > 0) {
        // apply the entire displacement for the amount of times it wrapped
        rootDelta.addScaled(this._clipRootDelta, numWraps);
    }
    else if (dt < 0 && numWraps > 0) {
        // apply the entire displacement for the amount of times it wrapped, in the other direction
        rootDelta.addScaled(this._clipRootDelta, -numWraps);
    }

    this._rootPosition.copyFrom(rootJointPos);
    rootJointPos.set(0.0, 0.0, 0.0);
};

/**
 * @ignore
 */
SkeletonClipNode.prototype._applyValue = function(value)
{
    this.time = value * this._clip.duration;
};

/**
 * @classdesc
 * A SkeletonBlendTree is used by {@linkcode SkeletonAnimation} internally to blend complex animation setups. Using this,
 * we can crossfade between animation clips (such as walking/running) while additionally having extra modifiers applied,
 * such as gun aiming, head turning, etc.
 *
 * @constructor
 * @param {SkeletonBlendNode} rootNode The root node of the tree.
 * @param {Skeleton} skeleton The skeleton to animate.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBlendTree(rootNode, skeleton)
{
    this._skeleton = skeleton;
    this._rootNode = rootNode;
    this._transferRootJoint = false;

    if (skeleton) this.skeleton = skeleton;
}

SkeletonBlendTree.prototype =
{
    get transferRootJoint() { return this._transferRootJoint; },
    set transferRootJoint(value) { this._transferRootJoint = value; },

    get skeleton() { return this._skeleton; },
    set skeleton(value)
    {
        this._skeleton = value;
    },

    get skeletonPose() { return this._rootNode._pose; },

    get rootJointDeltaPosition() { return this._rootNode.rootJointDeltaPosition; },

    get rootNode() { return this._rootNode; },
    set rootNode(value) { this._rootNode = value; },

    setValue: function(id, value)
    {
        this._rootNode.setValue(id, value);
    },

    update: function(dt)
    {
        var updated = this._rootNode.update(dt, this._transferRootJoint);
        if (updated)
            this._rootNode._pose.invalidateGlobalPose();

        return updated;
    }
};

/**
 * @param {*} rootNode Either a {@linkcode SkeletonBlendNode} for more complex animations, or an {@linkcode AnimationClip} for single-clip start/stop animations.
 *
 * @classdesc
 *
 * SkeletonAnimation is a {@linkcode Component} that allows skinned animations on a Model. Internally, it uses a
 * {@linkcode SkeletonBlendTree} for blending.
 *
 * @property {Boolean} transferRootJoint Defines whether the root joint's movement will be applied to the target Model's scene position. This way, scene movement can be synchronized to the animation.
 * @property {Boolean} applyInverseBindPose Defines whether or not the inverse bind pose should be applied to the skeleton's pose.
 * @property {SkeletonBlendNode} animationNode The root animation node of the blend tree.
 *
 * @constructor
 *
 * @see {@linkcode AnimationClip}
 * @see {@linkcode SkeletonBlendNode}
 * @see {@linkcode SkeletonXFadeNode}
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonAnimation(rootNode)
{
    Component.call(this);
    if (rootNode instanceof AnimationClip)
        rootNode = new SkeletonClipNode(rootNode);
    this._blendTree = new SkeletonBlendTree(rootNode);
}

SkeletonAnimation.prototype = Object.create(Component.prototype,
    {
        transferRootJoint: {
            get: function()
            {
                return this._blendTree.transferRootJoint;
            },

            set: function(value)
            {
                this._blendTree.transferRootJoint = value;
            }
        },

        applyInverseBindPose: {
            get: function()
            {
                return this._blendTree.applyInverseBindPose;
            },

            set: function(value)
            {
                this._blendTree.applyInverseBindPose = value;
            }
        },

        animationNode: {
            get: function ()
            {
                return this._blendTree.rootNode;
            },
            set function(value)
            {
                this._blendTree.rootNode = value;
                if (this._entity) this._blendTree.skeleton = this._entity.skeleton;
            }
        }
    }
);

/**
 * If a node somewhere in the tree has registered with a given ID, it's "value" (node-dependent) can be changed through here.
 *
 * @deprecated
 *
 * @param id
 * @param value
 */
SkeletonAnimation.prototype.setValue = function(id, value)
{
    // if any of the nodes in the animation blend tree has a value id assigned, it can be controlled here from the root.
    this._blendTree.setValue(id, value);
};

/**
 * @ignore
 */
SkeletonAnimation.prototype.onAdded = function()
{
    this._blendTree.skeleton = this._entity.skeleton;
    this._entity.skeletonPose = this._blendTree.skeletonPose;
};

/**
 * @ignore
 */
SkeletonAnimation.prototype.onUpdate = function(dt)
{
    if (this._blendTree.update(dt)) {
        var matrix = this._entity.matrix;
        var d = this._blendTree.rootJointDeltaPosition;
        matrix.prependTranslation(d);
        this._entity.matrix = matrix;
        this._entity.skeletonPose = this._blendTree.skeletonPose;
    }
};

/**
 * @classdesc
 * SkeletonBinaryLerpNode allows simple blending between 2 child nodes.
 *
 * @property {number} minValue The minimum value of the input range.
 * @property {number} maxValue The maximum value of the input range.
 * @property {number} value The value between minValue and maxValue that defines how to interpolate between the children.
 * @property {SkeletonBlendNode} child1 The first child (matching minValue).
 * @property {SkeletonBlendNode} child2 The second child (matching maxValue).
 *
 * @constructor
 *
 * @extends SkeletonBlendNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonBinaryLerpNode()
{
    SkeletonBlendNode.call(this);
    this._value = 0;
    this._child1 = null;
    this._child2 = null;
    this._minValue = 0;
    this._maxValue = 1;
    this._numJoints = 0;
    this._t = 0;
    this._valueChanged = false;
}

SkeletonBinaryLerpNode.prototype = Object.create(SkeletonBlendNode.prototype, {
    numJoints: {
        get: function() {return this._numJoints; }
    },

    minValue: {
        get: function ()
        {
            return this._minValue;
        },

        set: function (value)
        {
            this._minValue = value;
        }
    },

    maxValue: {
        get: function()
        {
            return this._maxValue;
        },

        set: function(value)
        {
            this._maxValue = value;
        }
    },

    value: {
        get: function ()
        {
            return this._value;
        },

        set: function (v)
        {
            v = MathX.clamp(v, this._minValue, this._maxValue);
            if (this._value !== v)
                this._valueChanged = true;
            this._value = v;
            this._t = (this._value - this._minValue) / (this._maxValue - this._minValue);
        }
    },

    child1: {
        get: function()
        {
            return this._child1;
        },

        set: function(value)
        {
            this._child1 = value;
            if (this._child2 && value.numJoints !== this._child2.numJoints) throw new Error("Incompatible child nodes (numJoints mismatch)!");
            this._numJoints = value.numJoints;
        }
    },

    child2: {
        get: function ()
        {
            return this._child2;
        },

        set: function (value)
        {
            this._child2 = value;
            if (this._child1 && value.numJoints !== this._child1.numJoints) throw new Error("Incompatible child nodes (numJoints mismatch)!");
        }
    }
});

/**
 * @ignore
 */
SkeletonBinaryLerpNode.prototype.update = function(dt, transferRootJoint)
{
    var updated = this._child1.update(dt, transferRootJoint);
    updated = this._child2.update(dt, transferRootJoint) || updated;
    updated = updated || this._valueChanged;

    var t = this._t;
    if (updated) {
        if (t > .999)
            this._pose.copyFrom(this._child1._pose);
        else if (t < .001)
            this._pose.copyFrom(this._child2._pose);
        else
            this._pose.interpolate(this._child1._pose, this._child2._pose, this._t);

        this._valueChanged = false;
    }

    return updated;
};

/**
 * @ignore
 */
SkeletonBinaryLerpNode.prototype._applyValue = function(value)
{
    this.value = value;
};

/**
 * @ignore
 */
SkeletonBinaryLerpNode.prototype.setValue = function(id, value)
{
    SkeletonBlendNode.prototype.setValue.call(this, id, value);
    this._child1.setValue(id, value);
    this._child2.setValue(id, value);
};

/**
 * @param skeleton The original skeleton, needed to copy the bind pose.
 *
 * @classdesc
 * <p>SkeletonFreePoseNode is a SkeletonBlendNode that allows freely setting any Skeleton joint's pose directly.</p>
 *
 * @constructor
 *
 * @extends  SkeletonBlendNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonFreePoseNode(skeleton)
{
    SkeletonBlendNode.call(this);
    this._skeleton = skeleton;
    this._poseInvalid = true;
    this._pose.copyBindPose(skeleton);

    this._poseLookUp = {};

    for (var i = 0; i < skeleton.numJoints; ++i) {
        var j = skeleton.getJoint(i);
        this._poseLookUp[j.name] = this._pose._jointPoses[i];
    }
}

SkeletonFreePoseNode.prototype = Object.create(SkeletonBlendNode.prototype, {
    /**
     * @ignore
     */
    numJoints: {
        get function() { return this._skeleton.numJoints; }
    }
});

/**
 * @ignore
 */
SkeletonFreePoseNode.prototype.update = function(dt)
{
    var updated = this._poseInvalid;
    this._poseInvalid = false;
    return updated
};

/**
 * Sets a joint's rotation.
 * @param {*} indexOrName If a Number, the index of the joint in the skeleton, if a String, its name.
 * @param {Quaternion} quaternion The new rotation.
 */
SkeletonFreePoseNode.prototype.setJointRotation = function(indexOrName, quaternion)
{
    var p = this._getJointPose(indexOrName);
    p.rotation.copyFrom(quaternion);
    this._poseInvalid = true;
};

/**
 * Sets a joint's translation.
 * @param {*} indexOrName If a Number, the index of the joint in the skeleton, if a String, its name.
 * @param {Float4} value The new translation.
 */
SkeletonFreePoseNode.prototype.setJointTranslation = function(indexOrName, value)
{
    var p = this._getJointPose(indexOrName);
    p.position.copyFrom(value);
    this._poseInvalid = true;
};

/**
 * Sets a joint's scale.
 * @param {*} indexOrName If a Number, the index of the joint in the skeleton, if a String, its name.
 * @param {Float4} value The new scale.
 */
SkeletonFreePoseNode.prototype.setJointScale = function(indexOrName, value)
{
    var p = this._getJointPose(indexOrName);
    p.scale.copyFrom(value);
    this._poseInvalid = true;
};

/**
 * @ignore
 */
SkeletonFreePoseNode.prototype._getJointPose = function(indexOrName)
{
    if (indexOrName instanceof String)
        return this._poseLookUp[indexOrName];
    else
        return this._pose._jointPoses[indexOrName];
};

/**
 * @classdesc
 * SkeletonJoint describes a single joint in a {@linkcode Skeleton}.
 * (Pedantic note: some packages call these "bones", which is technically a slight misnomer.)
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonJoint()
{
    /**
     * The name of the joint.
     */
    this.name = null;

    /**
     * The index in the Skeleton of the parent joint.
     */
    this.parentIndex = -1;

    /**
     * The inverse bind pose of the joint. This was how the joint was positioned with the mesh in the default skinned state (usually the T-pose).
     * @type {Matrix4x4}
     */
    this.inverseBindPose = new Matrix4x4();
}

SkeletonJoint.prototype =
{
    toString: function()
    {
        return "[SkeletonJoint]";
    }
};

/**
 * SkeletonXFadeNode is a {@linkcode SkeletonBlendNode} for simple cross-fading between child animation clips.
 *
 * @constructor
 *
 * @extends  SkeletonBlendNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SkeletonXFadeNode()
{
    SkeletonBlendNode.call(this);
    this._children = [];
    this._numJoints = 0;

    // TODO: Add the possibility to sync times, useful for syncing walk -> run!
    // in this case, the clips should have their timesteps recalculated
}

SkeletonXFadeNode.prototype = Object.create(SkeletonBlendNode.prototype, {
    /**
     * @ignore
     */
    numJoints: {
        get: function() {return this._numJoints; }
    }
});

/**
 * @classdesc
 * Cross-fades the animation to a new target animation.
 * @param node A {@linkcode SkeletonBlendTreeNode} or an {@linkcode AnimationClip}.
 * @param time The time the fade takes in milliseconds.
 */
SkeletonXFadeNode.prototype.fadeTo = function(node, time)
{
    if (node instanceof AnimationClip) node = new SkeletonClipNode(node);

    this._numJoints = node.numJoints;
    // put the new one in front, it makes the update loop more efficient
    this._children.unshift({
        node: node,
        weight: 0.0,
        fadeSpeed: 1 / time
    });
};

/**
 * @ignore
 */
SkeletonXFadeNode.prototype.update = function(dt, transferRootJoint)
{
    var len = this._children.length;

    // still fading if len > 1
    var updated = len > 1 && dt > 0;

    // update weights and remove any node that's become unused
    // do not interpolate the nodes into the pose yet, because if no updates occur, this is unnecessary
    for (var i = 0; i < len; ++i) {
        var child = this._children[i];

        updated = child.node.update(dt, transferRootJoint) || updated;

        var w = child.weight + dt * child.fadeSpeed;

        if (w > .999) {
            child.weight = 1.0;
            // we can safely remove any of the following child nodes, because their values will be lerped away
            this._children.splice(i + 1);
            break;
        }

        child.weight = w;
    }


    if (!updated) return false;

    var last = this._children.length - 1;

    // work backwards, so we can just override each old state progressively
    var childNode = this._children[last].node;
    var delta = this._rootJointDeltaPosition;
    var pose = this._pose;
    pose.copyFrom(childNode._pose);

    if (transferRootJoint)
        delta.copyFrom(childNode._rootJointDeltaPosition);
    
    for (i = last - 1; i >= 0; --i) {
        child = this._children[i];
        childNode = child.node;

        if (transferRootJoint)
            delta.lerp(delta, childNode._rootJointDeltaPosition, child.weight);

        pose.interpolate(pose, childNode._pose, child.weight);
    }

    return true;
};

/**
 * @classdesc
 * FloatController is a {@linkcode Component} that allows moving an object (usually a camera) using mouse and keyboard (typical WASD controls) in all directions.
 * It uses Tait-Bryan pitch/yaw (ignoring roll) angles.
 *
 * @property {number} speed The speed at which to move.
 * @property {number} shiftMultiplier A speed-up factor for when the shift key is pressed.
 * @property {number} pitch The current orientation pitch (rotation about the X axis).
 * @property {number} yaw The current orientation yaw (rotation about the Y axis).
 * @property {number} friction The amount of friction that will cause the movement to stop when there's no input.
 *
 * @constructor
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FloatController()
{
    Component.call(this);
    this._speed = 1.0;
    this._speedMultiplier = 2.0;
    this._localVelocity = new Float4(0, 0, 0, 0);
    this._localAcceleration = new Float4(0, 0, 0, 0);
    this._pitch = 0.0;
    this._yaw = 0.0;
    this._mouseX = 0;
    this._mouseY = 0;

    this._friction = 5.0;    // 1/s

    this._maxAcceleration = this._speed;    // m/s^2
    this._maxVelocity = this._speed;    // m/s

    this._onKeyDown = null;
    this._onKeyUp = null;
}

FloatController.prototype = Object.create(Component.prototype, {
    speed: {
        get: function()
        {
            return this._speed;
        },

        set: function(value)
        {
            this._speed = value;
            this._maxAcceleration = value;
            this._maxVelocity = value;
        }
    },

    shiftMultiplier: {
        get: function()
        {
            return this._speedMultiplier;
        },

        set: function(value)
        {
            this._speedMultiplier = value;
        }
    },

    pitch: {
        get: function()
        {
            return this._pitch;
        },

        set: function(value)
        {
            this._pitch = value;
        }
    },

    yaw: {
        get: function()
        {
            return this._yaw;
        },

        set: function(value)
        {
            this._yaw = value;
        }
    },

    friction: {
        get: function()
        {
            return this._friction;
        },

        set: function(value)
        {
            this._friction = value;
        }
    }
});

/**
 * @ignore
 */
FloatController.prototype.onAdded = function(dt)
{
    var self = this;
    this._onKeyDown = function(event) {
        var keyCode = ("which" in event) ? event.which : event.keyCode;

        switch (keyCode) {
            case 16:
                self._maxVelocity = self._speed * self._speedMultiplier;
                self._maxAcceleration = self._speed * self._speedMultiplier;
                break;
            case 87:
                self._setForwardForce(1.0);
                break;
            case 83:
                self._setForwardForce(-1.0);
                break;
            case 65:
                self._setStrideForce(-1.0);
                break;
            case 68:
                self._setStrideForce(1.0);
                break;
            default:
                // nothing
        }
    };

    this._onKeyUp = function(event) {
        var keyCode = ("which" in event) ? event.which : event.keyCode;

        switch (keyCode) {
            case 16:
                self._maxVelocity = self._speed;
                self._maxAcceleration = self._speed;
                break;
            case 87:
            case 83:
                self._setForwardForce(0.0);
                break;
            case 65:
            case 68:
                self._setStrideForce(0.0);
                break;
            default:
            // nothing
        }
    };

    this._onMouseMove = function(event)
    {
        event = event || window.event;

        self._addPitch((self._mouseY-event.clientY) / 100);
        self._addYaw(-(self._mouseX-event.clientX) / 100);

        self._mouseX = event.clientX;
        self._mouseY = event.clientY;
    };

    this._onMouseDown = function(event)
    {
        self._mouseX = event.clientX;
        self._mouseY = event.clientY;
        META.TARGET_CANVAS.addEventListener("mousemove", self._onMouseMove);
    };

    this._onMouseUp = function(event)
    {
        META.TARGET_CANVAS.removeEventListener("mousemove", self._onMouseMove);
    };

    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
    META.TARGET_CANVAS.addEventListener("mousedown", this._onMouseDown);
    META.TARGET_CANVAS.addEventListener("mouseup", this._onMouseUp);
};

/**
 * @ignore
 */
FloatController.prototype.onRemoved = function(dt)
{
    document.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);
    META.TARGET_CANVAS.removeEventListener("mousemove", this._onMouseMove);
    META.TARGET_CANVAS.removeEventListener("mousedown", this._onMouseDown);
    META.TARGET_CANVAS.removeEventListener("mouseup", this._onMouseUp);
};

/**
 * @ignore
 */
FloatController.prototype.onUpdate = function(dt)
{
    var seconds = dt * .001;

    var frictionForce = Float4.scale(this._localVelocity, this._friction*seconds);
    this._localVelocity.subtract(frictionForce);

    var acceleration = Float4.scale(this._localAcceleration, this._maxAcceleration*seconds);
    this._localVelocity.add(acceleration);

    var absVelocity = this._localVelocity.length;
    if (absVelocity > this._maxVelocity)
        this._localVelocity.scale(this._maxVelocity/absVelocity);

    if (this._pitch < -Math.PI*.5) this._pitch = -Math.PI*.5;
    else if (this._pitch > Math.PI*.5) this._pitch = Math.PI*.5;

    var matrix = this.entity.matrix;
    // the original position
    var position = matrix.getColumn(3);
    var distance = Float4.scale(this._localVelocity, seconds);

    matrix.fromRotationPitchYawRoll(this._pitch, this._yaw, 0.0);
    matrix.prependTranslation(distance);
    matrix.appendTranslation(position);

    this.entity.matrix = matrix;
};

/**
 * @ignore
 */
FloatController.prototype._setForwardForce = function(ratio)
{
    this._localAcceleration.z = ratio * this._maxAcceleration;
};

/**
 * @ignore
 */
FloatController.prototype._setStrideForce = function(ratio)
{
    this._localAcceleration.x = ratio * this._maxAcceleration;
};

/**
 * @ignore
 */
FloatController.prototype._addPitch = function(value)
{
    this._pitch += value;
};

/**
 * @ignore
 */
FloatController.prototype._addYaw = function(value)
{
    this._yaw += value;
};

/**
 * @classdesc
 * FloatController is a {@linkcode Component} that allows moving an object (usually a camera) using mouse or touch around a central point.
 *
 * @property {number} radius The distance between the Entity and the lookAtTarget.
 * @property {number} azimuth The azimuth coordinate of the object relative to the lookAtTarget.
 * @property {number} polar The polar coordinate of the object relative to the lookAtTarget.
 *
 * @param {Float4} target The position around which to orbit.
 *
 * @constructor
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function OrbitController(lookAtTarget)
{
    Component.call(this);
    this._coords = new Float4(Math.PI *.5, Math.PI * .4, 1.0, 0.0);   // azimuth, polar, radius
    this._localAcceleration = new Float4(0.0, 0.0, 0.0, 0.0);
    this._localVelocity = new Float4(0.0, 0.0, 0.0, 0.0);

    this.touchZoomSpeed = .01;
    this.zoomSpeed = 1.0;
    this.maxRadius = 4.0;
    this.minRadius = 0.1;
    this.dampen = .9;
    this.lookAtTarget = lookAtTarget || new Float4(0.0, 0.0, 0.0, 1.0);
    this._oldMouseX = 0;
    this._oldMouseY = 0;

    this._isDown = false;
}

OrbitController.prototype = Object.create(Component.prototype,
    {
        radius: {
            get: function() { return this._coords.z; },
            set: function(value) { this._coords.z = value; }
        },

        azimuth: {
            get: function() { return this._coords.x; },
            set: function(value) { this._coords.x = value; }
        },

        polar: {
            get: function() { return this._coords.y; },
            set: function(value) { this._coords.y = value; }
        }
    });

/**
 * @ignore
 */
OrbitController.prototype.onAdded = function()
{
    var self = this;

    this._onMouseWheel = function(event)
    {
        var delta = event.detail? -120 * event.detail : event.wheelDelta;
        self.setZoomImpulse(-delta * self.zoomSpeed * .0001);
    };

    this._onMouseDown = function (event)
    {
        self._oldMouseX = undefined;
        self._oldMouseY = undefined;

        self._isDown = true;
    };

    this._onMouseMove = function(event)
    {
        if (!self._isDown) return;
        self._updateMove(event.screenX, event.screenY);
    };

    this._onTouchDown = function (event)
    {
        self._oldMouseX = undefined;
        self._oldMouseY = undefined;

        if (event.touches.length === 2) {
            var touch1 = event.touches[0];
            var touch2 = event.touches[1];
            var dx = touch1.screenX - touch2.screenX;
            var dy = touch1.screenY - touch2.screenY;
            self._startPitchDistance = Math.sqrt(dx*dx + dy*dy);
            self._startZoom = self.radius;
        }

        self._isDown = true;
    };

    this._onTouchMove = function (event)
    {
        event.preventDefault();

        if (!self._isDown) return;

        var numTouches = event.touches.length;

        if (numTouches === 1) {
            var touch = event.touches[0];
            self._updateMove(touch.screenX, touch.screenY);
        }
        else if (numTouches === 2) {
            var touch1 = event.touches[0];
            var touch2 = event.touches[1];
            var dx = touch1.screenX - touch2.screenX;
            var dy = touch1.screenY - touch2.screenY;
            var dist = Math.sqrt(dx*dx + dy*dy);
            var diff = self._startPitchDistance - dist;
            self.radius = self._startZoom + diff * self.touchZoomSpeed;
        }
    };

    this._onUp = function(event) { self._isDown = false; };

    var mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
    META.TARGET_CANVAS.addEventListener(mousewheelevt, this._onMouseWheel);
    META.TARGET_CANVAS.addEventListener("mousemove", this._onMouseMove);
    META.TARGET_CANVAS.addEventListener("touchmove", this._onTouchMove);
    META.TARGET_CANVAS.addEventListener("mousedown", this._onMouseDown);
    META.TARGET_CANVAS.addEventListener("touchstart", this._onTouchDown);
    META.TARGET_CANVAS.addEventListener("mouseup", this._onUp);
    META.TARGET_CANVAS.addEventListener("touchend", this._onUp);
};

/**
 * @ignore
 */
OrbitController.prototype.onRemoved = function()
{
    var mousewheelevt = (/Firefox/i.test(navigator.userAgent))? "DOMMouseScroll" : "mousewheel";
    META.TARGET_CANVAS.removeEventListener(mousewheelevt, this._onMouseWheel);
    META.TARGET_CANVAS.removeEventListener("mousemove", this._onMouseMove);
    META.TARGET_CANVAS.removeEventListener("touchmove", this._onTouchMove);
    META.TARGET_CANVAS.removeEventListener("mousedown", this._onMouseDown);
    META.TARGET_CANVAS.removeEventListener("touchstart", this._onTouchDown);
    META.TARGET_CANVAS.removeEventListener("mouseup", this._onUp);
    META.TARGET_CANVAS.removeEventListener("touchend", this._onUp);
};

/**
 * @ignore
 */
OrbitController.prototype.onUpdate = function(dt)
{
    this._localVelocity.x *= this.dampen;
    this._localVelocity.y *= this.dampen;
    this._localVelocity.z *= this.dampen;
    this._localVelocity.x += this._localAcceleration.x;
    this._localVelocity.y += this._localAcceleration.y;
    this._localVelocity.z += this._localAcceleration.z;
    this._localAcceleration.x = 0.0;
    this._localAcceleration.y = 0.0;
    this._localAcceleration.z = 0.0;

    this._coords.add(this._localVelocity);
    this._coords.y = MathX.clamp(this._coords.y, 0.1, Math.PI - .1);
    this._coords.z = MathX.clamp(this._coords.z, this.minRadius, this.maxRadius);

    var matrix = this.entity.matrix;
    var pos = new Float4();
    pos.fromSphericalCoordinates(this._coords.z, this._coords.x, this._coords.y);
    pos.add(this.lookAtTarget);
    matrix.lookAt(this.lookAtTarget, pos, Float4.Y_AXIS);
    this.entity.matrix = matrix;
};

/**
 * @ignore
 */
OrbitController.prototype.setAzimuthImpulse  = function(value)
{
    this._localAcceleration.x = value;
};

/**
 * @ignore
 */
OrbitController.prototype.setPolarImpulse = function(value)
{
    this._localAcceleration.y = value;
};

/**
 * @ignore
 */
OrbitController.prototype.setZoomImpulse = function(value)
{
    this._localAcceleration.z = value;
};

/**
 * @ignore
 */
OrbitController.prototype._updateMove = function(x, y)
{
    if (this._oldMouseX !== undefined) {
        var dx = this._oldMouseX - x;
        var dy = this._oldMouseY - y;
        this.setAzimuthImpulse(dx * .0015);
        this.setPolarImpulse(dy * .0015);
    }
    this._oldMouseX = x;
    this._oldMouseY = y;
};

/**
 * @classdesc
 * DataStream is a wrapper for DataView which allows reading the data as a linear stream of data.
 * @param dataView the DataView object to read from.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DataStream(dataView)
{
    this._dataView = dataView;
    this._offset = 0;
    this._endian = DataStream.LITTLE_ENDIAN;
}

/**
 * Little Endian encoding
 */
DataStream.LITTLE_ENDIAN = true;

/**
 * Big Endian encoding
 */
DataStream.BIG_ENDIAN = false;

DataStream.prototype =
{
    /**
     * The current byte offset into the file.
     */
    get offset() { return this._offset; },
    set offset(value) { this._offset = value; },

    /**
     * The endianness used by the data.
     */
    get endian() { return this._endian; },
    set endian(value) { this._endian = value; },

    /**
     * The size of the data view in bytes.
     */
    get byteLength () { return this._dataView.byteLength; },

    /**
     * The amount of bytes still left in the file until EOF.
     */
    get bytesAvailable() { return this._dataView.byteLength - this._offset; },

    /**
     * Reads a single 8-bit string character from the stream.
     */
    getChar: function()
    {
        return String.fromCharCode(this.getUint8());
    },

    /**
     * Reads a single unsigned byte integer from the string.
     */
    getUint8: function()
    {
        return this._dataView.getUint8(this._offset++);
    },

    /**
     * Reads a single unsigned short integer from the string.
     */
    getUint16: function()
    {
        var data = this._dataView.getUint16(this._offset, this._endian);
        this._offset += 2;
        return data;
    },

    /**
     * Reads a single unsigned 32-bit integer from the string.
     */
    getUint32: function()
    {
        var data = this._dataView.getUint32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    /**
     * Reads a single signed byte integer from the string.
     */
    getInt8: function()
    {
        return this._dataView.getInt8(this._offset++);
    },

    /**
     * Reads a single signed short integer from the string.
     */
    getInt16: function()
    {
        var data = this._dataView.getInt16(this._offset, this._endian);
        this._offset += 2;
        return data;
    },

    /**
     * Reads a single 32 bit integer from the string.
     */
    getInt32: function()
    {
        var data = this._dataView.getInt32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    /**
     * Reads a 64-bit integer and stores it in a Number. The read value is not necessarily the same as what's stored, but
     * may provide an acceptable approximation.
     */
    getInt64AsFloat64: function()
    {
        var L, B;
        if (this._endian === DataStream.LITTLE_ENDIAN) {
            L = this._dataView.getUint32(this._offset, this._endian);
            B = this._dataView.getInt32(this._offset + 4, this._endian);
        }
        else {
            B = this._dataView.getInt32(this._offset, this._endian);
            L = this._dataView.getUint32(this._offset + 4, this._endian);
        }
        this._offset += 8;
        return L + B * 4294967296.0;
    },

    /**
     * Reads a single float.
     */
    getFloat32: function()
    {
        var data = this._dataView.getFloat32(this._offset, this._endian);
        this._offset += 4;
        return data;
    },

    /**
     * Reads a double float.
     */
    getFloat64: function()
    {
        var data = this._dataView.getFloat64(this._offset, this._endian);
        this._offset += 8;
        return data;
    },

    /**
     * Reads an array of unsigned bytes.
     *
     * @param len The amount of elements to read.
     */
    getUint8Array: function(len)
    {
        return this._readArray(len, Uint8Array, this.getUint8);
    },

    /**
     * Reads an array of unsigned shorts.
     *
     * @param len The amount of elements to read.
     */
    getUint16Array: function(len)
    {
        return this._readArray(len, Uint16Array, this.getUint16);
    },

    /**
     * Reads an array of unsigned 32-bit integers.
     *
     * @param len The amount of elements to read.
     */
    getUint32Array: function(len)
    {
        return this._readArray(len, Uint32Array, this.getUint32);
    },

    /**
     * Reads an array of signed bytes.
     *
     * @param len The amount of elements to read.
     */
    getInt8Array: function(len)
    {
        return this._readArray(len, Int8Array, this.getInt8);
    },

    /**
     * Reads an array of signed shorts.
     *
     * @param len The amount of elements to read.
     */
    getInt16Array: function(len)
    {
        return this._readArray(len, Int16Array, this.getInt16);
    },

    /**
     * Reads an array of signed 32-bit integers.
     *
     * @param len The amount of elements to read.
     */
    getInt32Array: function(len)
    {
        return this._readArray(len, Int32Array, this.getInt32);
    },

    /**
     * Reads an array of 64-bit integers into floats.
     *
     * @param len The amount of elements to read.
     */
    getInt64AsFloat64Array: function(len)
    {
        return this._readArray(len, Float64Array, this.getInt64AsFloat64);
    },

    /**
     * Reads an array of single floats.
     *
     * @param len The amount of elements to read.
     */
    getFloat32Array: function(len)
    {
        return this._readArray(len, Float32Array, this.getFloat32);
    },

    /**
     * Reads an array of double floats.
     *
     * @param len The amount of elements to read.
     */
    getFloat64Array: function(len)
    {
        return this._readArray(len, Float64Array, this.getFloat64);
    },

    /**
     * Reads a string.
     *
     * @param [len] The amount of characters in the string. If omitted, it reads until (and including) it encounters a "\0" character.
     */
    getString: function(len)
    {
        if (!len) return this._get0String();

        var str = "";

        for (var i = 0; i < len; ++i)
            str += this.getChar();

        return str;
    },

    /**
     * @ignore
     */
    _get0String: function()
    {
        var str = "";

        do {
            var ch = this.getUint8();
            if (ch) str += String.fromCharCode(ch);
        } while (ch !== 0);

        return str;
    },

    /**
     * @ignore
     */
    _readArray: function(len, arrayType, func)
    {
        var arr = new arrayType(len);

        for (var i = 0; i < len; ++i)
            arr[i] = func.call(this);

        return arr;
    }
};

/**
 * @classdesc
 * EffectPass is used by {@linkcode Effect} classes to perform individual render tasks.
 *
 * @constructor
 * @param {string} vertexShader The vertex shader code for this pass's shader.
 * @param {string} fragmentShader The fragment shader code for this pass's shader.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function EffectPass(vertexShader, fragmentShader)
{
    vertexShader = vertexShader || ShaderLibrary.get("default_post_vertex.glsl");
    var shader = new Shader(vertexShader, fragmentShader);

    MaterialPass.call(this, shader);

    this._vertexLayout = null;
    this._cullMode = CullMode.NONE;
    this._depthTest = Comparison.DISABLED;
    this._writeDepth = false;
    this.setMesh(RectMesh.DEFAULT);

    this.setTexture("hx_dither2D", DEFAULTS.DEFAULT_2D_DITHER_TEXTURE);
}

EffectPass.prototype = Object.create(MaterialPass.prototype);

/**
 * @ignore
 */
EffectPass.prototype.setMesh = function(mesh)
{
    if (this._mesh === mesh) return;
    this._mesh = mesh;
    this._vertexLayout = new VertexLayout(this._mesh, this);
};

/**
 * @ignore
 */
EffectPass.prototype.updateRenderState = function(renderer)
{
    var cam = renderer._camera;
    this.updateInstanceRenderState(cam);
    this.updatePassRenderState(cam, renderer);

    // TODO: Could we implement this by GL.setMesh(mesh, layout), also in renderer?
    this._mesh._vertexBuffers[0].bind();
    this._mesh._indexBuffer.bind();

    var layout = this._vertexLayout;
    var attributes = layout.attributes;
    var len = attributes.length;

    for (var i = 0; i < len; ++i) {
        var attribute = attributes[i];
        GL.gl.vertexAttribPointer(attribute.index, attribute.numComponents, GL.gl.FLOAT, false, attribute.stride, attribute.offset);
    }

    GL.enableAttributes(layout._numAttributes);
};

/**
 * @classdesc
 * GaussianBlurPass is an {@linkcode EffectPass} that performs a separable gaussian blur pass (ie: in one direction).
 *
 * @constructor
 * @param radius The radius of the blur.
 *
 * @extends EffectPass
 *
 * @author derschmale <http://www.derschmale.com>
 */
function GaussianBlurPass(radius)
{
    radius = Math.floor(radius);

    this._initWeights(radius);

    var defines = {
        RADIUS: radius,
        NUM_WEIGHTS: radius + 1
    };

    var vertex = ShaderLibrary.get("gaussian_blur_vertex.glsl", defines);
    var fragment = ShaderLibrary.get("gaussian_blur_fragment.glsl", defines);

    EffectPass.call(this, vertex, fragment);

    this.setUniformArray("gaussianWeights", new Float32Array(this._weights));
}

GaussianBlurPass.prototype = Object.create(EffectPass.prototype);

/**
 * @ignore
 */
GaussianBlurPass.prototype._initWeights = function(radius)
{
    this._weights = [];

    var gaussian = CenteredGaussianCurve.fromRadius(radius, .01);

    var total = 0;
    for (var j = 0; j <= radius; ++j) {
        this._weights[j] = gaussian.getValueAt(j);
        total += j > 0? this._weights[j] * 2.0 : 1.0;
    }

    total = 1.0 / total;

    for (j = 0; j <= radius; ++j) {
        this._weights[j] *= total;
    }
};

/**
 * @classdesc
 * Effect is a {@linkcode Component} that will be picked up by the renderer for post-processing. Most effects are added
 * to the Camera, but some could be tied to a different Entity (for example: a DirectionalLight for crepuscular rays)
 *
 * @property {boolean} needsNormalDepth Defines whether this Effect needs normal/depth information from the renderer.
 * @property {FrameBuffer} hdrTarget The current full-resolution render target.
 * @property {Texture2D} hdrSource The current full-resolution source texture.
 *
 * @constructor
 *
 * @extends Component
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Effect()
{
    Component.call(this);
    this._isSupported = true;
    this._mesh = null;
    this._outputsGamma = false;
    this._needsNormalDepth = false;
}

Effect.prototype = Object.create(Component.prototype,
    {
        needsNormalDepth: {
            get: function() { return this._needsNormalDepth; },
            set: function(value) { this._needsNormalDepth = value; }
        },

        hdrTarget: {
            get: function() { return this._renderer._hdrFront.fbo; }
        },

        hdrSource: {
            get: function() { return this._renderer._hdrBack.texture; }
        }
    }
);

/**
 * Returns whether this Effect is supported considering the current capabilities.
 */
Effect.prototype.isSupported = function()
{
    return this._isSupported;
};

/**
 * @ignore
 */
Effect.prototype.render = function(renderer, dt)
{
    this._renderer = renderer;
    this.draw(dt);
};

/**
 * This method needs to be implemented by child classes.
 */
Effect.prototype.draw = function(dt)
{
    throw new Error("Abstract method error!");
};

/**
 * @ignore
 */
Effect.prototype._drawPass = function(pass)
{
    pass.updateRenderState(this._renderer);
    GL.drawElements(GL.gl.TRIANGLES, 6, 0);
};

/**
 * @ignore
 */
Effect.prototype.onAdded = function()
{
    this._entity._registerEffect(this);
};

/**
 * @ignore
 */
Effect.prototype.onRemoved = function()
{
    this._entity._unregisterEffect(this);
};

/**
 * Child classes need to call this when rendering to and from full-resolution textures. This will effectively swap hdrSource and hdrTarget to allow ping-ponging.
 */
Effect.prototype._swapHDRFrontAndBack = function()
{
    this._renderer._swapHDRFrontAndBack();
};

/**
 * @classdesc
 * Bloom is an {@linkcode Effect} added to the Camera that allows bright areas in the image to bleed into less bright areas.
 *
 * @property {number} strength The strength of the bloom effect.
 * @property {number} thresholdLuminance The threshold luminance for pixels that are allowed to bleed.
 *
 * @param radius The radius of the bloom effect.
 * @param strength The strength of the bloom effect.
 * @param [downScale] How many times smaller the bloom should be calculated relative to the render target.
 * @param [anisotropy] Defines the ratio between the horizontal and vertical bloom. For the JJ Abrams people among us.
 *
 * @constructor
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Bloom(radius, strength, downScale, anisotropy)
{
    Effect.call(this);

    this._downScale = downScale || 4;

    this._targetWidth = -1;
    this._targetHeight = -1;

    radius = radius || 100;
    radius /= this._downScale;
    this._thresholdPass = new EffectPass(null, ShaderLibrary.get("bloom_threshold_fragment.glsl"));
    this._compositePass = new EffectPass(ShaderLibrary.get("bloom_composite_vertex.glsl"), ShaderLibrary.get("bloom_composite_fragment.glsl"));
    this._blurPass = new GaussianBlurPass(radius);
    this._blurSourceSlot = this._blurPass.getTextureSlot("sourceTexture");
    this._thresholdWidth = -1;
    this._thresholdHeight = -1;

    this._thresholdMaps = [];
    this._smallFBOs = [];

    for (var i = 0; i < 2; ++i) {
        this._thresholdMaps[i] = new Texture2D();
        this._thresholdMaps[i].filter = TextureFilter.BILINEAR_NOMIP;
        this._thresholdMaps[i].wrapMode = TextureWrapMode.CLAMP;
        this._smallFBOs[i] = new FrameBuffer([this._thresholdMaps[i]]);
    }

    this._anisotropy = anisotropy || 1;

    this._strength = strength === undefined ? 1.0 : strength;

    if (capabilities.EXT_HALF_FLOAT_TEXTURES_LINEAR && capabilities.EXT_HALF_FLOAT_TEXTURES)
        this.thresholdLuminance = META.OPTIONS.hdr;
    else
        this.thresholdLuminance = .9;

    this._compositePass.setTexture("bloomTexture", this._thresholdMaps[0]);

    this.strength = this._strength;
}

Bloom.prototype = Object.create(Effect.prototype,
    {
        strength: {
            get: function ()
            {
                return this._strength;
            },

            set: function (value)
            {
                this._strength = value;
                this._compositePass.setUniform("strength", this._strength);
            }
        },

        thresholdLuminance: {
            get: function ()
            {
                return this._thresholdLuminance;
            },

            set: function (value)
            {
                this._thresholdLuminance = value;
                this._thresholdPass.setUniform("threshold", value);
            }
        }
    }
);

/**
 * @ignore
 */
Bloom.prototype._initTextures = function ()
{
    for (var i = 0; i < 2; ++i) {
        this._thresholdWidth = Math.ceil(this._targetWidth / this._downScale);
        this._thresholdHeight = Math.ceil(this._targetHeight / this._downScale);
        this._thresholdMaps[i].initEmpty(this._thresholdWidth, this._thresholdHeight, TextureFormat.RGB, capabilities.HDR_FORMAT);
        this._smallFBOs[i].init();
    }
};

/**
 * @ignore
 */
Bloom.prototype.draw = function (dt)
{
    if (this._renderer._width !== this._targetWidth || this._renderer._height !== this._targetHeight) {
        this._targetWidth = this._renderer._width;
        this._targetHeight = this._renderer._height;
        this._initTextures();
    }

    GL.setRenderTarget(this._smallFBOs[0]);
    GL.clear();
    this._drawPass(this._thresholdPass);

    GL.setRenderTarget(this._smallFBOs[1]);
    GL.clear();
    this._blurSourceSlot.texture = this._thresholdMaps[0];
    this._blurPass.setUniform("stepSize", {x: 1.0 / this._thresholdWidth, y: 0.0});
    this._drawPass(this._blurPass);

    GL.setRenderTarget(this._smallFBOs[0]);
    GL.clear();
    this._blurSourceSlot.texture = this._thresholdMaps[1];
    this._blurPass.setUniform("stepSize", {x: 0.0, y: this._anisotropy / this._thresholdHeight});
    this._drawPass(this._blurPass);

    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._drawPass(this._compositePass);
};

/**
 * @classdesc
 * Blur is an {@linkcode Effect} added to the Camera that simply applies a gaussian blur to the screen.
 *
 * @param {number} radius The radius of the blur.
 *
 * @param numSamples The amount of samples used to calculate the blur in each direction. Cannot be changed after creation.
 * @param radius The radius of the blur.
 * @constructor
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Blur(numSamples, radius)
{
    if (!radius) radius = numSamples;
    Effect.call(this);

    this._blurPass = new GaussianBlurPass(radius);
    this._blurSourceSlot = this._blurPass.getTextureSlot("sourceTexture");
    this._radius = radius;
    this._numSamples = numSamples;
}

Blur.prototype = Object.create(Effect.prototype,
    {
        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
            }
        }
    });

/**
 * @ignore
 */
Blur.prototype.draw = function(dt)
{
    var ratio = this._radius / this._numSamples;
    // we're manually setting source textures instead of using hx_backbuffer because the GaussianBlurPass needs to
    // handle different textures too (see bloom)
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._blurSourceSlot.texture = this.hdrSource;
    this._blurPass.setUniform("stepSize", {x: ratio / this.hdrSource.width, y: 0.0});
    this._drawPass(this._blurPass);

    this._swapHDRFrontAndBack();

    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._blurSourceSlot.texture = this.hdrSource;
    this._blurPass.setUniform("stepSize", {x: 0.0, y: ratio / this.hdrSource.height});
    this._drawPass(this._blurPass);
};

/**
 * @classdesc
 * CopyTexturePass is an {@linkcode EffectPass} that simply copies a texture. Used for downscaling etc.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CopyTexturePass()
{
    EffectPass.call(this, null, ShaderLibrary.get("copy_fragment.glsl"));
}

CopyTexturePass.prototype = Object.create(EffectPass.prototype);

/**
 * Sets the texture to copy from.
 */
CopyTexturePass.prototype.setSourceTexture = function(value)
{
    this.setTexture("sampler", value);
};

/**
 * @classdesc
 * A base class for tone mapping effects.
 *
 * @property {number} exposure The exposure value (in "stops"). Higher values will result in brighter results.
 * @property {number} key The intended average luminosity in the scene. Gives a hint whether the scene should be dark (low-key) or bright (high-key).
 * @property {number} adaptionRate The amount of time in milliseconds for the "lens" to adapt to the scene's brightness.
 *
 * @constructor
 * @param adaptive Defines whether or not the brightness should adapt to the average brightness of the scene. If not supported, it will disable.
 *
 * @ignore
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ToneMapEffect(adaptive)
{
    this._adaptive = adaptive === undefined? false : adaptive;

    if (this._adaptive && (!capabilities.EXT_SHADER_TEXTURE_LOD || !capabilities.HALF_FLOAT_FBO)) {
        console.log("Warning: adaptive tone mapping not supported, using non-adaptive");
        this._adaptive = false;
        return;
    }

    Effect.call(this);

    this._toneMapPass = this._createToneMapPass();

    if (this._adaptive) {
        this._extractLuminancePass = new EffectPass(null, ShaderLibrary.get("tonemap_reference_fragment.glsl"));
        this._extractLuminancePass.blendState = new BlendState(BlendFactor.CONSTANT_ALPHA, BlendFactor.ONE_MINUS_CONSTANT_ALPHA, BlendOperation.ADD, new Color(1.0, 1.0, 1.0, 1.0));

        this._luminanceMap = new Texture2D();
        this._luminanceMap.initEmpty(256, 256, TextureFormat.RGBA, capabilities.EXT_HALF_FLOAT_TEXTURES.HALF_FLOAT_OES);
        this._luminanceFBO = new FrameBuffer(this._luminanceMap);
        this._luminanceFBO.init();

        this._adaptationRate = 500.0;

        this._toneMapPass.setTexture("hx_luminanceMap", this._luminanceMap);
        this._toneMapPass.setUniform("hx_luminanceMipLevel", MathX.log2(this._luminanceMap._width));
    }

    this.key = .25;
    this.exposure = 0.0;
}

ToneMapEffect.prototype = Object.create(Effect.prototype, {
    exposure: {
        get: function()
        {
            return this._exposure;
        },
        set: function(value)
        {
            this._exposure = value;
            if (this._isSupported)
                this._toneMapPass.setUniform("hx_exposure", Math.pow(2.0, value));
        }
    },

    key: {
        get: function()
        {
            return this._key;
        },
        set: function(value)
        {
            this._key = value;
            if (this._isSupported)
                this._toneMapPass.setUniform("hx_key", value);
        }
    },

    adaptationRate: {
        get: function()
        {
            return this._adaptationRate;
        },

        set: function(value)
        {
            this._adaptationRate = value;
        }
    }
});

ToneMapEffect.prototype._createToneMapPass = function()
{
    throw new Error("Abstract method called!");
};


ToneMapEffect.prototype.draw = function(dt)
{
    if (this._adaptive) {
        var amount = this._adaptationRate > 0 ? dt / this._adaptationRate : 1.0;
        if (amount > 1) amount = 1;

        this._extractLuminancePass.blendState.color.a = amount;

        GL.setRenderTarget(this._luminanceFBO);
        // can't clear at this point
        this._drawPass(this._extractLuminancePass);
        this._luminanceMap.generateMipmap();
    }

    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._drawPass(this._toneMapPass);
};

/**
 * @classdesc
 * FilmicToneMapping is an {@linkcode Effect} added to the Camera that applies filmic tone mapping.
 *
 * @constructor
 * @param adaptive Whether or not the brightness should adapt to the average brightness of the scene. If not supported, it will disable.
 *
 * @extends ToneMapping
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FilmicToneMapping(adaptive)
{
    ToneMapEffect.call(this, adaptive);
    this._outputsGamma = true;

}

FilmicToneMapping.prototype = Object.create(ToneMapEffect.prototype);

/**
 * @ignore
 */
FilmicToneMapping.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions = "";

    if (this._adaptive) {
        defines.HX_ADAPTIVE = 1;
        extensions = "#texturelod\n";
    }

    return new EffectPass(
        null,
        extensions + ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" + ShaderLibrary.get("tonemap_filmic_fragment.glsl")
    );
};

/**
 * @classdesc
 * ACESToneMapping is an {@linkcode Effect} added to the Camera that applies filmic tone mapping with the ACES parameters.
 *
 * @constructor
 * @param adaptive Whether or not the brightness should adapt to the average brightness of the scene. If not supported, it will disable.
 *
 * @extends ToneMapping
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ACESToneMapping(adaptive)
{
    ToneMapEffect.call(this, adaptive);
    this._outputsGamma = true;

}

ACESToneMapping.prototype = Object.create(ToneMapEffect.prototype);

/**
 * @ignore
 */
ACESToneMapping.prototype._createToneMapPass = function()
{
    var defines = {
        HX_ACES: 1
    };
    var extensions = "";

    if (this._adaptive) {
        defines.HX_ADAPTIVE = 1;

        extensions = "#texturelod\n";
    }

    return new EffectPass(
        null,
        extensions + ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" + ShaderLibrary.get("tonemap_filmic_fragment.glsl")
    );
};

/**
 * @classdesc
 * Fog is an {@linkcode Effect} added to the Camera that applies a fog effect to the scene.
 *
 * @property {number} density The "thickness" of the fog. Keep it tiny.
 * @property {Color} tint The color of the fog.
 * @property {number} heightFallOff The fall-off based on the height. This is to simulate a thinning atmosphere.
 * @property {number} startDistance The distance from the camera at which the effect should start to be applied.
 *
 * @constructor
 * @param {Number} [density] The "thickness" of the fog. Keep it tiny.
 * @param {Color} [tint] The color of the fog.
 * @param {Number} [heightFallOff] The fall-off based on the height. This is to simulate a thinning atmosphere.
 * @param {Number} [startDistance] The distance from the camera at which the effect should start to be applied.
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Fog(density, tint, heightFallOff, startDistance)
{
    Effect.call(this);

    this._fogPass = new EffectPass(ShaderLibrary.get("fog_vertex.glsl"), ShaderLibrary.get("fog_fragment.glsl"));
    this.needsNormalDepth = true;
    this.density = density === undefined? .001 : density;
    this._tint = new Color(1, 1, 1, 1);
    if (tint !== undefined)
        this.tint = tint;
    this.startDistance = startDistance === undefined? 0 : startDistance;
    this.heightFallOff = heightFallOff === undefined? 0.01 : heightFallOff;
}

Fog.prototype = Object.create(Effect.prototype,
    {
        density: {
            get: function()
            {
                return this._density;
            },
            set: function(value)
            {
                this._density = value;
                this._fogPass.setUniform("density", value);
            }
        },

        tint: {
            get: function ()
            {
                return this._tint;
            },
            set: function (value)
            {
                this._tint.copyFrom(value);

                if (META.OPTIONS.useGammaCorrection)
                    this._tint.gammaToLinear();

                this._fogPass.setUniform("tint", {x: value.r, y: value.g, z: value.b});
            }
        },

        startDistance: {
            get: function()
            {
                return this._startDistance;
            },
            set: function(value)
            {
                this._startDistance = value;
                this._fogPass.setUniform("startDistance", value);
            }
        },

        heightFallOff: {
            get: function()
            {
                return this._heightFallOff;
            },
            set: function(value)
            {
                this._heightFallOff = value;
                this._fogPass.setUniform("heightFallOff", value);
            }
        }
    }
);

/**
 * @ignore
 */
Fog.prototype.draw = function(dt)
{
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._drawPass(this._fogPass);
};

/**
 * @classdesc
 * FXAA is an {@linkcode Effect} added to the Camera that applies "Fast approXimate Anti-Aliasing" on the render.
 *
 * @constructor
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FXAA()
{
    Effect.call(this);

    this._pass = new EffectPass(null, ShaderLibrary.get("fxaa_fragment.glsl"));
    this._pass.setUniform("edgeThreshold", 1/4);
    this._pass.setUniform("edgeThresholdMin", 1/16);
    this._pass.setUniform("edgeSharpness", 100.0);
}

FXAA.prototype = Object.create(Effect.prototype);

/**
 * @ignore
 */
FXAA.prototype.draw = function(dt)
{
    GL.setRenderTarget(this.hdrTarget);
    GL.clear();
    this._drawPass(this._pass);
};

/**
 * @classdesc
 * HBAO adds Horizon-Based Ambient Occlusion to the renderer.
 *
 * @property {number} sampleRadius The sample radius in world space to search for occluders.
 * @property {number} fallOffDistance The maximum distance for occluders to still count.
 * @property {number} strength The strength of the ambient occlusion effect.
 * @property {number} bias The angle bias to prevent some artifacts.
 * @property {number} scale The scale at which to calculate the ambient occlusion (usually 0.5, half-resolution)
 *
 * @constructor
 * @param numRays The amount of rays to march over.
 * @param numSamplesPerRay The samples per ray during a march.
 *
 * @see {@linkcode Renderer#ambientOcclusion}
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HBAO(numRays, numSamplesPerRay)
{
    numRays = numRays || 4;
    numSamplesPerRay = numSamplesPerRay || 4;
    if (numRays > 32) numRays = 32;
    if (numSamplesPerRay > 32) numSamplesPerRay = 32;

    this._numRays = numRays;
    this._numSamplesPerRay = numSamplesPerRay;
    this._strength = 1.0;
    this._bias = .1;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._scale = .5;
    this._sampleDirTexture = null;
    this._ditherTexture = null;

    Effect.call(this);
}

HBAO.prototype = Object.create(Effect.prototype, {
    sampleRadius: {
        get: function ()
        {
            return this._radius;
        },

        set: function (value)
        {
            this._radius = value;
            if (this._aoPass)
                this._aoPass.setUniform("halfSampleRadius", this._radius * .5);
        }
    },

    fallOffDistance: {
        get: function ()
        {
            return this._fallOffDistance;
        },
        set: function (value)
        {
            this._fallOffDistance = value;
            if (this._aoPass)
                this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
        }
    },

    strength: {
        get: function()
        {
            return this._strength;
        },
        set: function (value)
        {
            this._strength = value;
            if (this._aoPass)
                this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
        }
    },

    bias: {
        get: function()
        {
            return this._bias;
        },
        set: function (value)
        {
            this._bias = value;
            if (this._aoPass)
                this._aoPass.setUniform("bias", this._bias);
        }
    },

    scale: {
        get: function() { return this._scale; },
        set: function(value) { this._scale = value; }
    }
});

/**
 * Called by Helix when initialized
 * @ignore
 */
HBAO.prototype.init = function()
{
    this._aoPass = new EffectPass(
        ShaderLibrary.get("hbao_vertex.glsl"),
        ShaderLibrary.get("hbao_fragment.glsl", {
            NUM_RAYS: this._numRays,
            NUM_SAMPLES_PER_RAY: this._numSamplesPerRay
        })
    );

    this._blurPass = new EffectPass(ShaderLibrary.get("ao_blur_vertex.glsl"), ShaderLibrary.get("ao_blur_fragment.glsl"));

    this._initSampleDirTexture();
    this._initDitherTexture();
    this._aoPass.setUniform("strengthPerRay", this._strength / this._numRays);
    this._aoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._aoPass.setUniform("halfSampleRadius", this._radius *.5);
    this._aoPass.setUniform("bias", this._bias);
    this._aoPass.setTexture("ditherTexture", this._ditherTexture);
    this._aoPass.setTexture("sampleDirTexture", this._sampleDirTexture);
    this._sourceTextureSlot = this._blurPass.getTextureSlot("source");

    this._aoTexture = new Texture2D();
    this._aoTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._aoTexture.wrapMode = TextureWrapMode.CLAMP;
    this._backTexture = new Texture2D();
    this._backTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._backTexture.wrapMode = TextureWrapMode.CLAMP;
    this._fbo1 = new FrameBuffer(this._backTexture);
    this._fbo2 = new FrameBuffer(this._aoTexture);
};

/**
 * Returns the texture containing the ambient occlusion values.
 *
 * @returns {Texture2D}
 * @ignore
 */
HBAO.prototype.getAOTexture = function()
{
    return this._aoTexture;
};

/**
 * @ignore
 */
HBAO.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;

    if (TextureUtils.assureSize(w, h, this._aoTexture, this._fbo2)) {
        TextureUtils.assureSize(w, h, this._backTexture, this._fbo1);
        this._aoPass.setUniform("ditherScale", {x: w * .25, y: h * .25});
    }

    GL.setClearColor(Color.WHITE);

    GL.setRenderTarget(this._fbo1);
    GL.clear();
    this._drawPass(this._aoPass);

    GL.setRenderTarget(this._fbo2);
    GL.clear();
    this._blurPass.setUniform("pixelSize", {x: 1.0 / w, y: 1.0 / h});
    this._sourceTextureSlot.texture = this._backTexture;
    this._drawPass(this._blurPass);

    GL.setClearColor(Color.BLACK);
};

/**
 * @ignore
 * @private
 */
HBAO.prototype._initSampleDirTexture = function()
{
    this._sampleDirTexture = new Texture2D();
    var data = [];
    var j = 0;

    for (var i = 0; i < 256; ++i)
    {
        var angle = i / 256 * 2.0 * Math.PI;
        var r = Math.cos(angle)*.5 + .5;
        var g = Math.sin(angle)*.5 + .5;
        data[j] = Math.round(r * 0xff);
        data[j+1] = Math.round(g * 0xff);
        data[j+2] = 0x00;
        data[j+3] = 0xff;
        j += 4;
    }

    this._sampleDirTexture.uploadData(new Uint8Array(data), 256, 1, false);
    this._sampleDirTexture.filter = TextureFilter.NEAREST_NOMIP;
    this._sampleDirTexture.wrapMode = TextureWrapMode.REPEAT;
};

/**
 * @ignore
 * @private
 */
HBAO.prototype._initDitherTexture = function()
{
    this._ditherTexture = new Texture2D();
    var data = [];

    var i;
    var j = 0;
    var offsets1 = [];
    var offsets2 = [];

    for (i = 0; i < 16; ++i) {
        offsets1.push(i / 16.0);
        offsets2.push(i / 15.0);
    }

    ArrayUtils.shuffle(offsets1);
    ArrayUtils.shuffle(offsets2);

    i = 0;

    for (var y = 0; y < 4; ++y) {
        for (var x = 0; x < 4; ++x) {
            var r = offsets1[i];
            var g = offsets2[i];

            ++i;

            data[j] = Math.round(r * 0xff);
            data[j + 1] = Math.round(g * 0xff);
            data[j + 2] = 0x00;
            data[j + 3] = 0xff;

            j += 4;
        }
    }

    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.filter = TextureFilter.NEAREST_NOMIP;
    this._ditherTexture.wrapMode = TextureWrapMode.REPEAT;
};

/**
 * @classdesc
 * SSAO adds Screen-Space Ambient Occlusion to the renderer.
 *
 * @property {number} sampleRadius The sample radius in world space to search for occluders.
 * @property {number} fallOffDistance The maximum distance for occluders to still count.
 * @property {number} strength The strength of the ambient occlusion effect.
 * @property {number} scale The scale at which to calculate the ambient occlusion (usually 0.5, half-resolution)
 *
 * @constructor
 * @param numSamples The amount of samples to take per pixel.
 *
 * @see {@linkcode Renderer#ambientOcclusion}
 *
 * @extends Effect
 *
 * @author derschmale <http://www.derschmale.com>
 */
function SSAO(numSamples)
{
    numSamples = numSamples || 8;
    if (numSamples > 64) numSamples = 64;

    this._numSamples = numSamples;
    this._strength = 1.0;
    this._fallOffDistance = 1.0;
    this._radius = .5;
    this._scale = .5;
    this._ditherTexture = null;

    Effect.call(this);
}

SSAO.prototype = Object.create(Effect.prototype, {
    sampleRadius: {
        get: function ()
        {
            return this._radius;
        },
        set: function (value)
        {
            this._radius = value;
            if (this._ssaoPass)
                this._ssaoPass.setUniform("sampleRadius", this._radius);
        }
    },

    fallOffDistance: {
        get: function ()
        {
            return this._fallOffDistance;
        },
        set: function (value)
        {
            this._fallOffDistance = value;
            if (this._ssaoPass)
                this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
        }
    },

    strength: {
        get: function()
        {
            return this._strength;
        },
        set: function (value)
        {
            this._strength = value;
            if (this._ssaoPass)
                this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
        }
    },

    scale: {
        get: function() { return this._scale; },
        set: function(value) { this._scale = value; }
    }
});

/**
 * Called by Helix when initialized
 * @ignore
 */
SSAO.prototype.init = function()
{
    this._ssaoPass = new EffectPass(null,
        ShaderLibrary.get("ssao_fragment.glsl",
            {
                NUM_SAMPLES: this._numSamples
            }
        ));
    this._blurPass = new EffectPass(ShaderLibrary.get("ao_blur_vertex.glsl"), ShaderLibrary.get("ao_blur_fragment.glsl"));

    this._initSamples();
    this._initDitherTexture();
    this._ssaoPass.setUniform("strengthPerSample", 2.0 * this._strength / this._numSamples);
    this._ssaoPass.setUniform("rcpFallOffDistance", 1.0 / this._fallOffDistance);
    this._ssaoPass.setUniform("sampleRadius", this._radius);
    this._ssaoPass.setTexture("ditherTexture", this._ditherTexture);
    this._sourceTextureSlot = this._blurPass.getTextureSlot("source");

    this._ssaoTexture = new Texture2D();
    this._ssaoTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._ssaoTexture.wrapMode = TextureWrapMode.CLAMP;
    this._backTexture = new Texture2D();
    this._backTexture.filter = TextureFilter.BILINEAR_NOMIP;
    this._backTexture.wrapMode = TextureWrapMode.CLAMP;
    this._fbo1 = new FrameBuffer(this._backTexture);
    this._fbo2 = new FrameBuffer(this._ssaoTexture);
};

/**
 * Returns the texture containing the ambient occlusion values.
 * @returns {Texture2D}
 *
 * @ignore
 */
SSAO.prototype.getAOTexture = function()
{
    return this._ssaoTexture;
};

/**
 * @ignore
 * @private
 */
SSAO.prototype._initSamples = function()
{
    var samples = [];
    var j = 0;
    var poissonPoints = PoissonSphere.DEFAULT.getPoints();

    for (var i = 0; i < this._numSamples; ++i) {
        var point = poissonPoints[i];

        // power of two, to create a bit more for closer occlusion
        samples[j++] = Math.pow(point.x, 2);
        samples[j++] = Math.pow(point.y, 2);
        samples[j++] = Math.pow(point.z, 2);
    }

    this._ssaoPass.setUniformArray("samples", new Float32Array(samples));
};

/**
 * @ignore
 */
SSAO.prototype.draw = function(dt)
{
    var w = this._renderer._width * this._scale;
    var h = this._renderer._height * this._scale;

    if (TextureUtils.assureSize(w, h, this._ssaoTexture, this._fbo2)) {
        TextureUtils.assureSize(w, h, this._backTexture, this._fbo1);
        this._ssaoPass.setUniform("ditherScale", {x: w *.25, y: h *.25});
    }

    GL.setClearColor(Color.WHITE);

    GL.setRenderTarget(this._fbo1);
    GL.clear();
    this._drawPass(this._ssaoPass);

    GL.setRenderTarget(this._fbo2);
    GL.clear();
    this._blurPass.setUniform("pixelSize", {x: 1.0 / w, y: 1.0 / h});
    this._sourceTextureSlot.texture = this._backTexture;
    this._drawPass(this._blurPass);

    GL.setClearColor(Color.BLACK);
};

/**
 * @ignore
 * @private
 */
SSAO.prototype._initDitherTexture = function()
{
    var data = [ 126, 255, 126, 255, 135, 253, 105, 255, 116, 51, 26, 255, 137, 57, 233, 255, 139, 254, 121, 255, 56, 61, 210, 255, 227, 185, 73, 255, 191, 179, 30, 255, 107, 245, 173, 255, 205, 89, 34, 255, 191, 238, 138, 255, 56, 233, 125, 255, 198, 228, 161, 255, 85, 13, 164, 255, 140, 248, 168, 255, 147, 237, 65, 255 ];

    // in case you're wondering, below is how the list above is generated:
    // We're just using fixed data to prevent poor random results
    /*var n = new HX.Float4();
    for (var i = 0; i < 16; ++i) {
        var azimuthal = Math.random() * Math.PI * 2.0;
        var polar = Math.random() * Math.PI;
        n.fromSphericalCoordinates(1.0, azimuthal, polar);
        data[i * 4] = Math.round((n.x * .5 + .5) * 0xff);
        data[i * 4 + 1] = Math.round((n.y * .5 + .5) * 0xff);
        data[i * 4 + 2] = Math.round((n.z * .5 + .5) * 0xff);
        data[i * 4 + 3] = 0xff;
    }
    console.log(data.join(", "));*/

    this._ditherTexture = new Texture2D();
    this._ditherTexture.uploadData(new Uint8Array(data), 4, 4, false);
    this._ditherTexture.filter = TextureFilter.NEAREST_NOMIP;
    this._ditherTexture.wrapMode = TextureWrapMode.REPEAT;
};

/**
 * @classdesc
 * ReinhardToneMapping is an {@linkcode Effect} added to the Camera that applies Reinhard tone mapping.
 *
 * @constructor
 * @param adaptive Whether or not the brightness should adapt to the average brightness of the scene. If not supported, it will disable.
 *
 * @extends ToneMapping
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ReinhardToneMapping(adaptive)
{
    ToneMapEffect.call(this, adaptive);
}

ReinhardToneMapping.prototype = Object.create(ToneMapEffect.prototype);

/**
 * @ignore
 * @private
 */
ReinhardToneMapping.prototype._createToneMapPass = function()
{
    var defines = {};
    var extensions = "";

    if (this._adaptive) {
        defines.HX_ADAPTIVE = 1;
        extensions += "#texturelod\n";
    }

    return new EffectPass(
        null,
        extensions + ShaderLibrary.get("snippets_tonemap.glsl", defines) + "\n" + ShaderLibrary.get("tonemap_reinhard_fragment.glsl")
    );
};

/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
var FileUtils =
{
    extractPathAndFilename: function(filename)
    {
        var index = filename.lastIndexOf("/");
        var obj = {};

        if (index >= 0) {
            obj.path = filename.substr(0, index + 1);
            obj.filename = filename.substr(index + 1);
        }
        else {
            obj.path = "./";
            obj.filename = filename;
        }

        return obj;
    }
};

/**
 * @ignore
 *
 * @classdesc
 * URLLoader loads any sort of file. It exists only to hide ugly XMLHttpRequest stuff.
 *
 * @param [headers] Optional headers (key/value pairs) to pass along to the request.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function URLLoader(headers)
{
    this._params = undefined;
    this._data = null;
    this._timeout = 0;
    this._method = 'GET';
    this._type = URLLoader.DATA_TEXT;
    this._headers = headers || {};
}

URLLoader.ERROR_TIME_OUT = 408;
URLLoader.METHOD_GET = 'get';
URLLoader.METHOD_POST = 'post';

URLLoader.DATA_TEXT = 0;
URLLoader.DATA_BINARY = 1;

URLLoader.prototype =
{
    get type()
    {
        return this._type;
    },

    set type(value)
    {
        this._type = value;
    },

    get method()
    {
        return this._method;
    },

    set method(value)
    {
        this._method = value;
    },

    get timeoutDuration()
    {
        return this._timeout;
    },

    set timeoutDuration(milliseconds)
    {
        this._timeout = milliseconds;
    },

    get parameters()
    {
        return this._params;
    },

    set parameters(params)
    {
        this._params = params;
    },

    get data()
    {
        return this._data;
    },

    setRequestHeader: function(name, value)
    {
        this._headers[name] = value;
    },

    load: function (url)
    {
        var request = new XMLHttpRequest();
        request.open(this._method, url, true);

        for (var key in this._headers) {
            if (this._headers.hasOwnProperty(key))
                request.setRequestHeader(key, this._headers[key]);
        }

        if (this._timeout) {
            request.timeout = this._timeout;

            request.ontimeout = function ()
            {
                self.onError(URLLoader.ERROR_TIME_OUT);
            };
        }

        if (this._type === URLLoader.DATA_BINARY)
            request.responseType = "arraybuffer";
        else
            request.overrideMimeType("application/json");

        var self = this;

        request.onreadystatechange = function ()
        {
            var DONE = this.DONE || 4;
            if (this.readyState === DONE) {
                if (this.status === 200) {
                    this._data = self._type === URLLoader.DATA_TEXT? request.responseText : new DataView(request.response);
                    if (self.onComplete) self.onComplete(this._data);
                }
                else if (self.onError)
                    self.onError(this.status);
            }
        };

        request.send(this._params);
    },

    // made to assign
    onComplete: function (data)
    {
    },

    onError: function (errorStatus)
    {
    }
};

/**
 * @classdesc
 * A base class for importers.
 *
 * @ignore
 * @param containerType
 * @param dataType
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Importer(containerType, dataType)
{
    this._dataType = dataType === undefined? URLLoader.DATA_TEXT : dataType;
    this._containerType = containerType;
    this.onComplete = null;
    this.onProgress = null;
    this.onFail = null;
    this.fileMap = null;
    // be able to pass importer specific settings. crossOrigin is used for images, fe.
    this.options = {};
    this.path = "";
    this.filename = "";
}

Importer.prototype =
    {
        get dataType() { return this._dataType; },
        createContainer: function() { return new this._containerType(); },

        parse: function(data, target) {},

        _notifyComplete: function(asset)
        {
            if (!this.onComplete) return;

            if (this.onComplete instanceof Signal)
                this.onComplete.dispatch(asset);
            else
                this.onComplete(asset);
        },

        _notifyProgress: function(ratio)
        {
            if (!this.onProgress) return;

            if (this.onProgress instanceof Signal)
                this.onProgress.dispatch(ratio);
            else
                this.onProgress(ratio);
        },

        _notifyFailure: function(message)
        {
            if (this.onFail instanceof Signal) {
                if (!this.onFail.hasListeners) {
                    console.error(message);
                }
                this.onFail.dispatch(message);
            }
            else
                this.onFail(message);
        },

        // expresses a url in the file relative to the original file being loaded
        _correctURL: function(url)
        {
            return this.path + (this.fileMap.hasOwnProperty(url)? this.fileMap[url] : url).replace("\\", "/");
        }
    };

Importer.TYPE_TEXT = URLLoader.DATA_TEXT;
Importer.TYPE_BINARY = URLLoader.DATA_BINARY;
Importer.TYPE_IMAGE = 2;

/**
 * @classdesc
 * AssetLoader allows loading of any sort of asset. It can be used to load several assets, but onComplete and onFail will be called for each.
 * @param ImporterType ImporterType The type of importer to use for the asset. For example: JPG, HCM (material), OBJ, ... Do NOT pass in an instance, just the class name!
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AssetLoader(ImporterType)
{
    // this can either be listened to, or overwritten by a function
    this.onComplete = new Signal();
    this.onProgress = new Signal();
    this.onFail = new Signal();

    /**
     * Key/value pairs that allows replacing file names with new ones.
     */
    this.fileMap = {};

    /**
     * Key/value pairs that specify options to be passed on to the Importers. See the importer documentation for details
     * on which options can be set.
     */
    this.options = {};

    this._headers = {};

    this._importerType = ImporterType;

    /**
     * Allow setting a cross-origin string when loading images.
     */
    this.crossOrigin = undefined;
}

AssetLoader.prototype =
{
    /**
     * Set custom http request headers.
     * @param name The name of the header.
     * @param value The value of the header.
     */
    setRequestHeader: function(name, value)
    {
        this._headers[name] = value;
    },

    /**
     * Loads the asset.
     * @param filename The filename/url to load.
     * @param [target] An optional empty target asset. This allows lazy loading.
     * @returns {*} Immediately returns an empty version of the assets that will be populated eventually during parsing.
     */
    load: function (filename, target)
    {
        function fail(code) {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (this.onFail) {
                if (this.onFail instanceof Signal)
                    this.onFail.dispatch(code);
                else
                    this.onFail(code);
            }
        }

        var importer = new this._importerType();
        target = target || importer.createContainer();
        importer.onComplete = this.onComplete;
        importer.onProgress = this.onProgress;
        importer.onFail = this.onFail;
        importer.fileMap = this.fileMap;
        importer.options = this.options;
        var file = FileUtils.extractPathAndFilename(filename);
        importer.path = file.path;
        importer.filename = file.filename;

        if (importer.dataType === Importer.TYPE_IMAGE) {
            var image = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
            image.crossOrigin = this.options.crossOrigin;
            image.addEventListener("load", function() {
                importer.parse(image, target);
            });

            image.addEventListener("error", function() {
                console.warn("Failed loading texture '" + filename + "'");
                fail.call(this);
            });
            image.src = filename;
        }
        else {
            var self = this;
            var urlLoader = new URLLoader(this._headers);
            urlLoader.type = importer.dataType;

            urlLoader.onComplete = function (data)
            {
                importer.parse(data, target);
            };

            urlLoader.onError = function (code)
            {
                fail.call(self, code);
            };

            urlLoader.load(filename);
        }

        return target;
    }
};

/**
 * @constructor
 * @param {string} basePath The base path or url to load the assets from. All filenames will have this value prepended.
 * @param {string} [crossOrigin] An optional cross origin string. This is used when loading images from a different domain.
 *
 * @classdesc
 * AssetLibrary provides a way to load a collection of assets. These can be textures, models, plain text, json, ...
 * Assets need to be queued with a given ID and loading starts when requested. When loading completes, the ID can be used
 * to retrieve the loaded asset.
 *
 * @example
 * var assetLibrary = new HX.AssetLibrary("assets/");
 * assetLibrary.queueAsset("some-model", "models/some-model.obj", HX.AssetLibrary.Type.ASSET, HX.OBJ);
 * assetLibrary.queueAsset("some-texture", "textures/some_texture.png", HX.AssetLibrary.Type.ASSET, HX.PNG);
 * assetLibrary.onComplete.bind(onAssetsLoaded);
 * assetLibrary.onProgress.bind(onAssetsProgress);
 * assetLibrary.load();
 *
 * function onAssetsLoaded()
 * {
 * // do something
 * }
 *
 * function onAssetsProgress(ratio)
 * {
 *      var percent = ratio * 100
 * }
 *
 * @author derschmale <http://www.derschmale.com>
 */

function AssetLibrary(basePath, crossOrigin)
{
    this.fileMap = {};
    this._numLoaded = 0;
    this._queue = [];
    this._assets = {};
    if (basePath && basePath.charAt(basePath.length - 1) !== "/") basePath += "/";
    this._basePath = basePath || "";
    this._onComplete = new Signal(/* void */);
    this._onProgress = new Signal(/* number */);
    this._crossOrigin = crossOrigin;
}

/**
 * The type of asset to load. For example: <code>AssetLibrary.Type.JSON</code> for a JSON object.
 * @enum
 */
AssetLibrary.Type = {
    /**
     * A JSON data object.
     */
    JSON: 0,

    /**
     * An asset.
     */
    ASSET: 1,

    /**
     * A plain text file.
     */
    PLAIN_TEXT: 2,

    /**
     * Raw binary data
     */
    RAW_BINARY: 3
};

AssetLibrary.prototype =
{
    /**
     * The {@linkcode Signal} dispatched when all assets have completed loading. Its payload object is a reference to
     * the assetLibrary itself.
     * @see {@linkcode Signal}.
     */
    get onComplete()
    {
        return this._onComplete;
    },

    /**
     * The {@linkcode Signal} dispatched when all assets have completed loading. Its payload is the ratio of loaded
     * objects for 0 to 1.
     * @see {@linkcode Signal}
     */
    get onProgress()
    {
        return this._onProgress;
    },

    /**
     * The base path relative to which all the filenames are defined. This value is set in the constructor.
     */
    get basePath()
    {
        return this._basePath;
    },

    /**
     * The cross origin string passed to the constructor.
     */
    get crossOrigin()
    {
        return this._crossOrigin;
    },

    /**
     * Adds an asset to the loading queue.
     * @param {string} id The ID that will be used to retrieve the asset when loaded.
     * @param {string} filename The filename relative to the base path provided in the constructor.
     * @param {AssetLibrary.Type} type The type of asset to be loaded.
     * @param parser The parser used to parse the loaded data.
     * @param [options] An optional options object (importer-dependent)
     * @param [target] An optional empty target to contain the parsed asset. This allows lazy loading.
     * @see {@linkcode AssetLibrary#Type}
     */
    queueAsset: function(id, filename, type, parser, options, target)
    {
        this._queue.push({
            id: id,
            filename: this._basePath + filename,
            type: type,
            parser: parser,
            options: options,
            target: target
        });
    },

    /**
     * Start loading all the assets. Every time a single asset finished loading, <code>onProgress</code> is dispatched.
     * When all assets have finished loading, <code>onComplete</code> is dispatched.
     */
    load: function()
    {
        if (this._queue.length === 0) {
            this.onComplete.dispatch();
            return;
        }

        var asset = this._queue[this._numLoaded];

        switch (asset.type) {
            case AssetLibrary.Type.JSON:
                this._json(asset.filename, asset.id);
                break;
            case AssetLibrary.Type.PLAIN_TEXT:
                this._plainText(asset.filename, asset.id);
                break;
            case AssetLibrary.Type.RAW_BINARY:
                this._rawBinary(asset.filename, asset.id);
                break;
            case AssetLibrary.Type.ASSET:
                this._asset(asset.filename, asset.id, asset.parser, asset.options, asset.target);
                break;
            default:
                throw new Error("Unknown asset type " + asset.type + "!");
        }
    },

    /**
     * Retrieves a loaded asset from the asset library. This method should only be called once <code>onComplete</code>
     * has been dispatched.
     * @param {string} id The ID assigned to the loaded asset when calling <code>queueAsset</code>
     * @returns {*} The loaded asset.
     */
    get: function(id) { return this._assets[id]; },

    /**
     * Adds an asset explicitly.
     * @param {string} id The ID assigned to the asset when calling <code>get</code>
     * @param asset The asset to add to the library
     */
    addAsset: function(id, asset)
    {
        this._assets[id] = asset;
    },

    /**
     * Merges the contents of another library into the current.
     * @param {AssetLibrary} library The library to add.
     */
    mergeLibrary: function(library)
    {
        ArrayUtils.forEach(library._assets, (function (obj, key)
        {
            this.addAsset(key, obj);
        }).bind(this));
    },

    _json: function(file, id)
    {
        var self = this;
        var loader = new XMLHttpRequest();
        loader.overrideMimeType("application/json");
        loader.open('GET', file, true);
        loader.onreadystatechange = function()
        {
            if (loader.readyState === 4 && loader.status === 200) {
                self._assets[id] = JSON.parse(loader.responseText);
                self._onAssetLoaded();
            }
        };
        loader.send(null);
    },

    _plainText: function(file, id)
    {
        var self = this;
        var loader = new XMLHttpRequest();
        loader.overrideMimeType("application/json");
        loader.open('GET', file, true);
        loader.onreadystatechange = function()
        {
            if (loader.readyState === 4 && loader.status === 200) {
                self._assets[id] = loader.responseText;
                self._onAssetLoaded();
            }
        };

        loader.send(null);
    },

    _rawBinary: function(file, id)
    {
        var self = this;
        var loader = new URLLoader();
        loader.type = URLLoader.DATA_BINARY;
        loader.onComplete = function (data)
        {
            self._assets[id] = data;
            self._onAssetLoaded();
        };

        loader.load(file);
    },

    _asset: function(file, id, parser, options, target)
    {
        var loader = new AssetLoader(parser);
        loader.fileMap = this.fileMap;
        loader.options = options || {};
        loader.options.crossOrigin = this._crossOrigin;
        loader.onComplete.bind(function()
        {
            this._onAssetLoaded();
        }, this);

        loader.onProgress.bind(function(ratio)
        {
            this._onProgress.dispatch((this._numLoaded + ratio) / this._queue.length);
        }, this);

        this._assets[id] = loader.load(file, target);
    },

    _onAssetLoaded: function()
    {
        ++this._numLoaded;

        this._onProgress.dispatch(this._numLoaded / this._queue.length);

        if (this._numLoaded === this._queue.length)
            this._onComplete.dispatch(this);
        else
            this.load();
    }
};

/**
 * @classdesc
 * HCM is an Importer for Helix' json-based cube map formats. Yields a {@linkcode TextureCube} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HCM()
{
    Importer.call(this, TextureCube);
}

HCM.prototype = Object.create(Importer.prototype);

HCM.prototype.parse = function(file, target)
{
    var data = JSON.parse(file);

    var urls = [
        data.files.posX,
        data.files.negX,
        data.files.posY,
        data.files.negY,
        data.files.posZ,
        data.files.negZ
    ];

    if (data.loadMips)
        this._loadMipChain(urls, target);
    else
        this._loadFaces(urls, target);
};

HCM.prototype._loadFaces = function(urls, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    var images = [];
    var self = this;

    var onError = function() {
        self._notifyFailure("Failed loading texture '" + urls[0] + "'");
    };

    var onLoad = function()
    {
        self._notifyProgress(this.nextID / 6);
        images[this.nextID].src = self.path + urls[this.nextID];
    };

    var onLoadLast = function() {
        target.uploadImages(images, generateMipmaps);
        self._notifyComplete(target);
    };

    for (var i = 0; i < 6; ++i) {
        var image = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
        image.crossOrigin = this.options.crossOrigin;
        image.nextID = i + 1;
        if (i < 5) {
            image.addEventListener("load", onLoad);
        }
        // last image to load
        else {
            image.addEventListener("load", onLoadLast);
        }

        image.addEventListener("error", onError);

        images[i] = image;
    }

    images[0].src = self.path + urls[0];
};

HCM.prototype._loadMipChain = function(urls, target)
{
    var images = [];

    var numMips;

    var self = this;
    var firstImage = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
    var realURLs = [];

    for (var i = 0; i < 6; ++i) {
        realURLs[i] = urls[i].replace("%m", "0");
    }

    firstImage.addEventListener("load", function()
    {
        if (firstImage.naturalWidth !== firstImage.naturalHeight || !MathX.isPowerOfTwo(firstImage.naturalWidth)) {
            self._notifyFailure("Failed loading mipchain: incorrect dimensions");
        }
        else {
            numMips = MathX.log2(firstImage.naturalWidth) + 1;
            loadTheRest();
            images[0] = firstImage;
        }
    });

    firstImage.addEventListener("error", function()
    {
        self._notifyFailure("Failed loading texture");
    });

    firstImage.src = self.path + realURLs[0];

    function loadTheRest()
    {
        var progressRatios = [];
        var len = numMips * 6;
        var r = 1, totalRatio = 0;
        for (var i = 1; i < numMips; ++i) {
            for (var j = 0; j < 6; ++j) {
                realURLs.push(urls[j].replace("%m", i.toString()));
                progressRatios.push(r);
                totalRatio += r;
            }
            r *= .5;
        }

        var onError = function ()
        {
            self._notifyFailure("Failed loading texture");
        };

        var onLoad = function ()
        {
            self._notifyProgress(progressRatios[this.nextID] / totalRatio);
            images[this.nextID].src = self.path + realURLs[this.nextID];
        };

        var onLoadLast = function ()
        {
            for (var m = 0; m < numMips; ++m)
                target.uploadImagesToMipLevel(images.slice(m * 6, m * 6 + 6), m);

            target._isReady = true;
            self._notifyComplete(target);
        };

        for (i = 1; i < len; ++i) {
            var image = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
            image.crossOrigin = self.options.crossOrigin;
            image.nextID = i + 1;
            if (i < len - 1) {
                image.addEventListener("load", onLoad);
            }
            // last image to load
            else {
                image.addEventListener("load", onLoadLast);
            }

            image.addEventListener("onError", onError);

            images[i] = image;
        }

        images[1].src = self.path + realURLs[1];
    }
};

/**
 * @classdesc
 *
 * JPG is an importer for JPG images as textures. Yields a {@linkcode Texture2D} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function JPG()
{
    Importer.call(this, Texture2D, Importer.TYPE_IMAGE);
}

JPG.prototype = Object.create(Importer.prototype);

JPG.prototype.parse = function(data, target)
{
    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    target.uploadImage(data, data.naturalWidth, data.naturalHeight, generateMipmaps);
    this._notifyComplete(target);
};

/**
 * @classdesc
 * Synonymous to {@linkcode JPG}.
 *
 * @constructor
 */
var PNG = JPG;

/**
 * @classdesc
 * HCM is an Importer for Helix' json-based material formats. Yields a {@linkcode Material} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function HMT()
{
    Importer.call(this, Material);
    HMT._initPropertyMap();
}

HMT.prototype = Object.create(Importer.prototype);

HMT.prototype.parse = function(data, target)
{
    data = JSON.parse(data);
    this._loadShaders(data, target);
};

HMT.prototype._gatherShaderFiles = function(data)
{
    var files = [];
    var geometry = data.geometry;

    var vertex = geometry.vertexShader;
    var fragment = geometry.fragmentShader;
    var lighting = data.lightingModel;
    if (files.indexOf(vertex) < 0) files.push(this._correctURL(vertex));
    if (files.indexOf(fragment) < 0) files.push(this._correctURL(fragment));
    if (lighting && files.indexOf(lighting) < 0) files.push(this._correctURL(lighting));

    return files;
};

HMT.prototype._loadShaders = function(data, material)
{
    // urls will already be correctURL'ed
    var shaderFiles = this._gatherShaderFiles(data);
    this._shaderLibrary = new AssetLibrary(null, this.options.crossOrigin);
    this._shaderLibrary.fileMap = this.fileMap;

    for (var i = 0; i < shaderFiles.length; ++i) {
        this._shaderLibrary.queueAsset(shaderFiles[i], shaderFiles[i], AssetLibrary.Type.PLAIN_TEXT);
    }

    this._shaderLibrary.onComplete.bind(function()
    {
        this._processMaterial(data, material);
        this._loadTextures(data, material);
    }, this);

    // this._shaderLibrary.onFail.bind(function(code)
    // {
    //     this._notifyFailure("Error loading shaders: " + code);
    // }, this);
    this._shaderLibrary.load();
};


HMT.prototype._processMaterial = function(data, material)
{
    var defines = "";
    if (this.options.defines) {
        ArrayUtils.forEach(this.options.defines, (function(obj, key) {
            defines += "#define " + key + " " + obj + "\n";
        }).bind(this));
    }

    var geometryVertex = defines + this._shaderLibrary.get(this._correctURL(data.geometry.vertexShader));
    var geometryFragment = defines + this._shaderLibrary.get(this._correctURL(data.geometry.fragmentShader));

    material._geometryVertexShader = geometryVertex;
    material._geometryFragmentShader = geometryFragment;
    material.init();

    if (data.lightingModel)
        material.lightingModel = this._shaderLibrary.get(this._correctURL(data.lightingModel));

    this._applyUniforms(data, material);

    if (data.hasOwnProperty("elementType"))
        material.elementType = HMT._PROPERTY_MAP[data.elementType];

    if (data.hasOwnProperty("cullMode"))
        material.cullMode = HMT._PROPERTY_MAP[data.cullMode];

    if (data.hasOwnProperty("writeDepth"))
        material.writeDepth = data.writeDepth;

    if (data.hasOwnProperty("blend")) {
        var blendState = new BlendState();
        var blend = data.blend;

        if (blend.hasOwnProperty("source"))
            blendState.srcFactor = HMT._PROPERTY_MAP[blend.source];

        if (blend.hasOwnProperty("destination"))
            blendState.dstFactor = HMT._PROPERTY_MAP[blend.destination];

        if (blend.hasOwnProperty("operator"))
            blendState.operator = HMT._PROPERTY_MAP[blend.operator];

        material.blendState = blendState;
    }
};

HMT.prototype._applyUniforms = function(data, material)
{
    if (!data.uniforms) return;

    for (var key in data.uniforms) {
        if (!data.uniforms.hasOwnProperty(key)) continue;

        var value = data.uniforms[key];
        if (isNaN(value))
            material.setUniform(key, {
                x: value[0],
                y: value[1],
                z: value[2],
                w: value[3]
            }, false);
        else
            material.setUniform(key, value, false);
    }
};

HMT.prototype._loadTextures = function(data, material)
{
    var files = [];

    for (var key in data.textures) {
        if (data.textures.hasOwnProperty(key)) {
            files.push(this._correctURL(data.textures[key]));
            material.setTexture(key, Texture2D.DEFAULT);
        }
    }

    this._textureLibrary = new AssetLibrary(null, this.options.crossOrigin);
    this._textureLibrary.fileMap = this.fileMap;

    for (var i = 0; i < files.length; ++i) {
        this._textureLibrary.queueAsset(files[i], files[i], AssetLibrary.Type.ASSET, JPG);
    }

    this._textureLibrary.onComplete.bind(function()
    {
        for (var key in data.textures) {
            if (data.textures.hasOwnProperty(key)) {
                material.setTexture(key, this._textureLibrary.get(this._correctURL(data.textures[key])));
            }
        }
        this._notifyComplete(material);
    }, this);
    // bulkLoader.onFail = function(message)
    // {
    //     self._notifyFailure(message);
    // };

    this._textureLibrary.load();
};


HMT._PROPERTY_MAP = null;

HMT._initPropertyMap = function() {
    HMT._PROPERTY_MAP = HMT._PROPERTY_MAP || {
        back: CullMode.BACK,
        front: CullMode.FRONT,
        both: CullMode.ALL,
        none: null,
        lines: ElementType.LINES,
        points: ElementType.POINTS,
        triangles: ElementType.TRIANGLES,
        one: BlendFactor.ONE,
        zero: BlendFactor.ZERO,
        sourceColor: BlendFactor.SOURCE_COLOR,
        oneMinusSourceColor: BlendFactor.ONE_MINUS_SOURCE_COLOR,
        sourceAlpha: BlendFactor.SOURCE_ALPHA,
        oneMinusSourceAlpha: BlendFactor.ONE_MINUS_SOURCE_ALPHA,
        destinationAlpha: BlendFactor.DST_ALPHA,
        oneMinusDestinationAlpha: BlendFactor.ONE_MINUS_DESTINATION_ALPHA,
        destinationColor: BlendFactor.DESTINATION_COLOR,
        sourceAlphaSaturate: BlendFactor.SOURCE_ALPHA_SATURATE,
        add: BlendOperation.ADD,
        subtract: BlendOperation.SUBTRACT,
        reverseSubtract: BlendOperation.REVERSE_SUBTRACT,

        // depth tests
        always: Comparison.ALWAYS,
        disabled: Comparison.DISABLED,
        equal: Comparison.EQUAL,
        greater: Comparison.GREATER,
        greaterEqual: Comparison.GREATER_EQUAL,
        less: Comparison.LESS,
        lessEqual: Comparison.LESS_EQUAL,
        never: Comparison.NEVER,
        notEqual: Comparison.NOT_EQUAL
    };
};

/**
 * EquirectangularTexture is a utility class that converts equirectangular environment {@linknode Texture2D} to a
 * {@linkcode TextureCube}.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var EquirectangularTexture =
{
    /**
     * Convert an equirectangular environment {@linknode Texture2D} to a {@linkcode TextureCube}.
     * @param source The source {@linknode Texture2D}
     * @param [size] The size of the target cube map.
     * @param [generateMipmaps] Whether or not a mip chain should be generated.
     * @param [target] An optional target {@linkcode TextureCube} to contain the converted data.
     * @returns {TextureCube} The environment map in a {@linkcode TextureCube}
     */
    toCube: function(source, size, generateMipmaps, target)
    {
        generateMipmaps = generateMipmaps || true;
        size = size || source.height;

        if (!EquirectangularTexture._EQUI_TO_CUBE_SHADER)
            EquirectangularTexture._EQUI_TO_CUBE_SHADER = new Shader(ShaderLibrary.get("2d_to_cube_vertex.glsl"), ShaderLibrary.get("equirectangular_to_cube_fragment.glsl"));

        this._createRenderCubeGeometry();

        var gl = GL.gl;
        target = target || new TextureCube();
        target.initEmpty(size, source.format, source.dataType);
        var faces = [ gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z ];

        EquirectangularTexture._EQUI_TO_CUBE_SHADER.updatePassRenderState();

        var textureLocation = EquirectangularTexture._EQUI_TO_CUBE_SHADER.getUniformLocation("source");
        var posLocation = EquirectangularTexture._EQUI_TO_CUBE_SHADER.getAttributeLocation("hx_position");
        var cornerLocation = EquirectangularTexture._EQUI_TO_CUBE_SHADER.getAttributeLocation("corner");

        gl.uniform1i(textureLocation, 0);
        source.bind(0);

        EquirectangularTexture._TO_CUBE_VERTICES.bind();
        EquirectangularTexture._TO_CUBE_INDICES.bind();
        gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 20, 0);
        gl.vertexAttribPointer(cornerLocation, 3, gl.FLOAT, false, 20, 8);

        GL.enableAttributes(2);
        var old = GL.getCurrentRenderTarget();

        for (var i = 0; i < 6; ++i) {
            var fbo = new FrameBuffer(target, null, faces[i]);
            fbo.init();

            GL.setRenderTarget(fbo);
            GL.drawElements(gl.TRIANGLES, 6, i * 6);
        }

        GL.setRenderTarget(old);

        if (generateMipmaps)
            target.generateMipmap();

        // TODO: for some reason, if EXT_shader_texture_lod is not supported, mipmapping of rendered-to cubemaps does not work
        if (!capabilities.EXT_SHADER_TEXTURE_LOD)
            target.filter = TextureFilter.BILINEAR_NOMIP;

        return target;
    },

    _createRenderCubeGeometry: function()
    {
        if (EquirectangularTexture._TO_CUBE_VERTICES) return;
        var vertices = [
            // pos X
            1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, 1.0, 1.0, -1.0, 1.0,
            -1.0, -1.0, 1.0, 1.0, 1.0,
            1.0, -1.0, 1.0, 1.0, -1.0,

            // neg X
            1.0, 1.0, -1.0, -1.0, 1.0,
            -1.0, 1.0, -1.0, -1.0, -1.0,
            -1.0, -1.0, -1.0, 1.0, -1.0,
            1.0, -1.0, -1.0, 1.0, 1.0,

            // pos Y
            -1.0, -1.0, -1.0, 1.0, -1.0,
            1.0, -1.0, 1.0, 1.0, -1.0,
            1.0, 1.0, 1.0, 1.0, 1.0,
            -1.0, 1.0, -1.0, 1.0, 1.0,

            // neg Y
            -1.0, -1.0, -1.0, -1.0, 1.0,
            1.0, -1.0, 1.0, -1.0, 1.0,
            1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, 1.0, -1.0, -1.0, -1.0,

            // pos Z
            1.0, 1.0, 1.0, -1.0, 1.0,
            -1.0, 1.0, -1.0, -1.0, 1.0,
            -1.0, -1.0, -1.0, 1.0, 1.0,
            1.0, -1.0, 1.0, 1.0, 1.0,

            // neg Z
            1.0, 1.0, -1.0, -1.0, -1.0,
            -1.0, 1.0, 1.0, -1.0, -1.0,
            -1.0, -1.0, 1.0, 1.0, -1.0,
            1.0, -1.0, -1.0, 1.0, -1.0
        ];
        var indices = [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            8, 9, 10, 8, 10, 11,
            12, 13, 14, 12, 14, 15,
            16, 17, 18, 16, 18, 19,
            20, 21, 22, 20, 22, 23
        ];
        EquirectangularTexture._TO_CUBE_VERTICES = new VertexBuffer();
        EquirectangularTexture._TO_CUBE_INDICES = new IndexBuffer();
        EquirectangularTexture._TO_CUBE_VERTICES.uploadData(new Float32Array(vertices));
        EquirectangularTexture._TO_CUBE_INDICES.uploadData(new Uint16Array(indices));
    }
};

/**
 * @classdesc
 * JPG_EQUIRECTANGULAR loads a JPG containing an equirectangular environment map and converts it to a cube map for use
 * in shaders. Yields a {@linkcode TextureCube} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function JPG_EQUIRECTANGULAR()
{
    Importer.call(this, TextureCube, Importer.TYPE_IMAGE);
}

JPG_EQUIRECTANGULAR.prototype = Object.create(Importer.prototype);

JPG_EQUIRECTANGULAR.prototype.parse = function(data, target)
{
    var texture2D = new Texture2D();
    texture2D.wrapMode = TextureWrapMode.REPEAT;
    texture2D.uploadImage(data, data.naturalWidth, data.naturalHeight, true);

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    EquirectangularTexture.toCube(texture2D, this.options.size, generateMipmaps, target);
    this._notifyComplete(target);
};

var PNG_EQUIRECTANGULAR = JPG_EQUIRECTANGULAR;

/**
 * HeightMap contains some utilities for height maps.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var HeightMap =
{
    /**
     * Smooths out an 8-bit per channel texture to serve as a height map. Otherwise, the limited 8 bit precision would
     * result in a stair-case effect.
     *
     * @param texture The source 8-bit per channel texture.
     * @param [generateMipmaps] Whether or not to generate a mip chain.
     * @param [target] An optional target texture.
     */
    from8BitTexture: function(texture, generateMipmaps, target)
    {
        var gl = GL.gl;
        generateMipmaps = generateMipmaps || true;
        var tex1 = target || new Texture2D();
        tex1.initEmpty(texture.width, texture.height);
        var fbo1 = new FrameBuffer(tex1);
        fbo1.init();

        var tex2 = new Texture2D();
        tex2.initEmpty(texture.width, texture.height);
        var fbo2 = new FrameBuffer(tex2);
        fbo2.init();

        var toRGBA8 = new CustomCopyShader(ShaderLibrary.get("greyscale_to_rgba8.glsl"));
        var oldRT = GL.getCurrentRenderTarget();

        GL.setRenderTarget(fbo1);
        GL.clear();
        toRGBA8.execute(RectMesh.DEFAULT, texture);

        if (generateMipmaps)
            target.generateMipmap();

        var smooth = new CustomCopyShader(ShaderLibrary.get("smooth_heightmap_fragment.glsl"));
        var textureLocation = gl.getUniformLocation(smooth._program, "reference");
        var offsetLocation = gl.getUniformLocation(smooth._program, "stepSize");
        gl.uniform1i(textureLocation, 1);

        texture.bind(1);

        GL.setRenderTarget(fbo2);
        GL.clear();
        gl.uniform2f(offsetLocation, 1.0 / texture.width, 0.0);
        smooth.execute(RectMesh.DEFAULT, tex1);
        tex2.generateMipmap();

        GL.setRenderTarget(fbo1);
        GL.clear();
        gl.uniform2f(offsetLocation, 0.0, 1.0 / texture.height);
        smooth.execute(RectMesh.DEFAULT, tex2);

        if (generateMipmaps)
            target.generateMipmap();

        GL.setRenderTarget(oldRT);

        return tex1;
    }
};

/**
 * @classdesc
 * JPG_HEIGHTMAP imports an 8-bit per channel image and smooths it out to serve as a height map. Otherwise, the limited
 * 8 bit precision would result in a stair-case effect. Yields a {@linkcode Texture2D} object.
 *
 * @constructor
 *
 * @extends Importer
 *
 * @author derschmale <http://www.derschmale.com>
 */
function JPG_HEIGHTMAP()
{
    Importer.call(this, Texture2D, Importer.TYPE_IMAGE);
}

JPG_HEIGHTMAP.prototype = Object.create(Importer.prototype);

JPG_HEIGHTMAP.prototype.parse = function(data, target)
{
    var texture2D = new Texture2D();
    texture2D.wrapMode = TextureWrapMode.REPEAT;
    texture2D.uploadImage(data, data.naturalWidth, data.naturalHeight, true);

    var generateMipmaps = this.options.generateMipmaps === undefined? true : this.options.generateMipmaps;
    HeightMap.from8BitTexture(texture2D, generateMipmaps, target);
    this._notifyComplete(target);
};

var PNG_HEIGHTMAP = JPG_HEIGHTMAP;

/**
 * @classdesc
 * AmbientLight can be added to the scene to provide a minimum (single-color) amount of light in the scene. Internally,
 * it's not a true {@linkcode Light} object, and it's handled differently in the renderer.
 *
 * @property {Color} color The color of the ambient light.
 * @property {number} intensity The intensity of the ambient light.
 *
 * @constructor
 *
 * @extends Entity
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AmbientLight()
{
    // AMBIENT LIGHT IS NOT ACTUALLY A REAL LIGHT OBJECT
    Entity.call(this);
    this._scaledIrradiance = new Color();
    this._intensity = .2;
    this.color = new Color(1, 1, 1);
    this._scaledIrradiance = new Color();
    this._updateScaledIrradiance();
}

AmbientLight.prototype = Object.create(Entity.prototype, {
    color: {
        get: function() { return this._color; },
        set: function(value)
        {
            this._color = isNaN(value) ? value : new Color(value);
            this._updateScaledIrradiance();
        }
    },

    intensity: {
        get: function() { return this._intensity; },
        set: function(value)
        {
            this._intensity = value;
            this._updateScaledIrradiance();
        },
    }
});

/**
 * @ignore
 */
AmbientLight.prototype.acceptVisitor = function (visitor)
{
    Entity.prototype.acceptVisitor.call(this, visitor);
    visitor.visitAmbientLight(this);
};

/**
 * @ignore
 */
AmbientLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

/**
 * @ignore
 */
AmbientLight.prototype._updateScaledIrradiance = function()
{
    // do not scale by 1/PI. It feels weird to control.
    if (META.OPTIONS.useGammaCorrection)
        this._color.gammaToLinear(this._scaledIrradiance);
    else
        this._scaledIrradiance.copyFrom(this._color);

    this._scaledIrradiance.r *= this._intensity;
    this._scaledIrradiance.g *= this._intensity;
    this._scaledIrradiance.b *= this._intensity;
};

/**
 * @classdesc
 * Renderer performs the actual rendering of a {@linkcode Scene} as viewed by a {@linkcode Camera} to the screen.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Renderer()
{
    this._width = 0;
    this._height = 0;

    this._gammaApplied = false;

    this._copyTextureShader = new CopyChannelsShader("xyzw", true);
    this._applyGamma = new ApplyGammaShader();

    this._camera = null;
    this._scene = null;
    this._depthBuffer = this._createDepthBuffer();
    this._hdrBack = new Renderer.HDRBuffers(this._depthBuffer);
    this._hdrFront = new Renderer.HDRBuffers(this._depthBuffer);
    this._renderCollector = new RenderCollector();
    this._gbuffer = new GBuffer(this._depthBuffer);
    this._backgroundColor = Color.BLACK.clone();
    //this._previousViewProjection = new Matrix4x4();
    this._debugMode = Renderer.DebugMode.NONE;
    this._renderAmbientShader = new DeferredAmbientShader();
    this._ssaoTexture = null;
}

/**
 * A collection of debug render modes to inspect some steps in the render pipeline.
 * @enum
 */
Renderer.DebugMode = {
    NONE: 0,
    SSAO: 1,
    GBUFFER_ALBEDO: 2,
    // TODO: Put back normal, depth, roughness, metallicness, normalSpecular back in
    GBUFFER_NORMAL_DEPTH: 3,
    GBUFFER_SPECULAR: 4,
    LIGHT_ACCUMULATION: 5
};

/**
 * @ignore
 */
Renderer.HDRBuffers = function(depthBuffer)
{
    this.texture = new Texture2D();
    this.texture.filter = TextureFilter.BILINEAR_NOMIP;
    this.texture.wrapMode = TextureWrapMode.CLAMP;
    this.fbo = new FrameBuffer(this.texture);
    this.fboDepth = new FrameBuffer(this.texture, depthBuffer);
};

Renderer.HDRBuffers.prototype =
{
    resize: function(width, height)
    {
        this.texture.initEmpty(width, height, TextureFormat.RGBA, capabilities.HDR_FORMAT);
        this.fbo.init();
        this.fboDepth.init();
    }
};

Renderer.prototype =
{
    /**
     * One of {Renderer.DebugMode}
     */
    get debugMode()
    {
        return this._debugMode;
    },

    set debugMode(value)
    {
        this._debugMode = value;
    },

    /**
     * The background {@linkcode Color}.
     */
    get backgroundColor()
    {
        return this._backgroundColor;
    },

    set backgroundColor(value)
    {
        if (value instanceof Color)
            this._backgroundColor.copyFrom(value);
        else
            this._backgroundColor.set(value);
    },

    /**
     * The Camera currently being used for rendering.
     */
    get camera()
    {
        return this._camera;
    },

    /**
     * Renders the scene through a camera.
     * It's not recommended changing render targets if they have different sizes (so splitscreen should be fine). Otherwise, use different renderer instances.
     * @param camera The {@linkcode Camera} from which to view the scene.
     * @param scene The {@linkcode Scene} to render.
     * @param dt The milliseconds passed since last frame.
     * @param [renderTarget] An optional {@linkcode FrameBuffer} object to render to.
     */
    render: function (camera, scene, dt, renderTarget)
    {
        this._gammaApplied = _HX_.GAMMA_CORRECT_LIGHTS;
        this._camera = camera;
        this._scene = scene;

        this._updateSize(renderTarget);

        camera._setRenderTargetResolution(this._width, this._height);
        this._renderCollector.collect(camera, scene);

        this._ambientColor = this._renderCollector._ambientColor;

        this._renderShadowCasters();

        GL.setClearColor(Color.BLACK);

        GL.setDepthMask(true);
        GL.setColorMask(true);

        this._renderGBuffer();
        this._renderAO();

        this._renderDeferredLighting();


        if (this._renderCollector.needsForwardPath ||
            this._debugMode !== Renderer.DebugMode.LIGHT_ACCUMULATION) {
            GL.setRenderTarget(this._hdrFront.fboDepth);
            GL.setClearColor(this._backgroundColor);
            GL.clear();

            RenderUtils.renderPass(this, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_FIXED));
            // render applied gbuffer too:
            RenderUtils.renderPass(this, MaterialPass.BASE_PASS, this._renderCollector.getOpaqueRenderList(RenderPath.DEFERRED));

            this._renderForwardDynamicLit();

            // THIS IS EXTREMELY INEFFICIENT ON SOME (TILED HIERARCHY) PLATFORMS
            if (this._renderCollector.needsBackbuffer)
                this._copyToBackBuffer();

            this._renderForwardTransparent();

            this._swapHDRFrontAndBack();
            this._renderEffects(dt);

        }

        GL.setColorMask(true);

        this._renderToScreen(renderTarget);

        GL.setBlendState();
        GL.setDepthMask(true);

        // for the future, if we ever need back-projection
        //this._previousViewProjection.copyFrom(this._camera.viewProjectionMatrix);
    },

    /**
     * @ignore
     * @private
     */
    _renderForwardDynamicLit: function()
    {
        var list = this._renderCollector.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC);
        if (list.length === 0) return;

        RenderUtils.renderPass(this, MaterialPass.BASE_PASS, list);

        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        for (var i = 0; i < numLights; ++i) {
            var light = lights[i];

            // I don't like type checking, but lighting support is such a core thing...
            // maybe we can work in a more plug-in like light system
            if (light instanceof LightProbe) {
                RenderUtils.renderPass(this, MaterialPass.LIGHT_PROBE_PASS, list, light);
            }
            else if (light instanceof DirectionalLight) {
                // if non-global, do intersection tests
                var passType = light.castShadows? MaterialPass.DIR_LIGHT_SHADOW_PASS : MaterialPass.DIR_LIGHT_PASS;

                // PASS IN LIGHT AS DATA, so the material can update it
                RenderUtils.renderPass(this, passType, list, light);
            }
            else if (light instanceof PointLight) {
                // cannot just use renderPass, need to do intersection tests
                var passType = light.castShadows? MaterialPass.POINT_LIGHT_SHADOW_PASS : MaterialPass.POINT_LIGHT_PASS;
                this._renderLightPassIfIntersects(light, passType, list);
            }
            else if (light instanceof SpotLight) {
                var passType = light.castShadows? MaterialPass.SPOT_LIGHT_SHADOW_PASS : MaterialPass.SPOT_LIGHT_PASS;
                this._renderLightPassIfIntersects(light, passType, list);
            }
        }
    },

    _renderForwardTransparent: function()
    {
        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        var list = this._renderCollector.getTransparentRenderList();

        // transparents need to be rendered one-by-one, not light by light
        var numItems = list.length;
        for (var r = 0; r < numItems; ++r) {

            var renderItem = list[r];

            this._renderSingleItem(MaterialPass.BASE_PASS, renderItem);

            var material = renderItem.material;

            // these won't have the correct pass
            if (material._renderPath !== RenderPath.FORWARD_DYNAMIC) continue;

            for (var i = 0; i < numLights; ++i) {
                var light = lights[i];

                // I don't like type checking, but lighting support is such a core thing...
                // maybe we can work in a more plug-in like light system
                if (light instanceof LightProbe) {
                    this._renderSingleItem(MaterialPass.LIGHT_PROBE_PASS, renderItem, light);
                }
                else if (light instanceof DirectionalLight) {
                    // if non-global, do intersection tests
                    var passType = light.castShadows? MaterialPass.DIR_LIGHT_SHADOW_PASS : MaterialPass.DIR_LIGHT_PASS;
                    this._renderSingleItem(passType, renderItem, light);
                }
                else if (light instanceof PointLight) {
                    // cannot just use renderPass, need to do intersection tests
                    this._renderLightPassIfIntersects(light, MaterialPass.POINT_LIGHT_PASS, list);
                }
                else if (light instanceof SpotLight) {
                    // cannot just use renderPass, need to do intersection tests
                    this._renderLightPassIfIntersects(light, MaterialPass.SPOT_LIGHT_PASS, list);
                }
            }
        }

        GL.setBlendState();
    },

    /**
     * @ignore
     * @private
     */
    _renderLightPassIfIntersects: function(light, passType, renderList)
    {
        var lightBound = light.worldBounds;
        var len = renderList.length;
        for (var r = 0; r < len; ++r) {
            var renderItem = renderList[r];
            var material = renderItem.material;
            var pass = material.getPass(passType);
            if (!pass) continue;

            if (lightBound.intersectsBound(renderItem.worldBounds))
                this._renderSingleItem(passType, renderItem, light);
        }
    },

    _renderSingleItem: function(passType, renderItem, light)
    {
        var pass = renderItem.material.getPass(passType);
        if (!pass) return;
        var meshInstance = renderItem.meshInstance;
        pass.updatePassRenderState(renderItem.camera, this, light);
        pass.updateInstanceRenderState(renderItem.camera, renderItem, light);
        meshInstance.updateRenderState(passType);
        var mesh = meshInstance._mesh;
        GL.drawElements(pass._elementType, mesh._numIndices, 0, mesh._indexType);
    },

    /**
     * @ignore
     * @private
     */
    _renderGBuffer: function(list)
    {
        var rc = this._renderCollector;
        var deferred = rc.getOpaqueRenderList(RenderPath.DEFERRED);
        var dynamic = rc.getOpaqueRenderList(RenderPath.FORWARD_DYNAMIC);
        var fixed = rc.getOpaqueRenderList(RenderPath.FORWARD_FIXED);

        if (deferred.length > 0) {
            if (capabilities.GBUFFER_MRT) {
                GL.setRenderTarget(this._gbuffer.mrt);
                // this is just so the linear depth value will be correct
                GL.setClearColor(Color.BLUE);
                GL.clear();

                RenderUtils.renderPass(this, MaterialPass.GBUFFER_PASS, deferred);

                // need to render all to gbuffer (can't switch fbos without clear on mobile)
                if (rc.needsNormalDepth) {
                    RenderUtils.renderPass(this, MaterialPass.GBUFFER_PASS, dynamic);
                    RenderUtils.renderPass(this, MaterialPass.GBUFFER_PASS, fixed);
                }
            }
            else {
                this._renderGBufferPlane(deferred, GBuffer.ALBEDO, MaterialPass.GBUFFER_ALBEDO_PASS, Color.BLACK);
                this._renderGBufferPlane(deferred, GBuffer.SPECULAR, MaterialPass.GBUFFER_SPECULAR_PASS, Color.BLACK);

                GL.setRenderTarget(this._gbuffer.fbos[GBuffer.NORMAL_DEPTH]);
                GL.setClearColor(Color.BLUE);
                GL.clear();
                RenderUtils.renderPass(this, MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, deferred);

                // need to render all to normal depth
                if (rc.needsNormalDepth) {
                    RenderUtils.renderPass(this, MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, dynamic);
                    RenderUtils.renderPass(this, MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, fixed);
                }

            }
            GL.setClearColor(Color.BLACK);
        }
        else if (rc.needsNormalDepth) {
            GL.setRenderTarget(this._gbuffer.fbos[GBuffer.NORMAL_DEPTH]);
            GL.setClearColor(Color.BLUE);
            GL.clear();
            RenderUtils.renderPass(this, MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, deferred);
            RenderUtils.renderPass(this, MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, dynamic);
            RenderUtils.renderPass(this, MaterialPass.GBUFFER_NORMAL_DEPTH_PASS, fixed);
            GL.setClearColor(Color.BLACK);
        }
    },

    /**
     * @ignore
     * @private
     */
    _renderGBufferPlane: function(list, plane, passType, clearColor)
    {
        GL.setRenderTarget(this._gbuffer.fbos[plane]);
        // furthest depth and alpha must be 1, the rest 0
        GL.setClearColor(clearColor);
        GL.clear();
        RenderUtils.renderPass(this, passType, list);
    },

    /**
     * @ignore
     * @private
     */
    _renderDeferredLighting: function()
    {
        if (this._renderCollector.getOpaqueRenderList(RenderPath.DEFERRED).length === 0)
            return;

        var lights = this._renderCollector.getLights();
        var numLights = lights.length;

        // for some reason, this doesn't get cleared?
        GL.setRenderTarget(this._hdrFront.fbo);
        GL.clear();
        GL.setBlendState(BlendState.ADD);
        GL.setDepthTest(Comparison.DISABLED);

        var ambient =  this._ambientColor;
        if (ambient.r !== 0 || ambient.g !== 0 || ambient.b !== 0) {
            this._renderAmbientShader.execute(this, ambient);
        }

        for (var i = 0; i < numLights; ++i) {
            lights[i].renderDeferredLighting(this);
        }

        this._swapHDRFrontAndBack();
        GL.setBlendState();
    },

    /**
     * @ignore
     * @private
     */
    _renderAO: function()
    {
        var ssao = META.OPTIONS.ambientOcclusion;
        if (ssao) {
            this._ssaoTexture = ssao.getAOTexture();
            ssao.render(this, 0);
        }
    },

    /**
     * @ignore
     * @private
     */
    _renderShadowCasters: function ()
    {
        var casters = this._renderCollector._shadowCasters;
        var len = casters.length;

        for (var i = 0; i < len; ++i)
            casters[i].render(this._camera, this._scene);
    },

    /**
     * @ignore
     * @private
     */
    _renderEffect: function (effect, dt)
    {
        this._gammaApplied = this._gammaApplied || effect._outputsGamma;
        effect.render(this, dt);
    },

    /**
     * @ignore
     * @private
     */
    _renderToScreen: function (renderTarget)
    {
        GL.setRenderTarget(renderTarget);
        GL.clear();

        if (this._debugMode) {
            var tex;
            switch (this._debugMode) {
                case Renderer.DebugMode.GBUFFER_ALBEDO:
                    tex = this._gbuffer.textures[0];
                    break;
                case Renderer.DebugMode.GBUFFER_NORMAL_DEPTH:
                    tex = this._gbuffer.textures[1];
                    break;
                case Renderer.DebugMode.GBUFFER_SPECULAR:
                    tex = this._gbuffer.textures[2];
                    break;
                case Renderer.DebugMode.SSAO:
                    tex = this._ssaoTexture;
                    break;
                case Renderer.DebugMode.LIGHT_ACCUMULATION:
                    tex = this._hdrBack.texture;
                    break;
                default:
                    // nothing
            }
            this._copyTextureShader.execute(RectMesh.DEFAULT, tex);
            return;
        }

        if (this._gammaApplied)
            this._copyTextureShader.execute(RectMesh.DEFAULT, this._hdrBack.texture);
        else
            this._applyGamma.execute(RectMesh.DEFAULT, this._hdrBack.texture);
    },

    /**
     * @ignore
     * @private
     */
    _renderEffects: function (dt)
    {
        var effects = this._renderCollector._effects;
        if (!effects) return;

        var len = effects.length;

        for (var i = 0; i < len; ++i) {
            var effect = effects[i];
            if (effect.isSupported()) {
                this._renderEffect(effect, dt);
                this._swapHDRFrontAndBack();
            }
        }
    },

    /**
     * @ignore
     * @private
     */
    _updateSize: function (renderTarget)
    {
        var width, height;
        if (renderTarget) {
            width = renderTarget.width;
            height = renderTarget.height;
        }
        else {
            width = META.TARGET_CANVAS.width;
            height = META.TARGET_CANVAS.height;
        }

        if (this._width !== width || this._height !== height) {
            this._width = width;
            this._height = height;
            this._depthBuffer.init(this._width, this._height, true);
            this._hdrBack.resize(this._width, this._height);
            this._hdrFront.resize(this._width, this._height);
            this._gbuffer.resize(this._width, this._height);
        }
    },

    /**
     * @ignore
     */
    _swapHDRFrontAndBack: function()
    {
        var tmp = this._hdrBack;
        this._hdrBack = this._hdrFront;
        this._hdrFront = tmp;
    },

    /**
     * @ignore
     * @private
     */
    _createDepthBuffer: function()
    {
        /*if (HX.EXT_DEPTH_TEXTURE) {
            this._depthBuffer = new HX.Texture2D();
            this._depthBuffer.filter = HX.TextureFilter.BILINEAR_NOMIP;
            this._depthBuffer.wrapMode = HX.TextureWrapMode.CLAMP;
        }
        else {*/
            return new WriteOnlyDepthBuffer();
    },

    /**
     * @ignore
     * @private
     */
    _copyToBackBuffer: function()
    {
        GL.setRenderTarget(this._hdrBack.fbo);
        GL.clear();
        this._copyTextureShader.execute(RectMesh.DEFAULT, this._hdrFront.texture);
        GL.setRenderTarget(this._hdrFront.fboDepth);
        // DO NOT CLEAR. This can be very slow on tiled gpu architectures such as PowerVR
    }
};

/**
 * @classdesc
 * DynamicLightProbe is a {@linkcode LightProbe} that is rendered from the scene dynamically.
 *
 * @constructor
 *
 * @extends LightProbe
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DynamicLightProbe(textureSize, textureDataType, near, far)
{
    var diffuse = new TextureCube();
    var specular = new TextureCube();

    textureDataType = textureDataType || DataType.UNSIGNED_BYTE;

    diffuse.initEmpty(4, null, textureDataType);
    specular.initEmpty(textureSize, null, textureDataType);

    near = near || .1;
    far = far || 1000.0;

    LightProbe.call(this, diffuse, specular);
    this._cameras = [];
    this._specularFBOs = [];
    this._diffuseFBOs = [];

    var depthBuffer = new WriteOnlyDepthBuffer();
    depthBuffer.init(textureSize, textureSize, false);

    var rotations = [];
    for (var i = 0; i < 6; ++i) {
        rotations[i] = new Quaternion();
    }

    rotations[0].fromAxisAngle(Float4.Y_AXIS, Math.PI * .5);
    rotations[1].fromAxisAngle(Float4.Y_AXIS, -Math.PI * .5);
    rotations[2].fromAxisAngle(Float4.X_AXIS, -Math.PI * .5);
    rotations[3].fromAxisAngle(Float4.X_AXIS, Math.PI * .5);
    rotations[4].fromAxisAngle(Float4.Y_AXIS, 0);
    rotations[5].fromAxisAngle(Float4.Y_AXIS, Math.PI);

    this._diffuseScene = new Scene();
    this._diffuseScene.skybox = new Skybox(specular);

    var cubeFaces = [ CubeFace.POSITIVE_X, CubeFace.NEGATIVE_X, CubeFace.POSITIVE_Y, CubeFace.NEGATIVE_Y, CubeFace.POSITIVE_Z, CubeFace.NEGATIVE_Z ];
    for (var i = 0; i < 6; ++i) {
        var camera = new PerspectiveCamera();
        camera.nearDistance = near;
        camera.farDistance = far;
        camera.verticalFOV = Math.PI * .5;
        camera.rotation.copyFrom(rotations[i]);
        camera.scale.set(1, -1, 1);
        this._cameras.push(camera);

        var fbo = new FrameBuffer(specular, depthBuffer, cubeFaces[i]);
        fbo.init();
        this._specularFBOs.push(fbo);

        fbo = new FrameBuffer(diffuse, null, cubeFaces[i]);
        fbo.init();
        this._diffuseFBOs.push(fbo);
    }

    this._renderer = new Renderer();
}

DynamicLightProbe.prototype = Object.create(LightProbe.prototype);

/**
 * Triggers an update of the light probe.
 */
DynamicLightProbe.prototype.render = function()
{
    var specularTexture = this._specularTexture;
    var diffuseTexture = this._diffuseTexture;

    this._specularTexture = DEFAULTS.DARK_CUBE_TEXTURE;
    this._diffuseTexture = DEFAULTS.DARK_CUBE_TEXTURE;

    var pos = this.worldMatrix.getColumn(3);

    GL.setInvertCulling(true);

    for (var i = 0; i < 6; ++i) {
        this._cameras[i].position.copyFrom(pos);
        this._renderer.render(this._cameras[i], this._scene, 0, this._specularFBOs[i]);
    }

    specularTexture.generateMipmap();

    for (i = 0; i < 6; ++i)
        this._renderer.render(this._cameras[i], this._diffuseScene, 0, this._diffuseFBOs[i]);

    diffuseTexture.generateMipmap();

    GL.setInvertCulling(false);

    this._diffuseTexture = diffuseTexture;
    this._specularTexture = specularTexture;
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ESMBlurShader(blurRadius)
{
    Shader.call(this);
    var gl = GL.gl;

    var defines = {
        RADIUS: blurRadius,
        RCP_NUM_SAMPLES: "float(" + (1.0 / (1.0 + 2.0 * blurRadius)) + ")"
    };

    var vertex = ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment = ShaderLibrary.get("esm_blur_fragment.glsl", defines);

    this.init(vertex, fragment);

    this._textureLocation = gl.getUniformLocation(this._program, "source");
    this._directionLocation = gl.getUniformLocation(this._program, "direction");
    this._positionAttributeLocation = gl.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(this._program, "hx_texCoord");

    gl.useProgram(this._program);
    gl.uniform1i(this._textureLocation, 0);
}

ESMBlurShader.prototype = Object.create(Shader.prototype);

ESMBlurShader.prototype.execute = function(rect, texture, dirX, dirY)
{
    var gl = GL.gl;

    GL.setDepthTest(Comparison.DISABLED);
    GL.setCullMode(CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updatePassRenderState();

    texture.bind(0);

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    gl.uniform2f(this._directionLocation, dirX, dirY);

    GL.drawElements(ElementType.TRIANGLES, 6, 0);
};

/**
 * @classdesc
 * ExponentialDirectionalShadowFilter is a shadow filter for directional lights that provides exponential soft shadow
 * mapping. The implementation is highly experimental at this point.
 *
 * @property {number} blurRadius The blur radius for the soft shadows.
 * @property {number} darkeningFactor A darkening factor of the shadows. Counters some artifacts of the technique.
 * @property {number} expScaleFactor The exponential scale factor. Probably you shouldn't touch this.
 *
 * @see {@linkcode InitOptions#directionalShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function ExponentialDirectionalShadowFilter()
{
    ShadowFilter.call(this);
    this._expScaleFactor = 80;
    this._blurRadius = 1;
    this._darkeningFactor = .35;
}


ExponentialDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype,
    {
        blurRadius: {
            get: function()
            {
                return this._blurRadius;
            },

            set: function(value)
            {
                this._blurRadius = value;
                this._invalidateBlurShader();
            }
        },

        darkeningFactor: {
            get: function()
            {
                return this._darkeningFactor;
            },

            set: function(value)
            {
                this._darkeningFactor = value;
            }
        },

        expScaleFactor: {
            get: function()
            {
                return this._expScaleFactor;
            },

            set: function(value)
            {
                this._expScaleFactor = value;
            }
        }
    });

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype.getShadowMapFormat = function()
{
    return TextureFormat.RGB;
};

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype.getShadowMapDataType = function()
{
    return DataType.FLOAT;
};

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return ShaderLibrary.get("dir_shadow_esm.glsl", defines);
};

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype._getDefines = function()
{
    return {
        HX_ESM_CONSTANT: "float(" + this._expScaleFactor + ")",
        HX_ESM_DARKENING: "float(" + this._darkeningFactor + ")"
    };
};

/**
 * @ignore
 */
ExponentialDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new ESMBlurShader(this._blurRadius);
};

/**
 * @classdesc
 * PCFDirectionalShadowFilter is a shadow filter for directional lights that provides percentage closer soft shadow
 * mapping. However, WebGL does not support shadow test interpolations, so the results aren't as great as its GL/DX
 * counterpart.
 *
 * @property {number} softness The softness of the shadows in shadow map space.
 * @property {number} numShadowSamples The amount of shadow samples to take.
 * @property {boolean} dither Whether or not the samples should be randomly rotated per screen pixel. Introduces noise but can improve the look.
 *
 * @see {@linkcode InitOptions#directionalShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PCFDirectionalShadowFilter()
{
    ShadowFilter.call(this);
    this._softness = .001;
    this._numShadowSamples = 6;
    this._dither = false;
}

PCFDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype,
    {
        softness: {
            get: function()
            {
                return this._softness;
            },

            set: function(value)
            {
                if (this._softness !== value) {
                    this._softness = value;
                }
            }
        },

        numShadowSamples: {
            get: function()
            {
                return this._numShadowSamples;
            },

            set: function(value)
            {
                value = MathX.clamp(value, 1, 32);
                if (this._numShadowSamples !== value) {
                    this._numShadowSamples = value;
                }
            }
        },

        dither: {
            get: function()
            {
                return this._dither;
            },

            set: function(value)
            {
                if (this._dither !== value) {
                    this._dither = value;
                }
            }
        }
    }
);

/**
 * @ignore
 */
PCFDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = {
        HX_DIR_PCF_NUM_SHADOW_SAMPLES: this._numShadowSamples,
        HX_DIR_PCF_RCP_NUM_SHADOW_SAMPLES: "float(" + ( 1.0 / this._numShadowSamples ) + ")",
        HX_DIR_PCF_SOFTNESS: this._softness
    };

    if (this._dither)
        defines.HX_DIR_PCF_DITHER_SHADOWS = 1;

    return ShaderLibrary.get("dir_shadow_pcf.glsl", defines);
};

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VSMBlurShader(blurRadius)
{
    var gl = GL.gl;
    Shader.call(this);

    var defines = {
        RADIUS: blurRadius,
        RCP_NUM_SAMPLES: "float(" + (1.0 / (1.0 + 2.0 * blurRadius)) + ")"
    };

    var vertex = ShaderLibrary.get("copy_vertex.glsl", defines);
    var fragment = ShaderLibrary.get("vsm_blur_fragment.glsl", defines);

    this.init(vertex, fragment);

    this._textureLocation = gl.getUniformLocation(this._program, "source");
    this._directionLocation = gl.getUniformLocation(this._program, "direction");
    this._positionAttributeLocation = gl.getAttribLocation(this._program, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(this._program, "hx_texCoord");

    gl.useProgram(this._program);
    gl.uniform1i(this._textureLocation, 0);
}

VSMBlurShader.prototype = Object.create(Shader.prototype);

VSMBlurShader.prototype.execute = function (rect, texture, dirX, dirY)
{
    var gl = GL.gl;
    GL.setDepthTest(Comparison.DISABLED);
    GL.setCullMode(CullMode.NONE);

    rect._vertexBuffers[0].bind();
    rect._indexBuffer.bind();

    this.updatePassRenderState();

    texture.bind(0);

    gl.vertexAttribPointer(this._positionAttributeLocation, 2, DataType.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, DataType.FLOAT, false, 16, 8);

    GL.enableAttributes(2);

    gl.uniform2f(this._directionLocation, dirX, dirY);

    GL.drawElements(gl.TRIANGLES, 6, 0);
};

/**
 * @classdesc
 * VarianceDirectionalShadowFilter is a shadow filter for directional lights that provides variance soft shadow mapping.
 * The implementation is highly experimental at this point.
 *
 * @property {Number} blurRadius The blur radius for the soft shadows.
 * @property {Number} lightBleedReduction A value to counter light bleeding, an artifact of the technique.
 * @property {Number} minVariance The minimum amount of variance.
 * @property {Boolean} useHalfFloat Uses half float textures for the shadow map, if available. This may result in
 * performance improvements, but also precision artifacts. Defaults to true.
 *
 * @see {@linkcode InitOptions#directionalShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VarianceDirectionalShadowFilter()
{
    ShadowFilter.call(this);
    this._blurRadius = 2;
    this._lightBleedReduction = .35;
    this._minVariance = .001;
    this._useHalfFloat = true;
}

VarianceDirectionalShadowFilter.prototype = Object.create(ShadowFilter.prototype,
    {
        minVariance: {
            get: function()
            {
                return this._minVariance;
            },

            set: function(value)
            {
                this._minVariance = value;
            }
        },

        blurRadius: {
            get: function()
            {
                return this._blurRadius;
            },

            set: function(value)
            {
                this._blurRadius = value;
                this._invalidateBlurShader();
            }
        },

        lightBleedReduction: {
            get: function()
            {
                return this._lightBleedReduction;
            },

            set: function(value)
            {
                this._lightBleedReduction = value;
            }
        },

        useHalfFloat: {
            get: function()
            {
                return this._useHalfFloat;
            },

            set: function(value)
            {
                this._useHalfFloat = value;
            }
        }
    });

/**
 * @ignore
 */
VarianceDirectionalShadowFilter.prototype.getGLSL = function()
{
    var defines = this._getDefines();
    return ShaderLibrary.get("dir_shadow_vsm.glsl", defines);
};

VarianceDirectionalShadowFilter.prototype.getShadowMapFormat = function()
{
    return capabilities.HALF_FLOAT_FBO || capabilities.FLOAT_FBO? TextureFormat.RGB : TextureFormat.RGBA;
};

VarianceDirectionalShadowFilter.prototype.getShadowMapDataType = function()
{
    return capabilities.HALF_FLOAT_FBO && this._useHalfFloat? DataType.HALF_FLOAT :
            capabilities.FLOAT_FBO? DataType.FLOAT : DataType.UNSIGNED_BYTE;
};

/**
 * @ignore
 */
VarianceDirectionalShadowFilter.prototype._createBlurShader = function()
{
    return new VSMBlurShader(this._blurRadius);
};

/**
 * @ignore
 */
VarianceDirectionalShadowFilter.prototype._getDefines = function()
{
    var range = 1.0 - this._lightBleedReduction;
    return {
        HX_DIR_VSM_MIN_VARIANCE: "float(" + this._minVariance + ")",
        HX_DIR_VSM_LIGHT_BLEED_REDUCTION: "float(" + this._lightBleedReduction + ")",
        HX_DIR_VSM_RCP_LIGHT_BLEED_REDUCTION_RANGE: "float(" + (1.0 / range) + ")"
    };
};

/**
 * @classdesc
 * PCFSpotShadowFilter is a shadow filter for spot lights that provides percentage closer soft shadow mapping. However,
 * WebGL does not support shadow test interpolations, so the results aren't as great as its GL/DX counterpart.
 *
 * @property {number} softness The softness of the shadows in shadow map space.
 * @property {number} numShadowSamples The amount of shadow samples to take.
 * @property {boolean} dither Whether or not the samples should be randomly rotated per screen pixel. Introduces noise but can improve the look.
 *
 * @see {@linkcode InitOptions#spotShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PCFSpotShadowFilter()
{
    ShadowFilter.call(this);
    this._softness = .003;
    this._numShadowSamples = 6;
    this._dither = false;
}

PCFSpotShadowFilter.prototype = Object.create(ShadowFilter.prototype,
    {
        softness: {
            get: function()
            {
                return this._softness;
            },

            set: function(value)
            {
                if (this._softness !== value) {
                    this._softness = value;
                }
            }
        },

        numShadowSamples: {
            get: function()
            {
                return this._numShadowSamples;
            },

            set: function(value)
            {
                value = MathX.clamp(value, 1, 32);
                if (this._numShadowSamples !== value) {
                    this._numShadowSamples = value;
                }
            }
        },

        dither: {
            get: function()
            {
                return this._dither;
            },

            set: function(value)
            {
                if (this._dither !== value) {
                    this._dither = value;
                }
            }
        }
    }
);

/**
 * @ignore
 */
PCFSpotShadowFilter.prototype.getGLSL = function()
{
    var defines = {
        HX_SPOT_PCF_NUM_SHADOW_SAMPLES: this._numShadowSamples,
        HX_SPOT_PCF_RCP_NUM_SHADOW_SAMPLES: "float(" + ( 1.0 / this._numShadowSamples ) + ")",
        HX_SPOT_PCF_SOFTNESS: this._softness
    };

    if (this._dither)
        defines.HX_SPOT_PCF_DITHER_SHADOWS = 1;

    return ShaderLibrary.get("spot_shadow_pcf.glsl", defines);
};

/**
 * @classdesc
 * PCFPointShadowFilter is a shadow filter for point lights that provides percentage closer soft shadow mapping.
 * However, WebGL does not support shadow test interpolations, so the results aren't as great as its GL/DX counterpart.
 *
 * @property {number} softness The softness of the shadows in shadow map space.
 * @property {number} numShadowSamples The amount of shadow samples to take.
 * @property {boolean} dither Whether or not the samples should be randomly rotated per screen pixel. Introduces noise but can improve the look.
 *
 * @see {@linkcode InitOptions#pointShadowFilter}
 *
 * @constructor
 *
 * @extends ShadowFilter
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PCFPointShadowFilter()
{
    ShadowFilter.call(this);
    this._softness = .005;
    this._numShadowSamples = 6;
    this._dither = false;
}

PCFPointShadowFilter.prototype = Object.create(ShadowFilter.prototype,
    {
        softness: {
            get: function()
            {
                return this._softness;
            },

            set: function(value)
            {
                if (this._softness !== value) {
                    this._softness = value;
                }
            }
        },

        numShadowSamples: {
            get: function()
            {
                return this._numShadowSamples;
            },

            set: function(value)
            {
                value = MathX.clamp(value, 1, 32);
                if (this._numShadowSamples !== value) {
                    this._numShadowSamples = value;
                }
            }
        },

        dither: {
            get: function()
            {
                return this._dither;
            },

            set: function(value)
            {
                if (this._dither !== value) {
                    this._dither = value;
                }
            }
        }
    }
);

/**
 * @ignore
 */
PCFPointShadowFilter.prototype.getGLSL = function()
{
    var defines = {
        HX_POINT_PCF_NUM_SHADOW_SAMPLES: this._numShadowSamples,
        HX_POINT_PCF_RCP_NUM_SHADOW_SAMPLES: "float(" + ( 1.0 / this._numShadowSamples ) + ")",
        HX_POINT_PCF_SOFTNESS: this._softness
    };

    if (this._dither)
        defines.HX_POINT_PCF_DITHER_SHADOWS = 1;

    return ShaderLibrary.get("point_shadow_pcf.glsl", defines);
};

/**
 * MeshBatch is a util that creates a number copies of the same mesh with hx_instanceID being the instance number of the copy.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var MeshBatch =
    {
        create: function (sourceMesh, numInstances)
        {
            var len, i, j;
            var target = new Mesh();
            var sourceIndices = sourceMesh._indexData;

            target._vertexUsage = sourceMesh._vertexUsage;
            target._indexUsage = sourceMesh._indexUsage;

            var attribs = sourceMesh._vertexAttributes;
            var instanceStream = sourceMesh.numStreams;

            for (i = 0; i < attribs.length; ++i) {
                var attribute = attribs[i];
                target.addVertexAttribute(attribute.name, attribute.numComponents, attribute.streamIndex);
            }

            target.addVertexAttribute("hx_instanceID", 1, instanceStream);

            var targetIndices = [];
            var index = 0;
            var numVertices = sourceMesh.numVertices;

            len = sourceIndices.length;

            for (i = 0; i < numInstances; ++i) {
                for (j = 0; j < len; ++j) {
                    targetIndices[index++] = sourceIndices[j] + numVertices * i;
                }
            }

            target.setIndexData(targetIndices);

            for (i = 0; i < sourceMesh.numStreams; ++i) {
                var targetVertices = [];
                var sourceVertices = sourceMesh.getVertexData(i);

                len = sourceVertices.length;
                index = 0;

                // duplicate vertex data for each instance
                for (j = 0; j < numInstances; ++j) {
                    for (var k = 0; k < len; ++k) {
                        targetVertices[index++] = sourceVertices[k];
                    }
                }

                target.setVertexData(targetVertices, i);
            }

            var instanceData = [];
            index = 0;
            for (j = 0; j < numInstances; ++j) {
                for (i = 0; i < numVertices; ++i) {
                    instanceData[index++] = j;
                }
            }

            // something actually IS wrong with the instance data
            // drawing an explicit subselection of indices with constant instance index is correct
            // filling the entire array with 0 doesn't help, so it looks like the data is not set correctly
            target.setVertexData(instanceData, instanceStream);

            return target;
        }
    };

/**
 * @classdesc
 * CylinderPrimitive provides a primitive cylinder {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>radius: The radius of the cylinder</li>
 *     <li>height: The height of the cylinder</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 *     <li>alignment: The axis along which to orient the cylinder. One of {@linkcode CylinderPrimitive#ALIGN_X}, {@linkcode CylinderPrimitive#ALIGN_Y}, {@linkcode CylinderPrimitive#ALIGN_Z}</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function CylinderPrimitive(definition)
{
    Primitive.call(this, definition);
}

CylinderPrimitive.prototype = Object.create(Primitive.prototype);

/**
 * The alignment dictates which access should be parallel to the sides of the cylinder
 * @type {number}
 */
CylinderPrimitive.ALIGN_X = 1;
CylinderPrimitive.ALIGN_Y = 2;
CylinderPrimitive.ALIGN_Z = 3;

/**
 * @ignore
 */
CylinderPrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var alignment = definition.alignment || CylinderPrimitive.ALIGN_Y;
    var numSegmentsH = definition.numSegmentsH || 1;
    var numSegmentsW = definition.numSegmentsW || 16;
    var radius = definition.radius || 1;
    var height = definition.height || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var hi, ci;
    var cx, cy;
    var angle;

    // sides
    for (hi = 0; hi <= numSegmentsH; ++hi) {
        var h = (hi*rcpNumSegmentsH - .5)*height;
        for (ci = 0; ci <= numSegmentsW; ++ci) {
            angle = ci * rcpNumSegmentsW * Math.PI * 2;
            var nx = Math.sin(angle);
            var ny = Math.cos(angle);
            cx = nx * radius;
            cy = ny * radius;

            switch (alignment) {
                case CylinderPrimitive.ALIGN_X:
                    positions.push(-h, cx, -cy);
                    if (normals) normals.push(0, nx, -ny);
                    break;
                case CylinderPrimitive.ALIGN_Z:
                    positions.push(cx, cy, h);
                    if (normals) normals.push(nx, ny, 0);
                    break;
                default:
                    positions.push(cx, h, -cy);
                    if (normals) normals.push(nx, 0, -ny);
                    break;
            }

            if (uvs) uvs.push(1.0 - ci*rcpNumSegmentsW, hi*rcpNumSegmentsH);
        }
    }

    for (hi = 0; hi < numSegmentsH; ++hi) {
        for (ci = 0; ci < numSegmentsW; ++ci) {
            var w = numSegmentsW + 1;
            var base = ci + hi*w;

            indices.push(base, base + w + 1, base + w);
            indices.push(base, base + 1, base + w + 1);

            if (doubleSided) {
                indices.push(base, base + w, base + w + 1);
                indices.push(base, base + w + 1, base + 1);
            }
        }
    }


    // top & bottom
    var indexOffset = positions.length / 3;
    var halfH = height * .5;
    for (ci = 0; ci < numSegmentsW; ++ci) {
        angle = ci * rcpNumSegmentsW * Math.PI * 2;
        var u = Math.sin(angle);
        var v = Math.cos(angle);
        cx = u * radius;
        cy = v * radius;

        u = -u * .5 + .5;
        v = v * .5 + .5;

        switch (alignment) {
            case CylinderPrimitive.ALIGN_X:
                positions.push(halfH, cx, -cy);
                positions.push(-halfH, cx, -cy);

                if (normals) {
                    normals.push(1, 0, 0);
                    normals.push(-1, 0, 0);
                }

                if (uvs) {
                    uvs.push(v, 1.0 - u);
                    uvs.push(1.0 - v,  1.0 - u);
                }
                break;

            case CylinderPrimitive.ALIGN_Z:
                positions.push(cx, cy, -halfH);
                positions.push(cx, cy, halfH);

                if (normals) {
                    normals.push(0, 0, -1);
                    normals.push(0, 0, 1);
                }

                if (uvs) {
                    uvs.push(u, v);
                    uvs.push(1.0 - u, v);
                }
                break;
            default:
                positions.push(cx, -halfH, -cy);
                positions.push(cx, halfH, -cy);

                if (normals) {
                    normals.push(0, -1, 0);
                    normals.push(0, 1, 0);
                }

                if (uvs) {
                    uvs.push(u, v);
                    uvs.push(u, 1.0 - v);
                }
                break;
        }
    }

    for (ci = 1; ci < numSegmentsW - 1; ++ci) {
        var offset = ci << 1;
        indices.push(indexOffset, indexOffset + offset + 2, indexOffset + offset);
        indices.push(indexOffset + 1, indexOffset + offset + 1, indexOffset + offset + 3);
    }
};

/**
 * @classdesc
 * PlanePrimitive provides a primitive plane {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>width: The width of the plane</li>
 *     <li>height: The height of the plane</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 *     <li>alignment: The axes along which to orient the plane. One of {@linkcode PlanePrimitive#ALIGN_XZ}, {@linkcode PlanePrimitive#ALIGN_XY}, {@linkcode PlanePrimitive#ALIGN_YZ}</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function PlanePrimitive(definition)
{
    Primitive.call(this, definition);
}

PlanePrimitive.prototype = Object.create(Primitive.prototype);

PlanePrimitive.ALIGN_XZ = 1;
PlanePrimitive.ALIGN_XY = 2;
PlanePrimitive.ALIGN_YZ = 3;

PlanePrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var alignment = definition.alignment || PlanePrimitive.ALIGN_XZ;
    var numSegmentsW = definition.numSegmentsW || 1;
    var numSegmentsH = definition.numSegmentsH || 1;
    var width = definition.width || 1;
    var height = definition.height || 1;
    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;
    var indices = target.indices;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;
    var posX = 0, posY = 0, posZ = 0;
    var normalX = 0, normalY = 0, normalZ = 0;
    var uvU = 0, uvV = 0;

    if (alignment === PlanePrimitive.ALIGN_XY)
        normalZ = -1;
    else if (alignment === PlanePrimitive.ALIGN_XZ)
        normalY = 1;
    else
        normalX = 1;

    for (var yi = 0; yi <= numSegmentsH; ++yi) {
        var y = (yi*rcpNumSegmentsH - .5)*height;

        for (var xi = 0; xi <= numSegmentsW; ++xi) {
            var x = (xi*rcpNumSegmentsW - .5)*width;

            if (alignment === PlanePrimitive.ALIGN_XY) {
                posX = x;
                posY = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else if (alignment === PlanePrimitive.ALIGN_XZ) {
                posX = x;
                posZ = y;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }
            else {
                posY = y;
                posZ = x;
                uvU = 1.0 - xi*rcpNumSegmentsW;
                uvV = yi*rcpNumSegmentsH;
            }

            positions.push(posX, posY, posZ);

            if (normals)
                normals.push(normalX, normalY, normalZ);

            if (uvs)
                uvs.push(uvU, uvV);

            // add vertex with same position, but with inverted normal & tangent
            if (doubleSided) {
                positions.push(posX, posY, posZ);

                if (normals)
                    normals.push(-normalX, -normalY, -normalZ);

                if (uvs)
                    uvs.push(1.0 - uvU, uvV);
            }

            if (xi !== numSegmentsW && yi !== numSegmentsH) {
                var w = numSegmentsW + 1;
                var base = xi + yi*w;
                var mult = doubleSided ? 1 : 0;

                indices.push(base << mult, (base + w + 1) << mult, (base + w) << mult);
                indices.push(base << mult, (base + 1) << mult, (base + w + 1) << mult);

                if(doubleSided) {
                    indices.push(((base + w) << mult) + 1, ((base + w + 1) << mult) + 1, (base << mult) + 1);
                    indices.push(((base + w + 1) << mult) + 1, ((base + 1) << mult) + 1, (base << mult) + 1);
                }
            }
        }
    }
};

/**
 * @classdesc
 * TorusPrimitive provides a primitive cylinder {@linkcode Model}.
 *
 * @constructor
 * @param definition An object containing the following (optional) parameters:
 * <ul>
 *     <li>numSegmentsW: The amount of horizontal segments</li>
 *     <li>numSegmentsH: The amount of vertical segments </li>
 *     <li>radius: The radius of the torus</li>
 *     <li>tubeRadius: The radius of the torus's tube</li>
 *     <li>invert: Whether or not the faces should point inwards</li>
 *     <li>doubleSided: Whether or not the faces should point both ways</li>
 *     <li>alignment: The axes along which to orient the torus. One of {@linkcode TorusPrimitive#ALIGN_XZ}, {@linkcode TorusPrimitive#ALIGN_XY}, {@linkcode TorusPrimitive#ALIGN_YZ}</li>
 * </ul>
 *
 * @extends Primitive
 *
 * @author derschmale <http://www.derschmale.com>
 */
function TorusPrimitive(definition)
{
    Primitive.call(this, definition);
}

TorusPrimitive.prototype = Object.create(Primitive.prototype);

TorusPrimitive.ALIGN_XZ = 1;
TorusPrimitive.ALIGN_XY = 2;
TorusPrimitive.ALIGN_YZ = 3;

TorusPrimitive.prototype._generate = function(target, definition)
{
    definition = definition || {};
    var numSegmentsW = definition.numSegmentsW || 15;
    var numSegmentsH = definition.numSegmentsH || 20;
    var radius = definition.radius || .5;
    var tubeRadius = definition.tubeRadius || .1;
    var alignment = definition.alignment || TorusPrimitive.ALIGN_XZ;

    var doubleSided = definition.doubleSided === undefined? false : definition.doubleSided;

    var positions = target.positions;
    var uvs = target.uvs;
    var normals = target.normals;

    var rcpNumSegmentsW = 1/numSegmentsW;
    var rcpNumSegmentsH = 1/numSegmentsH;

    for (var poloidalSegment = 0; poloidalSegment <= numSegmentsH; ++poloidalSegment) {
        var ratioV = poloidalSegment * rcpNumSegmentsH;
        var theta = ratioV * Math.PI * 2.0;
        var px = Math.cos(theta);
        var py = Math.sin(theta);

        for (var toroidalSegment = 0; toroidalSegment <= numSegmentsW; ++toroidalSegment) {
            var ratioU = toroidalSegment * rcpNumSegmentsW;
            var phi = ratioU * Math.PI * 2.0;
            var tx = Math.cos(phi);
            var tz = Math.sin(phi);
            var rad = radius + px  * tubeRadius;

            switch(alignment) {
                case TorusPrimitive.ALIGN_XZ:
                    positions.push(tx * rad, py  * tubeRadius, tz * rad);

                    if (normals)
                        normals.push(tx * px, py, tz * px);

                    break;
                case TorusPrimitive.ALIGN_XY:
                    positions.push(-tx * rad, tz * rad, py  * tubeRadius);

                    if (normals)
                        normals.push(-tx * px, tz * px, py);
                    break;
                case TorusPrimitive.ALIGN_YZ:
                    positions.push(py  * tubeRadius, -tx * rad, tz * rad);

                    if (normals)
                        normals.push(py, -tx * px, tz * px);
                    break;

                default:
                    // nothing

            }

            if (uvs)
                uvs.push(ratioU, 1.0 - ratioV);
        }
    }

    var indices = target.indices;

    for (var polarSegment = 0; polarSegment < numSegmentsH; ++polarSegment) {
        for (var azimuthSegment = 0; azimuthSegment < numSegmentsW; ++azimuthSegment) {
            var w = numSegmentsW + 1;
            var base = azimuthSegment + polarSegment*w;

            indices.push(base, base + w + 1, base + w);
            indices.push(base, base + 1, base + w + 1);

            if (doubleSided) {
                indices.push(base, base + w, base + w + 1);
                indices.push(base, base + w + 1, base + 1);
            }
        }
    }
};

/**
 * @classdesc
 * View represents a renderable area on screen with the data it should render.
 *
 * @param scene The {@linkcode Scene} to render to this view.
 * @param camera The {@linkcode Camera} to use for this view.
 * @param xRatio The ratio (0 - 1) of the top-left corner of the view's horizontal position relative to the screen width.
 * @param yRatio The ratio (0 - 1) of the top-left corner of the view vertical position relative to the screen height.
 * @param widthRatio The ratio (0 - 1) of the top-left corner of the view's width relative to the screen width.
 * @param heightRatio The ratio (0 - 1) of the top-left corner of the view's height relative to the screen height.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function View(scene, camera, xRatio, yRatio, widthRatio, heightRatio)
{
    /**
     * The {@linkcode Scene} to render to this view.
     */
    this.scene = scene;

    /**
     * The {@linkcode Camera} to use for this view.
     */
    this.camera = camera;

    this._renderer = null;
    this._texture = null;
    this._fbo = null;

    /**
     * The ratio (0 - 1) of the top-left corner of the view's horizontal position relative to the screen width.
     */
    this.xRatio = xRatio || 0;

    /**
     * The ratio (0 - 1) of the top-left corner of the view's vertical position relative to the screen height.
     */
    this.yRatio = yRatio || 0;

    /**
     * The ratio (0 - 1) of the top-left corner of the view's width relative to the screen width.
     */
    this.widthRatio = widthRatio || 1;

    /**
     * The ratio (0 - 1) of the top-left corner of the view's height relative to the screen height.
     */
    this.heightRatio = heightRatio || 1;
}

/**
 * MultiRenderer is a renderer for multiple simultaneous viewports. Multiple scenes can be rendered, with multiple
 * cameras.
 *
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MultiRenderer()
{
    this._views = [];
}

MultiRenderer.prototype =
{
    /**
     * Adds a {@linkcode View} to be rendered.
     */
    addView: function (view)
    {
        view._renderer = new Renderer();
        view._texture = new Texture2D();
        view._texture.filter = TextureFilter.BILINEAR_NOMIP;
        view._texture.wrapMode = TextureWrapMode.CLAMP;
        view._fbo = new FrameBuffer(view._texture);
        this._views.push(view);
    },

    /**
     * Removes a {@linkcode View}.
     */
    removeView: function (view)
    {
        view._fbo = null;
        view._texture = null;
        view._renderer = null;
        var index = this._views.indexOf(view);
        this._views.splice(index, 1);
    },

    /**
     * Renders all views.
     * @param dt The milliseconds passed since last frame.
     * @param [renderTarget] An optional {@linkcode FrameBuffer} object to render to.
     */
    render: function (dt, renderTarget)
    {
        var screenWidth = META.TARGET_CANVAS.clientWidth;
        var screenHeight = META.TARGET_CANVAS.clientHeight;
        var numViews = this._views.length;
        for (var i = 0; i < numViews; ++i) {
            var view = this._views[i];
            var w = Math.floor(screenWidth * view.widthRatio);
            var h = Math.floor(screenHeight * view.heightRatio);

            if (view._texture.width !== w || view._texture.height !== h) {
                view._texture.initEmpty(w, h);
                view._fbo.init();
            }

            view._renderer.render(view.camera, view.scene, dt, view._fbo);
        }

        GL.setRenderTarget(renderTarget);
        GL.clear();

        var viewport = new Rect();

        for (i = 0; i < numViews; ++i) {
            view = this._views[i];
            viewport.x = Math.floor(view.xRatio * screenWidth);
            viewport.y = Math.floor((1.0 - view.yRatio - view.heightRatio) * screenHeight);
            viewport.width = view._texture.width;
            viewport.height = view._texture.height;
            GL.setViewport(viewport);
            DEFAULTS.COPY_SHADER.execute(RectMesh.DEFAULT, view._texture);
        }
    }
};

/**
 * @classdesc
 * StencilState defines the stencil mode the renderer should use.
 * @param reference The stencil reference value.
 * @param comparison The stencil comparison.
 * @param onStencilFail The operation to use when the stencil test fails.
 * @param onDepthFail The operation to use when the depth test fails.
 * @param onPass The operation to use when both tests succeed.
 * @param readMask The stencil read mask.
 * @param writeMask The stencil write mask.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function StencilState(reference, comparison, onStencilFail, onDepthFail, onPass, readMask, writeMask)
{
    this.enabled = true;
    this.reference = reference || 0;
    this.comparison = comparison || Comparison.ALWAYS;
    this.onStencilFail = onStencilFail || StencilOp.KEEP;
    this.onDepthFail = onDepthFail || StencilOp.KEEP;
    this.onPass = onPass || StencilOp.KEEP;
    this.readMask = readMask === undefined || readMask === null? 0xffffffff : readMask;
    this.writeMask = writeMask === undefined || writeMask === null? 0xffffffff: writeMask;
}

/**
 * AsyncTaskQueue allows queueing a bunch of functions which are executed "whenever", in order.
 *
 * TODO: Allow dynamically adding tasks while running
 *  -> should we have a AsyncTaskQueue.runChildQueue() which pushed that into a this._childQueues array.
 *  _executeImpl would then first process these.
 *  The queue itself can just be passed along the regular queued function parameters if the child methods need access to
 *  add child queues hierarchically.
 *
 * @classdesc
 *
 * @ignore
 *
 * @constructor
 */
function AsyncTaskQueue()
{
    this.onComplete = new Signal();
    this.onProgress = new Signal();
    this._queue = [];
    this._childQueues = [];
    this._currentIndex = 0;
    this._isRunning = false;
}

AsyncTaskQueue.prototype = {
    queue: function(func, rest)
    {
        // V8 engine doesn't perform well if not copying the array first before slicing
        var args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));

        this._queue.push({
            func: func,
            args: args.slice(1)
        });
    },

    // this allows adding more subtasks to tasks while running
    // No need to call "execute" on child queues
    addChildQueue: function(queue)
    {
        this._childQueues.push(queue);
    },

    execute: function()
    {
        if (this._isRunning)
            throw new Error("Already running!");

        this._isRunning = true;
        this._currentIndex = 0;

        this._executeTask();
    },

    _executeTask: function()
    {
        setTimeout(this._executeImpl.bind(this));
    },

    _executeImpl: function()
    {
        this.onProgress.dispatch(this._currentIndex / this._queue.length);

        if (this._childQueues.length > 0) {
            var queue = this._childQueues.shift();
            queue.onComplete.bind(this._executeImpl, this);
            queue.execute();
        }
        else if (this._queue.length === this._currentIndex) {
            this.onComplete.dispatch();
        }
        else {
            var elm = this._queue[this._currentIndex];
            elm.func.apply(this, elm.args);
            ++this._currentIndex;
            this._executeTask();
        }
    }
};

/**
 * ImageData provides some utilities for images.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var ImageData =
{
    /**
     * Gets image data from an Image.
     */
    getFromImage: function(image)
    {
        var canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        var context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return canvas.getImageData(0, 0, canvas.width, canvas.height);
    }
};

/**
 * MergeSpecularTextures is a utility that generates a single roughness/normalSpecularReflection/metallicness texture
 * from 3 (optionally) provided separate textures.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
var MergeSpecularTextures =
{
    /**
     * Merges the 3 provided specular textures into a single one for use with {@linkcode BasicMaterial}.
     * @param {Texture2D} [roughness] The texture containing monochrome roughness data
     * @param {Texture2D} [normalSpecular] The texture containing monochrome normal specular reflection data
     * @param {Texture2D} [metallicness] The texture containing monochrome normal metallicness reflection data
     * @returns {Texture2D} A texture containing (roughness, normalSpecular, metallicness) on (r,g,b) respectively
     */
    merge: function(roughness, normalSpecular, metallicness)
    {
        var tex = new Texture2D();
        tex.initEmpty(roughness.width, roughness.height);
        var fbo = new FrameBuffer(tex);
        GL.setRenderTarget(fbo);
        GL.setClearColor(Color.WHITE);
        GL.clear();

        var gl = GL.gl;

        if (roughness) {
            gl.colorMask(true, false, false, false);
            DEFAULTS.COPY_SHADER.execute(RectMesh.DEFAULT, roughness);
        }

        if (normalSpecular) {
            gl.colorMask(false, true, false, false);
            DEFAULTS.COPY_SHADER.execute(RectMesh.DEFAULT, normalSpecular);
        }

        if (metallicness) {
            gl.colorMask(false, false, true, false);
            DEFAULTS.COPY_SHADER.execute(RectMesh.DEFAULT, metallicness);
        }

        gl.colorMask(true, true, true, true);
        GL.setRenderTarget(null);
        GL.setClearColor(Color.BLACK);

        return tex;
    }
};

/**
 * Platform contains some platform-dependent utility functions.
 * @namespace
 */
var Platform =
{
    _isMobile: undefined,

    /**
     * Specifies whether the current platform is a mobile device or not.
     */
    get isMobile()
    {
        if (this._isMobile === undefined) {
            var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
            // This is woefully incomplete. Suggestions for alternative methods welcome.
            this._isMobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);
        }

        return this._isMobile;
    }
};

function IntersectionData()
{
    this.object = null;
    this.point = new Float4();
    this.t = Infinity;
}

function Potential()
{
    this.modelInstance = null;
    this.closestDistanceSqr = 0;
    this.objectMatrix = new Matrix4x4();

    // to store this in a linked list for pooling
    this.next = null;
}

/**
 * @classdec
 *
 * RayCaster sends a ray through the scene and finds the closest intersector.
 *
 * @constructor
 */
function RayCaster()
{
    SceneVisitor.call(this);
    this._potentials = null;
    this._potentialPool = new ObjectPool(Potential);
    this._localRay = new Ray();
}

RayCaster.prototype = Object.create(SceneVisitor.prototype);

/**
 * Finds the closest intersection point in the scene for the ray.
 * @param ray The ray in world space coordinates.
 * @param scene The scene containing the geometry to test.
 *
 * TODO: Should also be able to provide a set of objects instead of the scene?
 */
RayCaster.prototype.cast = function(ray, scene)
{
    this._potentials = [];
    this._ray = ray;
    this._scene = scene;

    this._potentialPool.reset();

    scene.acceptVisitor(this);

    this._potentials.sort(this._sortPotentialFunc);
    var hitData = this._findClosest();

    // TODO: Provide modelInstance.interactionProxy Mesh.
    //          -> if set, ignore meshes

    return hitData.object? hitData : null;
};

/**
 * @ignore
 */
RayCaster.prototype.qualifies = function(object)
{
    return object.visible && object.worldBounds.intersectsRay(this._ray);
};

/**
 * @ignore
 */
RayCaster.prototype.visitModelInstance = function (modelInstance, worldMatrix)
{
    var potential = this._potentialPool.getItem();
    potential.modelInstance = modelInstance;
    var dir = this._ray.direction;
    var dirX = dir.x, dirY = dir.y, dirZ = dir.z;
    var origin = this._ray.origin;
    var bounds = modelInstance.worldBounds;
    var center = bounds.center;
    var ex = bounds._halfExtentX;
    var ey = bounds._halfExtentY;
    var ez = bounds._halfExtentZ;
    ex = dirX > 0? center.x - ex : center.x + ex;
    ey = dirY > 0? center.y - ey : center.y + ey;
    ez = dirZ > 0? center.z - ez : center.z + ez;

    // this is not required for the order, but when testing the intersection distances
    ex -= origin.x;
    ey -= origin.y;
    ex -= origin.z;

    // the closest projected point on the ray is the order
    potential.closestDistanceSqr = ex * dirX + ey * dirY + ez * dirZ;
    potential.objectMatrix.inverseAffineOf(modelInstance.worldMatrix);

    this._potentials.push(potential);
};

RayCaster.prototype._findClosest = function()
{
    var set = this._potentials;
    var len = set.length;
    var hitData = new IntersectionData();
    var worldRay = this._ray;
    var localRay = this._localRay;

    for (var i = 0; i < len; ++i) {
        var elm = set[i];

        // we can stop searching, everything will be farther from now on
        if (elm.closestDistanceSqr > hitData.t * hitData.t)
            break;

        localRay.transformFrom(worldRay, elm.objectMatrix);

        var model = elm.modelInstance.model;
        var numMeshes = model.numMeshes;

        for (var m = 0; m < numMeshes; ++m) {
            if (this._testMesh(localRay, model.getMesh(m), hitData)) {
                hitData.object = elm.modelInstance;
            }
        }

    }

    if (hitData.object)
        hitData.object.worldMatrix.transformPoint(hitData.point, hitData.point);

    return hitData;
};

RayCaster.prototype._testMesh = function(ray, mesh, hitData)
{
    // to we need to closest position from the others?
    var dir = ray.direction;
    var origin = ray.origin;
    var oX = origin.x, oY = origin.y, oZ = origin.z;
    var dirX = dir.x, dirY = dir.y, dirZ = dir.z;
    var attrib = mesh.getVertexAttributeByName("hx_position");
    var vertices = mesh.getVertexData(attrib.streamIndex);
    var indices = mesh.getIndexData();
    var stride = mesh.getVertexStride(attrib.streamIndex);
    var numIndices = indices.length;
    var offset = attrib.offset;
    var updated = false;

    for (var i = 0; i < numIndices; i += 3) {
        var i1 = indices[i] * stride + offset;
        var i2 = indices[i + 1] * stride + offset;
        var i3 = indices[i + 2] * stride + offset;
        var x0 = vertices[i1], y0 = vertices[i1 + 1], z0 = vertices[i1 + 2];
        var x1 = vertices[i2], y1 = vertices[i2 + 1], z1 = vertices[i2 + 2];
        var x2 = vertices[i3], y2 = vertices[i3 + 1], z2 = vertices[i3 + 2];
        var dx1 = x1 - x0, dy1 = y1 - y0, dz1 = z1 - z0;
        var dx2 = x2 - x0, dy2 = y2 - y0, dz2 = z2 - z0;

        // unnormalized normal
        var nx = dy1*dz2 - dz1*dy2;
        var ny = dz1*dx2 - dx1*dz2;
        var nz = dx1*dy2 - dy1*dx2;
        // var rcpLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        // nx *= rcpLen;
        // ny *= rcpLen;
        // nz *= rcpLen;
        var dot = nx * dirX + ny * dirY + nz * dirZ;

        // face pointing away from the ray, assume it's invisible
        if (dot >= 0) continue;

        // triangle plane through point:
        var d = -(nx * x0 + ny * y0 + nz * z0);

        // perpendicular distance origin to plane
        var t = (nx * oX + ny * oY + nz * oZ + d);

        if (t < 0) continue;

        t /= -dot;

        // behind ray or too far, no need to test if inside
        if (t >= hitData.t) continue;

        var px = t * dirX + oX, py = t * dirY + oY, pz = t * dirZ + oZ;

        var dpx = px - x0, dpy = py - y0, dpz = pz - z0;
        var dot11 = dx1 * dx1 + dy1 * dy1 + dz1 * dz1;
        var dot22 = dx2 * dx2 + dy2 * dy2 + dz2 * dz2;
        var dot12 = dx1 * dx2 + dy1 * dy2 + dz1 * dz2;
        var denom = dot11 * dot22 - dot12 * dot12;

        // degenerate triangles
        if (denom === 0.0) continue;

        var dotp1 = dpx * dx1 + dpy * dy1 + dpz * dz1;
        var dotp2 = dpx * dx2 + dpy * dy2 + dpz * dz2;

        var rcpDenom = 1.0 / denom;

        var u = (dot22 * dotp1 - dot12 * dotp2) * rcpDenom;
        var v = (dot11 * dotp2 - dot12 * dotp1) * rcpDenom;

        if ((u >= 0) && (v >= 0) && (u + v <= 1.0)) {
            hitData.point.set(px, py, pz, 1.0);
            hitData.t = t;
            updated = true;
        }
    }

    return updated;
};

RayCaster.prototype._sortPotentialFunc = function(a, b)
{
    return a.closestDistanceSqr - b.closestDistanceSqr;
};

/**
 * @classdesc
 * A utility class to keep track of teh frame rate. It keeps a running average for the last few frames.
 *
 * @param numFrames The amount of frames to average.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function FPSCounter(numFrames)
{
    this._numFrames = numFrames || 1;
    this._frames = [ ];
    this._maxFPS = undefined;
    this._minFPS = undefined;
    this._currentFPS = 0;
    this._averageFPS = 0;
    this._runningSum = 0;

    for (var i = 0; i < this._numFrames; ++i)
        this._frames[i] = 0;

    this._index = 0;
}

FPSCounter.prototype =
{
    /**
     * Updates the counter with a new frame time
     * @param dt The time in milliseconds since the last frame
     */
    update: function(dt)
    {
        this._currentFPS = 1000 / dt;

        this._runningSum -= this._frames[this._index];
        this._runningSum += this._currentFPS;
        this._averageFPS = this._runningSum / this._numFrames;
        this._frames[this._index++] = this._currentFPS;

        if (this._index === this._numFrames) this._index = 0;

        if (this._maxFPS === undefined || this._currentFPS > this._maxFPS)
            this._maxFPS = this._currentFPS;

        if (this._minFPS === undefined || this._currentFPS < this._minFPS)
            this._minFPS = this._currentFPS;


    },

    /**
     * Returns the last frame's fps.
     */
    get lastFrameFPS()
    {
        return Math.round(this._currentFPS);
    },

    /**
     * Returns the running average fps.
     */
    get averageFPS()
    {
        return Math.round(this._averageFPS);
    },

    /**
     * Returns the maximum fps since last reset.
     */
    get maxFPS()
    {
        return Math.round(this._maxFPS);
    },

    /**
     * Returns the minimum fps since last reset.
     */
    get minFPS()
    {
        return Math.round(this._minFPS);
    },

    /**
     * Resets minimum and maximum fps stats.
     */
    reset: function()
    {
        this._maxFPS = undefined;
        this._minFPS = undefined;
    }
};

/**
 * @classdesc
 * StatsDisplay is a simple display for render statistics.
 *
 * @param container The DOM element to add the stats to.
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function StatsDisplay(container)
{
    this._fpsCounter = new FPSCounter(30);
    this._width = 100;
    this._height = 95;

    this._dpr = window.devicePixelRatio || 1;

    this._elm = document.createElement("canvas");
    this._elm.style.position = "fixed";
    this._elm.style.left = "5px";
    this._elm.style.top = "5px";
    this._elm.style.width = this._width + "px";
    this._elm.style.height = this._height + "px";
    this._elm.width = this._pixelWidth = this._width * this._dpr;
    this._elm.height = this._pixelHeight = this._height * this._dpr;

    var fontSize = 10 * this._dpr;
    this._context = this._elm.getContext( '2d' );
    this._context.font = fontSize + 'px "Lucida Console",Monaco,monospace';
    // this._context.globalAlpha = 0;

    container = container || document.getElementsByTagName("body")[0];
    container.appendChild(this._elm);

    onPreFrame.bind(this._update, this);
}

StatsDisplay.prototype =
{
    /**
     * Removes the stats display from the container.
     */
    remove: function()
    {
        this._elm.parentNode.removeChild(this._elm);
    },

    _update: function(dt)
    {
        this._fpsCounter.update(dt);

        var ctx = this._context;

        ctx.fillStyle = "rgba(0, 0, 0, .5)";
        ctx.fillRect(0, 0, this._pixelWidth, this._pixelHeight);

        var innerTime = frameTime.toFixed(1);
        var outerTime = dt.toFixed(1);

        ctx.fillStyle = "#fff";
        ctx.fillText("FPS: " + this._fpsCounter.averageFPS, 10 * this._dpr, 15 * this._dpr);
        ctx.fillText("Time: " + innerTime + " (" + outerTime + ") ", 10 * this._dpr, 30 * this._dpr);
        ctx.fillText("Draws: " + _glStats.numDrawCalls, 10 * this._dpr, 45 * this._dpr);
        ctx.fillText("Tris: " + _glStats.numTriangles, 10 * this._dpr, 60 * this._dpr);
        ctx.fillText("Clears: " + _glStats.numClears, 10 * this._dpr, 75 * this._dpr);
    }
};

// this is generated by gulp

exports.ShaderLibrary = ShaderLibrary;
exports.init = init;
exports.start = start;
exports.stop = stop;
exports.META = META;
exports.capabilities = capabilities;
exports.onPreFrame = onPreFrame;
exports.onFrame = onFrame;
exports.TextureFilter = TextureFilter;
exports.CullMode = CullMode;
exports.StencilOp = StencilOp;
exports.Comparison = Comparison;
exports.ElementType = ElementType;
exports.BlendFactor = BlendFactor;
exports.BlendOperation = BlendOperation;
exports.ClearMask = ClearMask;
exports.InitOptions = InitOptions;
exports.TextureFormat = TextureFormat;
exports.DataType = DataType;
exports.BufferUsage = BufferUsage;
exports.CubeFace = CubeFace;
exports.Float2 = Float2;
exports.Float4 = Float4;
exports.CenteredGaussianCurve = CenteredGaussianCurve;
exports.MathX = MathX;
exports.Matrix4x4 = Matrix4x4;
exports.PlaneSide = PlaneSide;
exports.PoissonDisk = PoissonDisk;
exports.PoissonSphere = PoissonSphere;
exports.Quaternion = Quaternion;
exports.Ray = Ray;
exports.Transform = Transform;
exports.Debug = Debug;
exports.DebugBoundsComponent = DebugBoundsComponent;
exports.Profiler = Profiler;
exports.BoundingVolume = BoundingVolume;
exports.BoundingAABB = BoundingAABB;
exports.BoundingSphere = BoundingSphere;
exports.SceneNode = SceneNode;
exports.Scene = Scene;
exports.SceneVisitor = SceneVisitor;
exports.Skybox = Skybox;
exports.Terrain = Terrain;
exports.Entity = Entity;
exports.Component = Component;
exports.CompositeComponent = CompositeComponent;
exports.KeyFrame = KeyFrame;
exports.AnimationClip = AnimationClip;
exports.AnimationPlayhead = AnimationPlayhead;
exports.LayeredAnimation = LayeredAnimation;
exports.AnimationLayer = AnimationLayer;
exports.AnimationLayerFloat4 = AnimationLayerFloat4;
exports.AnimationLayerQuat = AnimationLayerQuat;
exports.MorphAnimation = MorphAnimation;
exports.MorphPose = MorphPose;
exports.MorphTarget = MorphTarget;
exports.Skeleton = Skeleton;
exports.SkeletonAnimation = SkeletonAnimation;
exports.SkeletonBinaryLerpNode = SkeletonBinaryLerpNode;
exports.SkeletonBlendNode = SkeletonBlendNode;
exports.SkeletonBlendTree = SkeletonBlendTree;
exports.SkeletonClipNode = SkeletonClipNode;
exports.SkeletonFreePoseNode = SkeletonFreePoseNode;
exports.SkeletonJoint = SkeletonJoint;
exports.SkeletonJointPose = SkeletonJointPose;
exports.SkeletonPose = SkeletonPose;
exports.SkeletonXFadeNode = SkeletonXFadeNode;
exports.Camera = Camera;
exports.Frustum = Frustum;
exports.PerspectiveCamera = PerspectiveCamera;
exports.OrthographicOffCenterCamera = OrthographicOffCenterCamera;
exports.FloatController = FloatController;
exports.OrbitController = OrbitController;
exports.Color = Color;
exports.DataStream = DataStream;
exports.GL = GL;
exports.Signal = Signal;
exports.Bloom = Bloom;
exports.Blur = Blur;
exports.CopyTexturePass = CopyTexturePass;
exports.Effect = Effect;
exports.EffectPass = EffectPass;
exports.FilmicToneMapping = FilmicToneMapping;
exports.ACESToneMapping = ACESToneMapping;
exports.Fog = Fog;
exports.FXAA = FXAA;
exports.GaussianBlurPass = GaussianBlurPass;
exports.HBAO = HBAO;
exports.SSAO = SSAO;
exports.ReinhardToneMapping = ReinhardToneMapping;
exports.AssetLibrary = AssetLibrary;
exports.AssetLoader = AssetLoader;
exports.URLLoader = URLLoader;
exports.HCM = HCM;
exports.HMT = HMT;
exports.Importer = Importer;
exports.JPG_EQUIRECTANGULAR = JPG_EQUIRECTANGULAR;
exports.PNG_EQUIRECTANGULAR = PNG_EQUIRECTANGULAR;
exports.JPG_HEIGHTMAP = JPG_HEIGHTMAP;
exports.PNG_HEIGHTMAP = PNG_HEIGHTMAP;
exports.JPG = JPG;
exports.PNG = PNG;
exports.AmbientLight = AmbientLight;
exports.DirectionalLight = DirectionalLight;
exports.Light = Light;
exports.LightProbe = LightProbe;
exports.DynamicLightProbe = DynamicLightProbe;
exports.PointLight = PointLight;
exports.SpotLight = SpotLight;
exports.ShadowFilter = ShadowFilter;
exports.ExponentialDirectionalShadowFilter = ExponentialDirectionalShadowFilter;
exports.HardDirectionalShadowFilter = HardDirectionalShadowFilter;
exports.PCFDirectionalShadowFilter = PCFDirectionalShadowFilter;
exports.VarianceDirectionalShadowFilter = VarianceDirectionalShadowFilter;
exports.HardSpotShadowFilter = HardSpotShadowFilter;
exports.PCFSpotShadowFilter = PCFSpotShadowFilter;
exports.HardPointShadowFilter = HardPointShadowFilter;
exports.PCFPointShadowFilter = PCFPointShadowFilter;
exports.MaterialPass = MaterialPass;
exports.Material = Material;
exports.BasicMaterial = BasicMaterial;
exports.SkyboxMaterial = SkyboxMaterial;
exports.ModelInstance = ModelInstance;
exports.Model = Model;
exports.Mesh = Mesh;
exports.MeshBatch = MeshBatch;
exports.MeshInstance = MeshInstance;
exports.SpherePrimitive = SpherePrimitive;
exports.BoxPrimitive = BoxPrimitive;
exports.Primitive = Primitive;
exports.ConePrimitive = ConePrimitive;
exports.CylinderPrimitive = CylinderPrimitive;
exports.PlanePrimitive = PlanePrimitive;
exports.TorusPrimitive = TorusPrimitive;
exports.BlendState = BlendState;
exports.Renderer = Renderer;
exports.LightingModel = LightingModel;
exports.View = View;
exports.MultiRenderer = MultiRenderer;
exports.StencilState = StencilState;
exports.Texture2D = Texture2D;
exports.TextureCube = TextureCube;
exports.TextureUtils = TextureUtils;
exports.WriteOnlyDepthBuffer = WriteOnlyDepthBuffer;
exports.AsyncTaskQueue = AsyncTaskQueue;
exports.ArrayUtils = ArrayUtils;
exports.EquirectangularTexture = EquirectangularTexture;
exports.HeightMap = HeightMap;
exports.ImageData = ImageData;
exports.MergeSpecularTextures = MergeSpecularTextures;
exports.NormalTangentGenerator = NormalTangentGenerator;
exports.Platform = Platform;
exports.RayCaster = RayCaster;
exports.StatsDisplay = StatsDisplay;

Object.defineProperty(exports, '__esModule', { value: true });

})));
