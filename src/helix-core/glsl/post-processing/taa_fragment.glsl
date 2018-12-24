varying_in vec2 uv;

uniform vec2 hx_rcpRenderTargetResolution;
uniform sampler2D hx_backBuffer;
uniform sampler2D historyBuffer;

uniform float alpha;
uniform float gamma;

void main()
{
	vec4 col = texture2D(hx_backBuffer, uv);
	vec3 c = col.xyz;   // "c"enter
	vec2 oldUV = hx_getPreviousFrameUV(uv);
	vec3 old = texture2D(historyBuffer, oldUV).xyz;
	float amount = alpha;

	// out of bounds: take new value completely
	if (oldUV.x < 0.0 || oldUV.x > 1.0 || oldUV.y < 0.0 || oldUV.y > 1.0)
	    amount = 1.0;

    // neighbourhood clamping: the old colour is only considered valid if it's within the bounds of the current neighbours
    // https://de45xmedrsdbp.cloudfront.net/Resources/files/TemporalAA_small-59732822.pdf [Karis2014]
    vec3 l = texture2D(hx_backBuffer, uv - vec2(hx_rcpRenderTargetResolution.x, 0.0)).xyz;
    vec3 r = texture2D(hx_backBuffer, uv + vec2(hx_rcpRenderTargetResolution.x, 0.0)).xyz;
    vec3 t = texture2D(hx_backBuffer, uv - vec2(0.0, hx_rcpRenderTargetResolution.y)).xyz;
    vec3 b = texture2D(hx_backBuffer, uv + vec2(0.0, hx_rcpRenderTargetResolution.y)).xyz;
    vec3 minBound = min(min(min(min(l, r), t), b), c);
    vec3 maxBound = max(max(max(max(l, r), t), b), c);

    // just treat rgb space as a regular 3D space
    if (any(lessThan(old, minBound)) || any(greaterThan(old, maxBound))) {
        // variance clipping
        // http://developer.download.nvidia.com/gameworks/events/GDC2016/msalvi_temporal_supersampling.pdf
        // moments
        vec3 m1 = l + r + t + b + c;
        vec3 m2 = l * l + r * r + t * t + b * b + c * c;
        // variance
        vec3 mu = m1 / 5.0;
        vec3 sigma = sqrt(m2 / 5.0 - mu * mu);

        vec3 d = c - old;

        // find relevant AABB planes (those closest to the ray, know this from ray direction)
        vec3 planes = mu - sign(d) * gamma * sigma;

        // clip to old AABB to make sure it's never bigger
        planes = max(planes, minBound);
        planes = min(planes, maxBound);


        // clip segment [old -> C] against new AABB
        // C is always inside AABB
        vec3 tm = (planes - old) / d;
        vec3 absD = abs(d);

        float t = 0.0;

        if (absD.x > 0.0003)
            t = max(tm.x, t);
        if (absD.y > 0.0003)
            t = max(tm.y, t);
        if (absD.z > 0.0003)
            t = max(tm.z, t);

        old += t * d;
    }

    hx_FragColor.xyz = mix(old, c, amount);
    hx_FragColor.w = col.w;
}