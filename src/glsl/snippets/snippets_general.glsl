// see Aras' blog post: http://aras-p.info/blog/2009/07/30/encoding-floats-to-rgba-the-final/
// Only for 0 - 1
vec4 hx_floatToRGBA8(float value)
{
    vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * value;
    enc = fract(enc);
    return enc - enc.yzww * vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0);
}

float hx_RGBA8ToFloat(vec4 rgba)
{
    return dot(rgba, vec4(1.0, 1.0/255.0, 1.0/65025.0, 1.0/16581375.0));
}

vec2 hx_floatToRG8(float value)
{
    vec2 enc = vec2(1.0, 255.0) * value;
    enc = fract(enc);
    enc.x -= enc.y / 255.0;
    return enc;
}

float hx_RG8ToFloat(vec2 rg)
{
    return dot(rg, vec2(1.0, 1.0/255.0));
}

vec4 hx_encodeNormalDepth(vec3 normal, float depth)
{
	#ifdef HX_NO_DEPTH_TEXTURES
    	vec4 data;
    	data.xy = normal.xy * .5 + .5;
		data.zw = hx_floatToRG8(depth);
		return data;
	#else
		return vec4(normal * .5 + .5, 1.0);
    #endif
}

vec3 hx_decodeNormal(vec4 data)
{
    #ifdef HX_NO_DEPTH_TEXTURES
    	vec3 normal;
    	normal.xy = data.xy * 2.0 - 1.0;
		normal.z = 1.0 - dot(normal.xy, normal.xy);
		normal.z = sqrt(normal.z);
		return normal;
    #else
    	return normalize(data.xyz - .5);
    #endif
}

vec4 hx_encodeSpecularData(float metallicness, float specularNormalReflection, float roughness)
{
	return vec4(roughness, specularNormalReflection * 5.0, metallicness, 1.0);
}

vec4 hx_gammaToLinear(vec4 color)
{
    #ifdef HX_LINEAR_SPACE
        color.x = pow(color.x, 2.2);
        color.y = pow(color.y, 2.2);
        color.z = pow(color.z, 2.2);
    #endif
    return color;
}

vec3 hx_gammaToLinear(vec3 color)
{
    #ifdef HX_LINEAR_SPACE
        color.x = pow(color.x, 2.2);
        color.y = pow(color.y, 2.2);
        color.z = pow(color.z, 2.2);
    #endif
    return color;
}

vec4 hx_linearToGamma(vec4 linear)
{
    #ifdef HX_LINEAR_SPACE
        linear.x = pow(linear.x, 0.45);
        linear.y = pow(linear.y, 0.45);
        linear.z = pow(linear.z, 0.45);
    #endif
    return linear;
}

vec3 hx_linearToGamma(vec3 linear)
{
    #ifdef HX_LINEAR_SPACE
        linear.x = pow(linear.x, 0.45);
        linear.y = pow(linear.y, 0.45);
        linear.z = pow(linear.z, 0.45);
    #endif
    return linear;
}

float hx_sampleLinearDepth(sampler2D tex, vec2 uv)
{
    return hx_RGBA8ToFloat(texture2D(tex, uv));
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
    return -unproj.xyz / unproj.z;
}

// THIS IS FOR NON_LINEAR DEPTH!
float hx_depthToViewZ(float depthSample, mat4 projectionMatrix)
{
    return -projectionMatrix[3][2] / (depthSample * 2.0 - 1.0 + projectionMatrix[2][2]);
}


vec3 hx_getNormalSpecularReflectance(float metallicness, float insulatorNormalSpecularReflectance, vec3 color)
{
    return mix(vec3(insulatorNormalSpecularReflectance), color, metallicness);
}

// for use when sampling gbuffer data for lighting
void hx_decodeReflectionData(in vec4 colorSample, in vec4 specularSample, out vec3 normalSpecularReflectance, out float roughness, out float metallicness)
{
    //prevent from being 0
    roughness = clamp(specularSample.x, .01, 1.0);
	metallicness = specularSample.z;
    normalSpecularReflectance = mix(vec3(specularSample.y * .2), colorSample.xyz, metallicness);
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

vec2 getPreciseRefractedUVOffset(vec3 viewSpacePosition, vec3 normal, float refractiveRatio, float distance)
{
    vec3 refractionVector = refract(normalize(viewSpacePosition), normal, refractiveRatio);
    return -refractionVector.xy / (viewSpacePosition.z + refractionVector.z * distance) * distance;
}
