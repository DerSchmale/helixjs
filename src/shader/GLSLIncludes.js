HX.GLSLIncludeGeneral =
    "precision mediump float;\n\n" +
    HX.ShaderLibrary.get("snippets_general.glsl") + "\n\n";

// TODO: Provide proper light model objects
HX.DEFERRED_LIGHT_MODEL = HX.ShaderLibrary.get("lighting_blinn_phong.glsl") + "\n\n";