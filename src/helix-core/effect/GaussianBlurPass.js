/**
 * @constructor
 */
HX.GaussianBlurPass = function(radius)
{
    radius = Math.floor(radius);

    this._initWeights(radius);

    var defines = {
        RADIUS: radius,
        NUM_WEIGHTS: radius + 1
    };

    var vertex = HX.ShaderLibrary.get("gaussian_blur_vertex.glsl", defines);
    var fragment = HX.ShaderLibrary.get("gaussian_blur_fragment.glsl", defines);

    HX.EffectPass.call(this, vertex, fragment);

    this.setUniformArray("gaussianWeights", new Float32Array(this._weights));
};

HX.GaussianBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.GaussianBlurPass.prototype._initWeights = function(radius)
{
    this._weights = [];

    var gaussian = HX.CenteredGaussianCurve.fromRadius(radius, .01);

    var total = 0;
    for (var j = 0; j <= radius; ++j) {
        this._weights[j] = gaussian.getValueAt(j);
        total += j > 0? this._weights[j] * 2.0 : 1.0;
    }

    total = 1.0 / total;

    for (j = 0; j <= radius; ++j) {
        this._weights[j] *= total;
    }
};