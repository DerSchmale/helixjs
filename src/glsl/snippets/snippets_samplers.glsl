// defines predefined textures for use in fragment shaders

// Where the GBuffer is available for sampling:
uniform sampler2D hx_gbufferAlbedo;
uniform sampler2D hx_gbufferNormals;
uniform sampler2D hx_gbufferSpecular;
uniform sampler2D hx_gbufferDepth;

// for effects
uniform sampler2D hx_source;

// standard textures
uniform sampler2D hx_dither2D;