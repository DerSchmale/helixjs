attribute vec4 hx_position;
attribute vec2 hx_texCoord;

varying vec2 uv;
varying vec3 viewWorldDir;

#ifdef CAST_SHADOWS
uniform mat4 hx_inverseProjectionMatrix;
uniform mat4 hx_cameraWorldMatrix;
#else
uniform mat4 hx_inverseViewProjectionMatrix;
uniform vec3 hx_cameraWorldPosition;
#endif

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