uniform vec3 lightColor;
uniform vec3 lightWorldDirection;

varying vec2 uv;
varying vec3 viewWorldDir;

uniform sampler2D hx_gbufferColor;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;

#ifdef CAST_SHADOWS
	uniform sampler2D hx_gbufferDepth;
	uniform sampler2D shadowMap;

	uniform float hx_cameraFrustumRange;
	uniform vec3 hx_cameraWorldPosition;

	uniform mat4 shadowMapMatrices[NUM_CASCADES];
	uniform float splitDistances[NUM_CASCADES];
	uniform float depthBias;

	#if NUM_SHADOW_SAMPLES > 1
		uniform sampler2D hx_dither2D;
		uniform vec2 hx_dither2DTextureScale;

		uniform vec2 shadowMapSoftnesses[NUM_CASCADES];
		uniform vec2 hx_poissonDisk[NUM_SHADOW_SAMPLES];
	#endif

	float readDepth(vec2 uv)
	{
	#ifdef HX_NO_DEPTH_TEXTURES
		return hx_RGBA8ToFloat(texture2D(shadowMap, uv));
	#else
		return texture2D(shadowMap, uv).x;
	#endif
	}

	// view-space position
	#if NUM_SHADOW_SAMPLES > 1
	void getShadowMapCoord(in vec3 worldPos, in float viewZ, out vec4 coord, out vec2 softness)
	#else
	void getShadowMapCoord(in vec3 worldPos, in float viewZ, out vec4 coord)
	#endif
	{
		mat4 shadowMapMatrix = shadowMapMatrices[NUM_CASCADES - 1];

		#if NUM_CASCADES > 1
		for (int i = 0; i < NUM_CASCADES - 1; ++i) {
			if (viewZ < splitDistances[i]) {
				shadowMapMatrix = shadowMapMatrices[i];
				#if NUM_SHADOW_SAMPLES > 1
					softness = shadowMapSoftnesses[i];
				#endif
				break;
			}
		}
		#else
			shadowMapMatrix = shadowMapMatrices[0];
			#if NUM_SHADOW_SAMPLES > 1
				softness = shadowMapSoftnesses[0];
			#endif
		#endif
		coord = shadowMapMatrix * vec4(worldPos, 1.0);
	}
#endif


// all hx_calculateLight functions need to be the same
vec3 hx_calculateLight(vec3 diffuseAlbedo, vec3 normal, vec3 lightDir, vec3 worldViewVector, vec3 normalSpecularReflectance, float roughness, float metallicness)
{
// start extractable code (for fwd)
	vec3 diffuseReflection;
	vec3 specularReflection;

	hx_lighting(normal, lightDir, worldViewVector, lightColor, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);

	diffuseReflection *= diffuseAlbedo * (1.0 - metallicness);
	vec3 totalReflection = diffuseReflection + specularReflection;

	#ifdef CAST_SHADOWS
		float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
		float viewZ = -depth * hx_cameraFrustumRange;
		vec3 worldPos = hx_cameraWorldPosition + viewZ * worldViewVector;

		vec4 shadowMapCoord;
		#if NUM_SHADOW_SAMPLES > 1
			vec2 radii;
			getShadowMapCoord(worldPos, -viewZ, shadowMapCoord, radii);
			float shadowTest = 0.0;
			vec4 dither = texture2D(hx_dither2D, uv * hx_dither2DTextureScale);
			dither *= radii.xxyy;  // add radius scale
			for (int i = 0; i < NUM_SHADOW_SAMPLES; ++i) {
				vec2 offset;
				offset.x = dot(dither.xy, hx_poissonDisk[i]);
				offset.y = dot(dither.zw, hx_poissonDisk[i]);
				float shadowSample = readDepth(shadowMapCoord.xy + offset);
				float diff = shadowMapCoord.z - shadowSample;
				if (diff < depthBias) diff = -1.0;
				shadowTest += float(diff < 0.0);
			}
			shadowTest /= float(NUM_SHADOW_SAMPLES);
		#else
			getShadowMapCoord(worldPos, -viewZ, shadowMapCoord);
			float shadowSample = readDepth(shadowMapCoord.xy);
			float diff = shadowMapCoord.z - shadowSample;
			if (diff < depthBias) diff = -1.0;
			float shadowTest = float(diff < 0.0);
		#endif
		totalReflection *= shadowTest;

	#endif

    return totalReflection;
}

void main()
{
	vec4 colorSample = hx_gammaToLinear(texture2D(hx_gbufferColor, uv));
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	vec3 normal = hx_decodeNormal(normalSample);
	vec3 normalSpecularReflectance;
	float roughness;
	float metallicness;

	hx_decodeReflectionData(colorSample, specularSample, normalSpecularReflectance, roughness, metallicness);

	vec3 normalizedWorldView = normalize(viewWorldDir);

	// hx_calculateLight must be the same for every object
	vec3 totalReflection = hx_calculateLight(colorSample.xyz, normal, lightWorldDirection, viewWorldDir, normalSpecularReflectance, roughness, metallicness);

	gl_FragColor = vec4(totalReflection, 0.0);

}