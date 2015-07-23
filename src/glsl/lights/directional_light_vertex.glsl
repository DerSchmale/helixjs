varying vec2 uv;
varying vec3 viewWorldDir;

void main()
{
	uv = hx_texCoord;
	#ifdef CAST_SHADOWS
		vec4 unproj = hx_inverseProjectionMatrix * vec4(hx_position.xy, 0.0, 1.0);
		vec3 viewDir = unproj.xyz / unproj.w;
		viewDir /= viewDir.z;
		viewWorldDir = mat3(hx_cameraWorldMatrix) * viewDir;
	#else
		vec4 unproj = hx_inverseViewProjectionMatrix * vec4(hx_position.xy, 0.0, 1.0);
		unproj /= unproj.w;
		viewWorldDir = unproj.xyz - hx_cameraWorldPosition;
	#endif
	gl_Position = hx_position;
}