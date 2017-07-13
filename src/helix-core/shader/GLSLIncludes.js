import {ShaderLibrary} from "./ShaderLibrary";

/**
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
export var GLSLIncludes = {

    GENERAL:
        "precision highp float;\n\n" +
        ShaderLibrary.get("snippets_general.glsl") + "\n\n"
};