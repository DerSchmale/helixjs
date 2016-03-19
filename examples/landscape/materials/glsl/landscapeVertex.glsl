attribute vec4 hx_position;

uniform mat4 hx_viewProjectionMatrix;
uniform mat4 hx_worldMatrix;

varying vec4 worldPosition;
varying vec3 varTangentX;
varying vec3 varTangentZ;
varying vec2 detailUV;
varying vec2 largeUV;

vec3 mod289(vec3 x)
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x)
{
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x)
{
    return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v)
{
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
    0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
    -0.577350269189626,  // -1.0 + 2.0 * C.x
    0.024390243902439); // 1.0 / 41.0
    // First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

    // Other corners
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float calcWorldHeight(vec2 coord)
{
    float mainFold = snoise(coord / 2000.0);
    float generalHeight = snoise(coord / 500.0);
    float largeBumps = pow(snoise(coord / 200.0), 6.0);
    float bumps1 = pow(snoise(coord / 100.0), 6.0);

    return  mainFold * 200.0 +
    + generalHeight * generalHeight * 100.0
    + largeBumps * largeBumps * largeBumps * largeBumps * 30.0
    + bumps1 * 10.0;
}

void main()
{
    worldPosition = hx_worldMatrix * hx_position;
    vec3 neighbourPX = worldPosition.xyz;
    neighbourPX.x += 7.81;
    vec3 neighbourPZ = worldPosition.xyz;
    neighbourPZ.z += 7.81;
    vec3 neighbourNX = worldPosition.xyz;
    neighbourNX.x -= 7.81;
    vec3 neighbourNZ = worldPosition.xyz;
    neighbourNZ.z -= 7.81;

    worldPosition.y = calcWorldHeight(worldPosition.xz);
    neighbourPX.y = calcWorldHeight(neighbourPX.xz);
    neighbourNX.y = calcWorldHeight(neighbourNX.xz);
    neighbourPZ.y = calcWorldHeight(neighbourPZ.xz);
    neighbourNZ.y = calcWorldHeight(neighbourNZ.xz);

    gl_Position = hx_viewProjectionMatrix * worldPosition;
    largeUV = worldPosition.xz / 500.0;
    detailUV = worldPosition.xz / 10.0;

    varTangentX = neighbourPX - neighbourNX;
    varTangentZ = neighbourPZ - neighbourNZ;
}