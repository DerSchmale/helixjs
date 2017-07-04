import {ShaderLibrary} from "./ShaderLibrary";

export var GLSLIncludes = {

    GENERAL:
        "precision highp float;\n\n" +
        ShaderLibrary.get("snippets_general.glsl") + "\n\n"
};