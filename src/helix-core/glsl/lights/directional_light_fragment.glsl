uniform vec3 lightColor;
uniform vec3 lightViewDirection;

varying vec2 uv;
varying vec3 viewDir;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;

#ifdef CAST_SHADOWS
	uniform sampler2D hx_gbufferDepth;
	uniform sampler2D shadowMap;

	uniform float hx_cameraFrustumRange;
	uniform float hx_cameraNearPlaneDistance;

	uniform mat4 shadowMapMatrices[NUM_CASCADES];
	uniform float splitDistances[NUM_CASCADES];
	uniform float depthBias;


    mat4 getShadowMatrix(vec3 viewPos)
    {
        #if NUM_CASCADES > 1
            // not very efficient :(
            for (int i = 0; i < NUM_CASCADES - 1; ++i) {
                // remember, negative Z!
                if (viewPos.z > splitDistances[i]) {
                    return shadowMapMatrices[i];
                }
            }
            return shadowMapMatrices[NUM_CASCADES - 1];
        #else
            return shadowMapMatrices[0];
        #endif
    }
#endif

vec3 hx_calculateLight(vec3 diffuseAlbedo, vec3 normal, vec3 lightDir, vec3 viewVector, vec3 normalSpecularReflectance, float roughness, float metallicness)
{
// start extractable code (for fwd)
	vec3 diffuseReflection;
	vec3 specularReflection;

	hx_lighting(normal, lightDir, normalize(viewVector), lightColor, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);

	diffuseReflection *= diffuseAlbedo * (1.0 - metallicness);
	vec3 totalReflection = diffuseReflection + specularReflection;

	#ifdef CAST_SHADOWS
		float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
		float viewZ = hx_cameraNearPlaneDistance + depth * hx_cameraFrustumRange;
		vec3 viewPos = viewZ * viewVector;
		mat4 shadowMatrix = getShadowMatrix(viewPos);
		totalReflection *= hx_getShadow(shadowMap, viewPos, shadowMatrix, depthBias, uv);
	#endif

    return totalReflection;
}

void main()
{
	vec4 colorSample = texture2D(hx_gbufferColor, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	vec3 normal = hx_decodeNormal(normalSample);
	vec3 normalSpecularReflectance;
	float roughness;
	float metallicness;

	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);

	vec3 totalReflection = hx_calculateLight(colorSample.xyz, normal, lightViewDirection, viewDir, normalSpecularReflectance, roughness, metallicness);

    #ifdef HX_GAMMA_CORRECT_LIGHTS
        totalReflection = hx_linearToGamma(totalReflection);
    #endif

	gl_FragColor = vec4(totalReflection, 1.0);

}