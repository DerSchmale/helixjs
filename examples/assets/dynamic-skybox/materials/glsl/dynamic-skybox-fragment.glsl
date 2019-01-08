uniform vec3 color;

HX_GeometryData hx_geometry()
{
    // we don't really need anything from here, everything is done in the lighting model
    HX_GeometryData data;
    data.color = vec4(1.0);
    data.normal = vec3(0.0);
    data.metallicness = 0.0;
    data.normalSpecularReflectance = 0.0;
    data.roughness = 0.0;
    data.occlusion = 0.0; // this causes probes not to affect the edges as much, just blends in nicely without requiring real (slow) blending
    data.emission = vec3(0.0);
    return data;
}