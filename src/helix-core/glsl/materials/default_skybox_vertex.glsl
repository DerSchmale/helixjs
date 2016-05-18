attribute vec4 hx_position;

uniform mat4 hx_inverseViewProjectionMatrix;
uniform vec3 hx_cameraWorldPosition;

varying vec3 viewWorldDir;

// using 2D quad for rendering skyboxes rather than 3D cube
void main()
{
    vec4 unproj = hx_inverseViewProjectionMatrix * hx_position;
    viewWorldDir = unproj.xyz / unproj.w - hx_cameraWorldPosition;
    gl_Position = vec4(hx_position.xy, 1.0, 1.0);  // make sure it's drawn behind everything else, so z = 1.0
}