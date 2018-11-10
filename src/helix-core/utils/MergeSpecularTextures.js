import {Texture2D} from "../texture/Texture2D";
import {FrameBuffer} from "../texture/FrameBuffer";
import {GL} from "../core/GL";
import {Color} from "../core/Color";
import {DEFAULTS} from "../Helix";
import {RectMesh} from "../mesh/RectMesh";

/**
 * MergeSpecularTextures is a utility that generates a single roughness/normalSpecularReflection/metallicness texture
 * from 3 (optionally) provided separate textures.
 *
 * @namespace
 *
 * @author derschmale <http://www.derschmale.com>
 */
export var MergeSpecularTextures =
{
    /**
     * Merges the 3 provided specular textures into a single one for use with {@linkcode BasicMaterial}.
     * @param {Texture2D} [roughness] The texture containing monochrome roughness data
     * @param {Texture2D} [normalSpecular] The texture containing monochrome normal specular reflection data
     * @param {Texture2D} [metallicness] The texture containing monochrome normal metallicness reflection data
     * @returns {Texture2D} A texture containing (roughness, normalSpecular, metallicness) on (r,g,b) respectively
     */
    merge: function(roughness, normalSpecular, metallicness)
    {
        var tex = new Texture2D();
        tex.initEmpty(roughness.width, roughness.height);
        var fbo = new FrameBuffer(tex);
        GL.setRenderTarget(fbo);
        GL.setClearColor(Color.WHITE);
        GL.clear();

        var gl = GL.gl;

        if (roughness) {
            gl.colorMask(true, false, false, false);
            DEFAULTS.COPY_SHADER.execute(roughness);
        }

        if (normalSpecular) {
            gl.colorMask(false, true, false, false);
            DEFAULTS.COPY_SHADER.execute(normalSpecular);
        }

        if (metallicness) {
            gl.colorMask(false, false, true, false);
            DEFAULTS.COPY_SHADER.execute(metallicness);
        }

        gl.colorMask(true, true, true, true);
        GL.setRenderTarget(null);
        GL.setClearColor(Color.BLACK);

        return tex;
    }
};