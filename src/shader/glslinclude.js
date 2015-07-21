HX.GLSLIncludeDeferredPass =
    // #define HX_LINEAR_SPACE gets added by Helix.js if enabled in options
    "precision mediump float;\n\
vec4 hx_gammaToLinear(vec4 sample)\n\
{\n\
    #ifdef HX_LINEAR_SPACE\n\
    sample.x = pow(sample.x, 2.2);\n\
    sample.y = pow(sample.y, 2.2);\n\
    sample.z = pow(sample.z, 2.2);\n\
    #endif\n\
    return sample;\n\
}\n\
\n\
vec3 hx_gammaToLinear(vec3 sample)\n\
{\n\
    #ifdef HX_LINEAR_SPACE\n\
    sample.x = pow(sample.x, 2.2);\n\
    sample.y = pow(sample.y, 2.2);\n\
    sample.z = pow(sample.z, 2.2);\n\
    #endif\n\
    return sample;\n\
}\n\
vec4 hx_linearToGamma(vec4 linear)\n\
{\n\
    #ifdef HX_LINEAR_SPACE\n\
    linear.x = pow(linear.x, 0.45);\n\
    linear.y = pow(linear.y, 0.45);\n\
    linear.z = pow(linear.z, 0.45);\n\
    #endif\n\
    return linear;\n\
}\n\
\n\
vec3 hx_linearToGamma(vec3 linear)\n\
{\n\
    #ifdef HX_LINEAR_SPACE\n\
        linear.x = pow(linear.x, 0.45);\n\
        linear.y = pow(linear.y, 0.45);\n\
        linear.z = pow(linear.z, 0.45);\n\
    #endif\n\
    return linear;\n\
}\n\
\n\
// see Aras' blog post: http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/ \n\
// Only for 0 - 1\n\
vec4 hx_floatToRGBA8(float value)\n\
{\n\
    vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * value;\n\
    enc = fract(enc);\n\
    return enc - enc.yzww * vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);\n\
}\n\
\n\
float hx_RGBA8ToFloat(vec4 rgba)\n\
{\n\
    return dot(rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));\n\
}\n\
\n\
float hx_sampleLinearDepth(sampler2D tex, vec2 uv)\n\
{\n\
    return hx_RGBA8ToFloat(texture2D(tex, uv));\n\
}\n\
\n\
vec3 hx_getFrustumVector(vec2 position, mat4 unprojectionMatrix)\n\
{\n\
    vec4 unprojNear = unprojectionMatrix * vec4(position, -1.0, 1.0);\n\
    vec4 unprojFar = unprojectionMatrix * vec4(position, 1.0, 1.0);\n\
    return unprojFar.xyz/unprojFar.w - unprojNear.xyz/unprojNear.w;\n\
}\n\
\n\
vec3 hx_getLinearDepthViewVector(vec2 position, mat4 unprojectionMatrix)\n\
{\n\
    vec4 unproj = unprojectionMatrix * vec4(position, 0.0, 1.0);\n\
    unproj /= unproj.w;\n\
    return -unproj.xyz / unproj.z;\n\
}\n\
\n\
// THIS IS FOR NON_LINEAR DEPTH!\n\
float hx_depthToViewZ(float depthSample, mat4 projectionMatrix)\n\
{\n\
    return -projectionMatrix[3][2] / (depthSample * 2.0 - 1.0 + projectionMatrix[2][2]);\n\
}\n\
\n\
vec4 hx_decodeSpecular(vec4 data)\n\
{\n\
    // scale specular reflectivity by 5 to have better precision since we only need the range ~[0, .2] (.17 = diamond)\n\
    data.y *= .2;\n\
    return data;\n\
}\n\
\
vec3 hx_getNormalSpecularReflectance(float metallicness, float insulatorNormalSpecularReflectance, vec3 albedo)\n\
{\n\
    return mix(vec3(insulatorNormalSpecularReflectance), albedo, metallicness);\n\
}\n\
\
void hx_decodeReflectionData(in vec4 albedoSample, in vec4 specularSample, out vec3 normalSpecularReflectance, out float roughness)\n\
{\n\
    normalSpecularReflectance = mix(vec3(specularSample.y * .2), albedoSample.xyz, specularSample.x);\n\
    //prevent from being 0 \n\
    roughness = clamp(specularSample.z, .01, .99);\n\
}\n\
\n\
vec3 hx_fresnel(vec3 normalSpecularReflectance, vec3 lightDir, vec3 halfVector)\n\
{\n\
    float cosAngle = 1.0 - max(dot(halfVector, lightDir), 0.0);\n\
    // to the 5th power\n\
    float power = pow(cosAngle, 5.0);\n\
    return normalSpecularReflectance + (1.0 - normalSpecularReflectance) * power;\n\
}\n\
";

HX.GLSLIncludeShaders = "\
precision mediump float;\n\
\n\
float hx_luminance(vec4 color)\n\
{\n\
    return dot(color.xyz, vec3(.30, 0.59, .11));\n\
}\n\
\n\
float hx_luminance(vec3 color)\n\
{\n\
    return dot(color, vec3(.30, 0.59, .11));\n\
}\n\
\n\
vec4 hx_encodeSpecular(vec4 data)\n\
{\n\
    // scale specular reflectivity by 5 to have better precision since we only need the range ~[0, .2] (.17 = diamond)\n\
    data.y *= 5.0;\n\
    return data;\n\
}\n\n\
";

HX.SMITH_SCHLICK_VISIBILITY = "\
    float hx_lightVisibility(in vec3 normal, in vec3 viewDir, float roughness, float nDotLClamped)\n\
    {\n\
        float nDotV = max(-dot(normal, viewDir), 0.0);\n\
        // roughness remapping, this is essentially: sqrt(2 * roughness * roughness / PI)\n\
        // this remaps beckman distribution roughness to SmithSchlick\n\
        roughness *= .63772;\n\
        float g1 = nDotV*(1.0 - roughness) + roughness;\n\
        float g2 = nDotLClamped*(1.0 - roughness) + roughness;\n\
        return 1.0/(g1*g2);\n\
    }\n\
";

// Lambert diffuse, normalized Blinn-Phong microfacet distribution, Schlick fresnel approximation
HX.BLINN_PHONG_SMITH_SCHLICK = "\
    void hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, float transmittance, out vec3 diffuseColor, out vec3 specularColor) \n\
    {\n\
        float nDotL = -dot(lightDir, normal);\n\
        float nDotLClamped = max(nDotL, 0.0);\n\
        vec3 irradiance = nDotLClamped * lightColor;	// in fact irradiance / PI\n\
        \n\
        vec3 halfVector = normalize(lightDir + viewDir);\n\
        float halfDotLight = dot(halfVector, lightDir);\n\
        \n\
        float roughSqr = roughness*roughness;\n\
        roughSqr *= roughSqr;\n\
        float specular = max(-dot(halfVector, normal), 0.0);\n\
        float distribution = pow(specular, 2.0/roughSqr - 2.0)/roughSqr;\n\
        \n\
        float visibility = hx_lightVisibility(normal, lightDir, roughness, nDotLClamped);\n\
        float microfacet = .25 * distribution * visibility;\n\
        \n\
        float cosAngle = 1.0 - halfDotLight;\n\
        // to the 5th power\n\
        float power = cosAngle*cosAngle;\n\
        power *= power;\n\
        power *= cosAngle;\n\
        vec3 fresnel = specularNormalReflection + (1.0 - specularNormalReflection)*power;\n\
        \n\
        //approximated fresnel-based energy conservation\n\
        diffuseColor = irradiance * (1.0 - fresnel) + max(-nDotL, 0.0) * lightColor * transmittance;\n\
        specularColor = irradiance * fresnel * microfacet;\n\
    }\n\n";

HX.UNNORMALIZED_BLINN_PHONG = "\
    void hx_lighting(in vec3 normal, in vec3 lightDir, in vec3 viewDir, in vec3 lightColor, vec3 specularNormalReflection, float roughness, float transmittance, out vec3 diffuseColor, out vec3 specularColor) \n\
    {\n\
        float nDotL = -dot(lightDir, normal);\n\
        float nDotLClamped = max(nDotL, 0.0);\n\
        vec3 irradiance = nDotLClamped * lightColor;	// in fact irradiance / PI\n\
        //approximated fresnel-based energy conservation\n\
        float roughSqr = roughness*roughness;\n\
        roughSqr *= roughSqr;\n\
        vec3 halfVector = normalize(lightDir + viewDir);\n\
        float specular = max(-dot(halfVector, normal), 0.0);\n\
        float distribution = pow(specular, 2.0/roughSqr - 2.0)/roughSqr;\n\
        float microfacet = pow(specular, 2.0/roughSqr - 2.0);\n\
        \n\
        diffuseColor = irradiance;\n\
        specularColor = irradiance * microfacet;\n\
    }\n\
";

HX.DEFERRED_LIGHT_MODEL = HX.SMITH_SCHLICK_VISIBILITY + HX.BLINN_PHONG_SMITH_SCHLICK;