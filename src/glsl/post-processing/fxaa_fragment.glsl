varying vec2 uv;

uniform sampler2D hx_source;
uniform vec2 hx_rcpRenderTargetResolution;
uniform float edgeThreshold;
uniform float edgeThresholdMin;
uniform float edgeSharpness;

float luminanceHint(vec4 color)
{
	return .30/.59 * color.r + color.g;
}

void main()
{
	vec4 center = texture2D(hx_source, uv);
	vec2 halfRes = vec2(hx_rcpRenderTargetResolution.x, hx_rcpRenderTargetResolution.y) * .5;
	float topLeftLum = luminanceHint(texture2D(hx_source, uv + vec2(-halfRes.x, halfRes.y)));
	float bottomLeftLum = luminanceHint(texture2D(hx_source, uv + vec2(-halfRes.x, -halfRes.y)));
	float topRightLum = luminanceHint(texture2D(hx_source, uv + vec2(halfRes.x, halfRes.y)));
	float bottomRightLum = luminanceHint(texture2D(hx_source, uv + vec2(halfRes.x, -halfRes.y)));

	float centerLum = luminanceHint(center);
	float minLum = min(min(topLeftLum, bottomLeftLum), min(topRightLum, bottomRightLum));
	float maxLum = max(max(topLeftLum, bottomLeftLum), max(topRightLum, bottomRightLum));
	float range = max(centerLum, maxLum) - min(centerLum, minLum);
	float threshold = max(edgeThresholdMin, maxLum * edgeThreshold);
	float applyFXAA = range < threshold? 0.0 : 1.0;

	float diagDiff1 = bottomLeftLum - topRightLum;
	float diagDiff2 = bottomRightLum - topLeftLum;
	vec2 dir1 = normalize(vec2(diagDiff1 + diagDiff2, diagDiff1 - diagDiff2));
	vec4 sampleNeg1 = texture2D(hx_source, uv - halfRes * dir1);
	vec4 samplePos1 = texture2D(hx_source, uv + halfRes * dir1);

	float minComp = min(abs(dir1.x), abs(dir1.y)) * edgeSharpness;
	vec2 dir2 = clamp(dir1.xy / minComp, -2.0, 2.0) * 2.0;
	vec4 sampleNeg2 = texture2D(hx_source, uv - hx_rcpRenderTargetResolution * dir2);
	vec4 samplePos2 = texture2D(hx_source, uv + hx_rcpRenderTargetResolution * dir2);
	vec4 tap1 = sampleNeg1 + samplePos1;
	vec4 fxaa = (tap1 + sampleNeg2 + samplePos2) * .25;
	float fxaaLum = luminanceHint(fxaa);
	if ((fxaaLum < minLum) || (fxaaLum > maxLum))
		fxaa = tap1 * .5;
	gl_FragColor = mix(center, fxaa, applyFXAA);
}