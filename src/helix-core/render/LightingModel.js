import { ShaderLibrary } from '../shader/ShaderLibrary';

/**
 * <p>LightingModel defines a lighting model to be used by a {@Material}. A default lighting model can be assigned to
 * {@linkcode InitOptions#defaultLightingModel}, which will mean any material will use it by default. </p>
 *
 * <p>You can add pass your own lighting models as a string into a material, as long as the glsl code contains the
 * hx_brdf function</p>
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 *
 */
export var LightingModel =
{
    /** No lighting applied when rendering */
    Unlit: null,
    /** Normalized Blinn-Phong shading applied */
    BlinnPhong: ShaderLibrary.get("lighting_blinn_phong.glsl"),
    /** GGX shading applied */
    GGX: ShaderLibrary.get("lighting_ggx.glsl"),
    /** Full GGX shading applied (includes visibility term) */
    GGX_FULL: "#define HX_VISIBILITY_TERM\n" + ShaderLibrary.get("lighting_ggx.glsl"),
    /** Empty brdf */
    DEBUG: ShaderLibrary.get("lighting_debug.glsl")
};