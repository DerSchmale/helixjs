uniform vec3 lightColor;
uniform vec3 lightWorldDirection;

#ifdef CAST_SHADOWS
	uniform sampler2D hx_gbufferDepth;
	uniform sampler2D shadowMap;

	uniform float hx_cameraFrustumRange;
	uniform float hx_cameraWorldPosition;

	uniform mat4 shadowMapMatrices[NUM_CASCADES];
	uniform float splitDistances[NUM_CASCADES];
	uniform float depthBias;

	#if NUM_SHADOW_SAMPLES > 1
		uniform vec2 hx_dither2DTextureScale;

		uniform vec2 shadowMapSoftnesses[NUM_CASCADES];
		uniform vec2 hx_poissonDisk[NUM_SHADOW_SAMPLES];
	#endif

	// view-space position
	#if NUM_SHADOW_SAMPLES > 1
	void getShadowMapCoord(in vec3 worldPos, in float viewZ, out vec4 coord, out vec2 softness)
	#else
	void getShadowMapCoord(in vec3 worldPos, in float viewZ, out vec4 coord)
	#endif
	{
		mat4 shadowMapMatrix = shadowMapMatrices[NUM_CASCADES - 1];

		for (int i = 0; i < NUM_CASCADES - 1; ++i) {
			if (viewZ < splitDistances[i]) {
				shadowMapMatrix = shadowMapMatrices[i];
				#if NUM_SHADOW_SAMPLES > 1
					softness = shadowMapSoftnesses[i];
				#endif
				break;
			}
		}
		coord = shadowMapMatrix * vec4(worldPos, 1.0);
	}
#endif


// all hx_calculateLight functions need to be the same
vec3 hx_calculateLight(vec3 diffuseAlbedo, vec3 normal, vec3 lightDir, vec3 worldViewVector, vec3 normalSpecularReflectance, float roughness, float metallicness)
{
// not sure what this is about?
	#ifdef CAST_SHADOWS
		normal = -normal;
	#endif

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
				float shadowSample = texture2D(shadowMap, shadowMapCoord.xy + offset).x;
				float diff = shadowMapCoord.z - shadowSample;
				if (diff < depthBias) diff = -1.0;
				shadowTest += float(diff < 0.0);
			}
			shadowTest /= float(NUM_SHADOW_SAMPLES);

		#else
			getShadowMapCoord(worldPos, -viewZ, shadowMapCoord);
			float shadowSample = texture2D(shadowMap, shadowMapCoord.xy).x;
			float diff = shadowMapCoord.z - shadowSample;
			if (diff < .005) diff = -1.0;
			float shadowTest = float(diff < 0.0);
		#endif
		totalReflection *= shadowTest;

	#endif

    return totalReflection;
}