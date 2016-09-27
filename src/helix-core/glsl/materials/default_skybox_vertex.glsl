attribute vec4 hx_position;

uniform vec3 hx_cameraWorldPosition;
uniform float hx_cameraFarPlaneDistance;
uniform mat4 hx_viewProjectionMatrix;

varying vec3 viewWorldDir;

// using 2D quad for rendering skyboxes rather than 3D cube causes jittering of the skybox
void hx_geometry()
{
    viewWorldDir = hx_position.xyz;
    vec4 pos = hx_position;
    // use a decent portion of the frustum to prevent FP issues
    pos.xyz = pos.xyz * hx_cameraFarPlaneDistance + hx_cameraWorldPosition;
    pos = hx_viewProjectionMatrix * pos;
    // make sure it's drawn behind everything else, so z = 1.0
    pos.z = pos.w;
    gl_Position = pos;
}

