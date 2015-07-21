/**
 *
 * @param blurX
 * @param blurY
 * @constructor
 */
HX.SeparableGaussianBlurPass = function(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)
{
    if (forceSourceResolutionX)
        forceSourceResolutionY = forceSourceResolutionY || forceSourceResolutionX;
    inputTextureName = inputTextureName || "hx_source";

    kernelSize = Math.round(kernelSize);

    var vertex = HX.SeparableGaussianBlurPass.getVertexShader(kernelSize, directionX, directionY, forceSourceResolutionX, forceSourceResolutionY);
    var fragment = HX.SeparableGaussianBlurPass.getFragmentShader(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)

    HX.EffectPass.call(this, vertex, fragment);

    this._initWeights(kernelSize);
};

HX.SeparableGaussianBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.SeparableGaussianBlurPass.prototype._initWeights = function(kernelSize)
{
    var radius = Math.floor(kernelSize * .5);
    var weights = [];
    var gauss = HX.CenteredGaussianCurve.fromRadius(radius);
    for (var i = 0; i < kernelSize; ++i) {
        weights[i] = gauss.getValueAt(i - radius);
    }

    this.setUniformArray("gaussianWeights", new Float32Array(weights));
};



HX.GaussianBlurEffect = function(blurX, blurY)
{
    HX.Effect.call(this);
    this.addPass(new HX.SeparableGaussianBlurPass(blurX, 1, 0));
    this.addPass(new HX.SeparableGaussianBlurPass(blurY, 0, 1));
};

HX.GaussianBlurEffect.prototype = Object.create(HX.Effect.prototype);


/**
 *
 * @param blurX
 * @param blurY
 * @constructor
 */
HX.DirectionalBlurPass = function(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)
{
    kernelSize = Math.round(kernelSize);
    if (forceSourceResolutionX)
        forceSourceResolutionY = forceSourceResolutionY || forceSourceResolutionX;
    inputTextureName = inputTextureName || "hx_source";
    HX.EffectPass.call(this, HX.DirectionalBlurPass.getVertexShader(kernelSize, directionX, directionY), HX.DirectionalBlurPass.getFragmentShader(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY));
};

HX.DirectionalBlurPass.prototype = Object.create(HX.EffectPass.prototype);

HX.DirectionalBlurEffect = function(amount, directionX, directionY)
{
    HX.Effect.call(this);
    this.addPass(new HX.DirectionalBlurPass(amount, directionX, directionY));
};

HX.DirectionalBlurEffect.prototype = Object.create(HX.Effect.prototype);

HX.BoxBlurEffect = function(blurX, blurY)
{
    HX.Effect.call(this);
    this.addPass(new HX.DirectionalBlurPass(blurX, 1, 0));
    this.addPass(new HX.DirectionalBlurPass(blurY, 0, 1));
};

HX.BoxBlurEffect.prototype = Object.create(HX.Effect.prototype);

HX.DirectionalBlurPass.getVertexShader = function(kernelSize, directionX, directionY, forceSourceResolutionX, forceSourceResolutionY)
{
    var sourceRes;

    if (forceSourceResolutionX)
        sourceRes = "vec2(float(" + forceSourceResolutionX + "), float(" + forceSourceResolutionY + "))";
    else
        sourceRes = "hx_renderTargetResolution";

    return  "#define SOURCE_RES " + sourceRes + "\n\
            #define NUM_SAMPLES " + Math.ceil(kernelSize/2) + "\n\
            #define DIRECTION vec2(" + directionX + ", " + directionY + ")\n\
    precision mediump float;\n\
    \n\
    attribute vec4 hx_position;\n\
    attribute vec2 hx_texCoord;\n\
    \n\
    varying vec2 uv;\n\
    \n" + (forceSourceResolutionX? "" : "uniform vec2 hx_renderTargetResolution;\n") + "\n\
    void main()\n\
    {\n\
            vec2 firstPixel = floor(hx_texCoord * SOURCE_RES - DIRECTION * float(NUM_SAMPLES));\
            uv = (firstPixel - .5) / SOURCE_RES;\n\
            gl_Position = hx_position;\n\
    }";
};

HX.DirectionalBlurPass.getFragmentShader = function(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)
{
    var sourceRes;

    if (forceSourceResolutionX)
        sourceRes = "vec2(float(" + forceSourceResolutionX + "), float(" + forceSourceResolutionY + "))";
    else
        sourceRes = "hx_renderTargetResolution";

    return  "#define SOURCE_RES " + sourceRes + "\n\
            #define NUM_SAMPLES " + Math.ceil(kernelSize/2) + "\n\
            #define DIRECTION vec2(" + 2.0 * directionX + ", " + 2.0 * directionY + ")\n\
            \n\
            varying vec2 uv;\n\
            \n" +
            (forceSourceResolutionX? "" : "uniform vec2 hx_renderTargetResolution;\n") +
            "\n\
            uniform sampler2D " + inputTextureName + ";\n\
            \n\
            void main()\n\
            {\n\
                vec4 total = vec4(0.0);\n\
                vec2 sampleUV = uv;\n\
                vec2 stepSize = DIRECTION / SOURCE_RES;\n\
                for (int i = 0; i < NUM_SAMPLES; ++i) {\n\
                    total += texture2D(" + inputTextureName + ", sampleUV);\n\
                    sampleUV += stepSize;\n\
                }\n\
                gl_FragColor = total / float(NUM_SAMPLES);\n\
            \n\
            }";
};

HX.SeparableGaussianBlurPass.getVertexShader = function(kernelSize, directionX, directionY, forceSourceResolutionX, forceSourceResolutionY)
{
    var sourceRes;

    if (forceSourceResolutionX)
        sourceRes = "vec2(float(" + forceSourceResolutionX + "), float(" + forceSourceResolutionY + "))";
    else
        sourceRes = "hx_renderTargetResolution";

    return  "#define SOURCE_RES " + sourceRes + "\n\
             #define RADIUS float(" + Math.ceil(kernelSize * .5) + ")\n\
             #define DIRECTION vec2(" + directionX + ", " + directionY + ")\n\
    precision mediump float;\n\
    \n\
    attribute vec4 hx_position;\n\
    attribute vec2 hx_texCoord;\n\
    \n\
    varying vec2 uv;\n\
    \n" + (forceSourceResolutionX? "" : "uniform vec2 hx_renderTargetResolution;\n") + "\n\
    void main()\n\
    {\n\
            uv = hx_texCoord - RADIUS * DIRECTION / SOURCE_RES;\n\
            gl_Position = hx_position;\n\
    }";
};

HX.SeparableGaussianBlurPass.getFragmentShader = function(kernelSize, directionX, directionY, inputTextureName, forceSourceResolutionX, forceSourceResolutionY)
{
    var sourceRes;

    if (forceSourceResolutionX)
        sourceRes = "vec2(float(" + forceSourceResolutionX + "), float(" + forceSourceResolutionY + "))";
    else
        sourceRes = "hx_renderTargetResolution";

    return  "#define SOURCE_RES " + sourceRes + "\n\
            #define NUM_SAMPLES " + kernelSize + "\n\
            #define DIRECTION vec2(" + directionX + ", " + directionY + ")\n\
            \n\
            varying vec2 uv;\n\
            \n" +
            (forceSourceResolutionX? "" : "uniform vec2 hx_renderTargetResolution;\n") +
            "\n\
            uniform sampler2D " + inputTextureName + ";\n\
            \n\
            uniform float gaussianWeights[NUM_SAMPLES];\n\
            \n\
            void main()\n\
            {\n\
                vec4 total = vec4(0.0);\n\
                vec2 sampleUV = uv;\n\
                vec2 stepSize = DIRECTION / SOURCE_RES;\n\
                float totalWeight = 0.0;\n\
                for (int i = 0; i < NUM_SAMPLES; ++i) {\n\
                    total += texture2D(" + inputTextureName + ", sampleUV) * gaussianWeights[i];\n\
                    sampleUV += stepSize;\n\
                }\n\
                gl_FragColor = total;\n\
            \n\
            }";
};