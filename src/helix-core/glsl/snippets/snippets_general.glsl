#define HX_LOG_10 2.302585093

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

// emission of 1.0 is the same as "unlit", anything above emits more
vec2 hx_encodeNormal(vec3 normal)
{
    vec2 data;
    float p = sqrt(normal.z*8.0 + 8.0);
    data = normal.xy / p + .5;
    return data;
}

vec3 hx_decodeNormal(vec4 data)
{
    vec3 normal;
    data.xy = data.xy*4.0 - 2.0;
    float f = dot(data.xy, data.xy);
    float g = sqrt(1.0 - f * .25);
    normal.xy = data.xy * g;
    normal.z = 1.0 - f * .5;
//    normal.xy = data.xy * 2.0 - 1.0;
//    normal.z = sqrt(1.0 - dot(normal.xy, normal.xy));
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

// view vector with z = -1, so we can use nearPlaneDist + linearDepth * (farPlaneDist - nearPlaneDist) as a scale factor to find view space position
vec3 hx_getLinearDepthViewVector(vec2 position, mat4 unprojectionMatrix)
{
    vec4 unproj = unprojectionMatrix * vec4(position, 0.0, 1.0);
    unproj /= unproj.w;
    return -unproj.xyz / unproj.z;
}

// THIS IS FOR NON_LINEAR DEPTH!
float hx_depthToViewZ(float depthSample, mat4 projectionMatrix)
{
//    z = -projectionMatrix[3][2] / (d * 2.0 - 1.0 + projectionMatrix[2][2])
    return -projectionMatrix[3][2] / (depthSample * 2.0 - 1.0 + projectionMatrix[2][2]);
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