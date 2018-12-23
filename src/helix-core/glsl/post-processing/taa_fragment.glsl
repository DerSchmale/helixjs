varying_in vec2 uv;

uniform vec2 hx_rcpRenderTargetResolution;
uniform sampler2D hx_backBuffer;
uniform sampler2D hx_motionVectorBuffer;
uniform sampler2D historyBuffer;

uniform float alpha;

void main()
{
    // TODO: remove jitter...
	vec2 velocity = hx_decodeMotionVector(texture2D(hx_motionVectorBuffer, uv));
	vec4 col = texture2D(hx_backBuffer, uv);
	vec2 oldUV = uv - velocity;
	vec4 old = texture2D(historyBuffer, oldUV);
	float amount = alpha;

	// out of bounds: take new value completely
	if (oldUV.x < 0.0 || oldUV.x > 1.0 || oldUV.y < 0.0 || oldUV.y > 1.0)
	    amount = 1.0;

    // neighbourhood clamping: the old colour is only considered valid if it's within the bounds of the current neighbours
    // https://de45xmedrsdbp.cloudfront.net/Resources/files/TemporalAA_small-59732822.pdf [Karis2014]
    vec4 l = texture2D(hx_backBuffer, uv - vec2(hx_rcpRenderTargetResolution.x, 0.0));
    vec4 r = texture2D(hx_backBuffer, uv + vec2(hx_rcpRenderTargetResolution.x, 0.0));
    vec4 t = texture2D(hx_backBuffer, uv - vec2(0.0, hx_rcpRenderTargetResolution.y));
    vec4 b = texture2D(hx_backBuffer, uv + vec2(0.0, hx_rcpRenderTargetResolution.y));
    vec3 minBound = min(min(min(l, r), t), b).xyz;
    vec3 maxBound = max(max(max(l, r), t), b).xyz;

    if (any(lessThan(old.xyz, minBound)) || any(greaterThan(old.xyz, maxBound)))
        amount = 1.0;

    hx_FragColor = mix(old, col, amount);
}