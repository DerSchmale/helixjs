/**
 *
 * @param numSamples
 * @param range
 * @constructor
 */
HX.ScreenSpaceReflections = function(numSamples)
{
    HX.Effect.call(this);
    numSamples = numSamples || 5;
    this._numSamples = numSamples;

    var defines = {
        NUM_SAMPLES: numSamples
    };

    var vertexShader = HX.ShaderLibrary.get("ssr_vertex.glsl", defines);
    var fragmentShader = HX.ShaderLibrary.get("ssr_fragment.glsl", defines);

    var pass = new HX.EffectPass(vertexShader, fragmentShader);
    this.addPass(pass);
    this.stepSize = Math.max(500.0 / numSamples, 1.0);
    this.maxDistance = 500.0;
};

HX.ScreenSpaceReflections.prototype = Object.create(HX.Effect.prototype);


/**
 * Amount of pixels to skip per sample
 */
Object.defineProperty(HX.ScreenSpaceReflections.prototype, "stepSize", {
    get: function()
    {
        return this._stepSize;
    },

    set: function(value)
    {
        this._stepSize = value;
        this.setUniform("stepSize", value);
    }
});

Object.defineProperty(HX.ScreenSpaceReflections.prototype, "maxDistance", {
    get: function()
    {
        return this._stepSize;
    },

    set: function(value)
    {
        this._stepSize = value;
        this.setUniform("maxDistance", value);
    }
});
