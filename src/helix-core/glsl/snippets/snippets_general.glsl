#define HX_LOG_10 2.302585093

#ifdef HX_GLSL_300_ES
// replace some outdated function names
vec4 texture2D(sampler2D s, vec2 uv) { return texture(s, uv); }
vec4 textureCube(samplerCube s, vec3 uvw) { return texture(s, uvw); }

#define vertex_attribute in
#define varying_in in
#define varying_out out

#ifdef HX_FRAGMENT_SHADER
out vec4 hx_FragColor;
#endif

#else

#define vertex_attribute attribute
#define varying_in varying
#define varying_out varying
#define hx_FragColor gl_FragColor

#endif

float saturate(float value)
{
    return clamp(value, 0.0, 1.0);
}

vec2 saturate(vec2 value)
{
    return clamp(value, 0.0, 1.0);
}

vec3 saturate(vec3 value)
{
    return clamp(value, 0.0, 1.0);
}

vec4 saturate(vec4 value)
{
    return clamp(value, 0.0, 1.0);
}

// Only for 0 - 1
vec4 hx_floatToRGBA8(float value)
{
    vec4 enc = value * vec4(1.0, 255.0, 65025.0, 16581375.0);
    // cannot fract first value or 1 would not be encodable
    enc.yzw = fract(enc.yzw);
    return enc - enc.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0);
}

float hx_RGBA8ToFloat(vec4 rgba)
{
    return dot(rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));
}

vec2 hx_floatToRG8(float value)
{
    vec2 enc = vec2(1.0, 255.0) * value;
    enc.y = fract(enc.y);
    enc.x -= enc.y / 255.0;
    return enc;
}

float hx_RG8ToFloat(vec2 rg)
{
    return dot(rg, vec2(1.0, 1.0/255.0));
}

vec2 hx_encodeNormal(vec3 normal)
{
    vec2 data;
    float p = sqrt(-normal.y*8.0 + 8.0);
    data = normal.xz / p + .5;
    return data;
}

vec3 hx_decodeNormal(vec4 data)
{
    vec3 normal;
    data.xy = data.xy*4.0 - 2.0;
    float f = dot(data.xy, data.xy);
    float g = sqrt(1.0 - f * .25);
    normal.xz = data.xy * g;
    normal.y = -(1.0 - f * .5);
    return normal;
}

float hx_log10(float val)
{
    return log(val) / HX_LOG_10;
}

vec4 hx_gammaToLinear(vec4 color)
{
    #if defined(HX_GAMMA_CORRECTION_PRECISE)
        color.x = pow(color.x, 2.2);
        color.y = pow(color.y, 2.2);
        color.z = pow(color.z, 2.2);
    #elif defined(HX_GAMMA_CORRECTION_FAST)
        color.xyz *= color.xyz;
    #endif
    return color;
}

vec3 hx_gammaToLinear(vec3 color)
{
    #if defined(HX_GAMMA_CORRECTION_PRECISE)
        color.x = pow(color.x, 2.2);
        color.y = pow(color.y, 2.2);
        color.z = pow(color.z, 2.2);
    #elif defined(HX_GAMMA_CORRECTION_FAST)
        color.xyz *= color.xyz;
    #endif
    return color;
}

vec4 hx_linearToGamma(vec4 linear)
{
    #if defined(HX_GAMMA_CORRECTION_PRECISE)
        linear.x = pow(linear.x, 0.454545);
        linear.y = pow(linear.y, 0.454545);
        linear.z = pow(linear.z, 0.454545);
    #elif defined(HX_GAMMA_CORRECTION_FAST)
        linear.xyz = sqrt(linear.xyz);
    #endif
    return linear;
}

vec3 hx_linearToGamma(vec3 linear)
{
    #if defined(HX_GAMMA_CORRECTION_PRECISE)
        linear.x = pow(linear.x, 0.454545);
        linear.y = pow(linear.y, 0.454545);
        linear.z = pow(linear.z, 0.454545);
    #elif defined(HX_GAMMA_CORRECTION_FAST)
        linear.xyz = sqrt(linear.xyz);
    #endif
    return linear;
}

/*float hx_sampleLinearDepth(sampler2D tex, vec2 uv)
{
    return hx_RGBA8ToFloat(texture2D(tex, uv));
}*/

float hx_decodeLinearDepth(vec4 samp)
{
    return hx_RG8ToFloat(samp.zw);
}

vec3 hx_getFrustumVector(vec2 position, mat4 unprojectionMatrix)
{
    vec4 unprojNear = unprojectionMatrix * vec4(position, -1.0, 1.0);
    vec4 unprojFar = unprojectionMatrix * vec4(position, 1.0, 1.0);
    return unprojFar.xyz/unprojFar.w - unprojNear.xyz/unprojNear.w;
}

// view vector with z = 1, so we can use nearPlaneDist + linearDepth * (farPlaneDist - nearPlaneDist) as a scale factor to find view space position
vec3 hx_getLinearDepthViewVector(vec2 position, mat4 unprojectionMatrix)
{
    vec4 unproj = unprojectionMatrix * vec4(position, 0.0, 1.0);
    unproj /= unproj.w;
    return unproj.xyz / unproj.y;
}

// THIS IS FOR NON_LINEAR DEPTH!
float hx_depthToViewY(float depthSample, mat4 projectionMatrix)
{
    // View Y maps to NDC Z!!!
    // y = projectionMatrix[3][2] / (d * 2.0 - 1.0 + projectionMatrix[1][2])
    return projectionMatrix[3][2] / (depthSample * 2.0 - 1.0 + projectionMatrix[1][2]);
}

vec3 hx_getNormalSpecularReflectance(float metallicness, float insulatorNormalSpecularReflectance, vec3 color)
{
    return mix(vec3(insulatorNormalSpecularReflectance), color, metallicness);
}

vec3 hx_fresnel(vec3 normalSpecularReflectance, vec3 lightDir, vec3 halfVector)
{
    float cosAngle = 1.0 - max(dot(halfVector, lightDir), 0.0);
    // to the 5th power
    float power = pow(cosAngle, 5.0);
    return normalSpecularReflectance + (1.0 - normalSpecularReflectance) * power;
}

// https://seblagarde.wordpress.com/2011/08/17/hello-world/
vec3 hx_fresnelProbe(vec3 normalSpecularReflectance, vec3 lightDir, vec3 normal, float roughness)
{
    float cosAngle = 1.0 - max(dot(normal, lightDir), 0.0);
    // to the 5th power
    float power = pow(cosAngle, 5.0);
    float gloss = (1.0 - roughness) * (1.0 - roughness);
    vec3 bound = max(vec3(gloss), normalSpecularReflectance);
    return normalSpecularReflectance + (bound - normalSpecularReflectance) * power;
}


float hx_luminance(vec4 color)
{
    return dot(color.xyz, vec3(.30, 0.59, .11));
}

float hx_luminance(vec3 color)
{
    return dot(color, vec3(.30, 0.59, .11));
}

// linear variant of smoothstep
float hx_linearStep(float lower, float upper, float x)
{
    return clamp((x - lower) / (upper - lower), 0.0, 1.0);
}

vec4 hx_sampleDefaultDither(sampler2D ditherTexture, vec2 uv)
{
    vec4 s = texture2D(ditherTexture, uv);

    #ifndef HX_FLOAT_TEXTURES
    s = s * 2.0 - 1.0;
    #endif

    return s;
}

vec3 hx_evaluateSH(vec3 dir, vec3 coeff[9])
{
    vec3 sq = dir * dir;

    return  coeff[0] +
            coeff[1] * dir.y + coeff[2] * dir.z + coeff[3] * dir.x +
            coeff[4] * dir.x * dir.y + coeff[5] * dir.y * dir.z + coeff[6] * (3.0 * sq.z - 1.0) +
            coeff[7] * dir.x * dir.z + coeff[8] * (sq.x - sq.y);
}

vec3 hx_intersectCubeMap(vec3 rayOrigin, vec3 cubeCenter, vec3 rayDir, float cubeSize)
{
    vec3 t = (cubeSize * sign(rayDir) - (rayOrigin - cubeCenter)) / rayDir;
    float minT = min(min(t.x, t.y), t.z);
    return rayOrigin + minT * rayDir;
}

// sadly, need a parameter due to a bug in Internet Explorer / Edge. Just pass in 0.
#ifdef HX_USE_SKINNING_TEXTURE
#define HX_RCP_MAX_SKELETON_JOINTS 1.0 / float(HX_MAX_SKELETON_JOINTS - 1)
mat4 hx_getSkinningMatrixImpl(vec4 weights, vec4 indices, sampler2D tex)
{
    mat4 m = mat4(0.0);
    for (int i = 0; i < 4; ++i) {
        mat4 t;
        float index = indices[i] * HX_RCP_MAX_SKELETON_JOINTS;
        t[0] = texture2D(tex, vec2(index, 0.0));
        t[1] = texture2D(tex, vec2(index, 0.5));
        t[2] = texture2D(tex, vec2(index, 1.0));
        t[3] = vec4(0.0, 0.0, 0.0, 1.0);
        m += weights[i] * t;
    }
    return m;
}
#define hx_getSkinningMatrix(v) hx_getSkinningMatrixImpl(hx_jointWeights, hx_jointIndices, hx_skinningTexture)
#else
#define hx_getSkinningMatrix(v) ( hx_jointWeights.x * mat4(hx_skinningMatrices[int(hx_jointIndices.x) * 3], hx_skinningMatrices[int(hx_jointIndices.x) * 3 + 1], hx_skinningMatrices[int(hx_jointIndices.x) * 3 + 2], vec4(0.0, 0.0, 0.0, 1.0)) + hx_jointWeights.y * mat4(hx_skinningMatrices[int(hx_jointIndices.y) * 3], hx_skinningMatrices[int(hx_jointIndices.y) * 3 + 1], hx_skinningMatrices[int(hx_jointIndices.y) * 3 + 2], vec4(0.0, 0.0, 0.0, 1.0)) + hx_jointWeights.z * mat4(hx_skinningMatrices[int(hx_jointIndices.z) * 3], hx_skinningMatrices[int(hx_jointIndices.z) * 3 + 1], hx_skinningMatrices[int(hx_jointIndices.z) * 3 + 2], vec4(0.0, 0.0, 0.0, 1.0)) + hx_jointWeights.w * mat4(hx_skinningMatrices[int(hx_jointIndices.w) * 3], hx_skinningMatrices[int(hx_jointIndices.w) * 3 + 1], hx_skinningMatrices[int(hx_jointIndices.w) * 3 + 2], vec4(0.0, 0.0, 0.0, 1.0)) )
#endif