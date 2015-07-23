varying vec2 uv;
varying vec3 viewWorldDir;

uniform vec3 lightColor;
uniform vec3 lightWorldDirection;

#ifdef CAST_SHADOWS
	uniform sampler2D shadowMap;

	uniform mat4 shadowMapMatrices[NUM_CASCADES];
	uniform float splitDistances[NUM_CASCADES];
	uniform float depthBias;

	#if NUM_SHADOW_SAMPLES > 1
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
				#ifdef NUM_SHADOW_SAMPLES
					softness = shadowMapSoftnesses[i];
				#endif
				break;
			}
		}
		coord = shadowMapMatrix * vec4(worldPos, 1.0);
	}
#endif

void main()
{
	vec4 albedoSample = texture2D(hx_gbufferAlbedo, uv);
	vec4 normalSample = texture2D(hx_gbufferNormals, uv);
	vec4 specularSample = texture2D(hx_gbufferSpecular, uv);
	vec3 normal = normalize(normalSample.xyz - .5);
	vec3 normalSpecularReflectance;

	albedoSample = hx_gammaToLinear(albedoSample);
	vec3 normalizedWorldView = normalize(viewWorldDir);
	#ifdef NUM_CASCADES
		normalizedWorldView = -normalizedWorldView;
	#endif

	float roughness;
	hx_decodeReflectionData(albedoSample, specularSample, normalSpecularReflectance, roughness);
	vec3 diffuseReflection;
	vec3 specularReflection;
	hx_lighting(normal, lightWorldDirection, normalizedWorldView, lightColor, normalSpecularReflectance, roughness, diffuseReflection, specularReflection);
	diffuseReflection *= albedoSample.xyz * (1.0 - specularSample.x);
	vec3 totalReflection = diffuseReflection + specularReflection;

	#ifdef NUM_CASCADES
		float depth = hx_sampleLinearDepth(hx_gbufferDepth, uv);
		float viewZ = -depth * hx_cameraFrustumRange;
		vec3 worldPos = hx_cameraWorldPosition + viewZ * viewWorldDir;

		vec4 shadowMapCoord;
		#ifdef NUM_SHADOW_SAMPLES
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

	gl_FragColor = vec4(totalReflection, 0.0);
}