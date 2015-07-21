/**
 *
 * @constructor
 */
HX.FXAAPass = function()
{
    HX.EffectPass.call(this, null, HX.FXAAPass._fragmentShader);
};

HX.FXAAPass.prototype = Object.create(HX.EffectPass.prototype);

HX.FXAA = function()
{
    HX.Effect.call(this);
    this.addPass(new HX.FXAAPass());
    this.setUniform("edgeThreshold", 1/8);
    this.setUniform("edgeThresholdMin", 1/16);
    this.setUniform("edgeSharpness", 4.0);
};

HX.FXAA.prototype = Object.create(HX.Effect.prototype);

HX.FXAAPass._fragmentShader = "\
        varying vec2 uv;\n\
        \n\
        uniform sampler2D hx_source;\n\
        uniform vec2 hx_rcpRenderTargetResolution;\n\
        uniform float edgeThreshold;\n\
        uniform float edgeThresholdMin;\n\
        uniform float edgeSharpness;\n\
        \n\
        float luminanceHint(vec4 color)\n\
        {\n\
            return .30/.59 * color.r + color.g;\n\
        }\n\
        \n\
        void main()\n\
        {\n\
            vec4 center = texture2D(hx_source, uv);\n\
            vec2 halfRes = vec2(hx_rcpRenderTargetResolution.x, hx_rcpRenderTargetResolution.y) * .5;\n\
            float topLeftLum = luminanceHint(texture2D(hx_source, uv + vec2(-halfRes.x, halfRes.y)));\n\
            float bottomLeftLum = luminanceHint(texture2D(hx_source, uv + vec2(-halfRes.x, -halfRes.y)));\n\
            float topRightLum = luminanceHint(texture2D(hx_source, uv + vec2(halfRes.x, halfRes.y)));\n\
            float bottomRightLum = luminanceHint(texture2D(hx_source, uv + vec2(halfRes.x, -halfRes.y)));\n\
            \n\
            float centerLum = luminanceHint(center);\n\
            float minLum = min(min(topLeftLum, bottomLeftLum), min(topRightLum, bottomRightLum));\n\
            float maxLum = max(max(topLeftLum, bottomLeftLum), max(topRightLum, bottomRightLum));\n\
            float range = max(centerLum, maxLum) - min(centerLum, minLum);\n\
            float threshold = max(edgeThresholdMin, maxLum * edgeThreshold);\n\
            float applyFXAA = range < threshold? 0.0 : 1.0;\n\
            \n\
            float diagDiff1 = bottomLeftLum - topRightLum;\n\
            float diagDiff2 = bottomRightLum - topLeftLum;\n\
            vec2 dir1 = normalize(vec2(diagDiff1 + diagDiff2, diagDiff1 - diagDiff2));\n\
            vec4 sampleNeg1 = texture2D(hx_source, uv - halfRes * dir1);\n\
            vec4 samplePos1 = texture2D(hx_source, uv + halfRes * dir1);\n\
            \n\
            float minComp = min(abs(dir1.x), abs(dir1.y)) * edgeSharpness;\n\
            vec2 dir2 = clamp(dir1.xy / minComp, -2.0, 2.0) * 2.0;\n\
            vec4 sampleNeg2 = texture2D(hx_source, uv - hx_rcpRenderTargetResolution * dir2);\n\
            vec4 samplePos2 = texture2D(hx_source, uv + hx_rcpRenderTargetResolution * dir2);\n\
            vec4 tap1 = sampleNeg1 + samplePos1;\n\
            vec4 fxaa = (tap1 + sampleNeg2 + samplePos2) * .25;\n\
            float fxaaLum = luminanceHint(fxaa);\n\
            if ((fxaaLum < minLum) || (fxaaLum > maxLum))\n\
                fxaa = tap1 * .5;\n\
            gl_FragColor = mix(center, fxaa, applyFXAA);\n\
        }";