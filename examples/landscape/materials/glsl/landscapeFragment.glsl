varying vec4 worldPosition;
varying vec3 varTangentX;
varying vec3 varTangentZ;
varying vec2 detailUV;
varying vec2 largeUV;

uniform float specularNormalReflection;

uniform sampler2D grassLargeSampler;
uniform sampler2D rockLargeSampler;
uniform sampler2D detailSampler;
uniform sampler2D roughnessSampler;
uniform sampler2D grassDetailNormalSampler;
uniform sampler2D rockDetailNormalSampler;

uniform mat4 hx_viewMatrix;

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
    float bumps2 = snoise(coord / 50.0);

    return  mainFold * 200.0 +
    + generalHeight * generalHeight * 100.0
    + largeBumps * largeBumps * largeBumps * largeBumps * 30.0
    + bumps1 * 10.0
    + bumps2 * bumps2 * bumps2 * 5.0;
}

void main()
{
    vec3 worldPos = worldPosition.xyz;
    worldPos.y = calcWorldHeight(worldPos.xz);

    vec3 tangentX = normalize(varTangentX);
    vec3 tangentZ = normalize(varTangentZ);

    vec3 normal;

    normal.x = -tangentZ.z * tangentX.y;
    normal.y = tangentZ.z * tangentX.x;
    normal.z = -tangentZ.y * tangentX.x;

    mat3 TBN = mat3(tangentX, tangentZ, normal);

    vec4 detail = texture2D(detailSampler, detailUV);
    vec4 roughness = texture2D(roughnessSampler, largeUV);

    vec3 rockColor = texture2D(rockLargeSampler, largeUV).xyz * detail.y;
    vec3 snowColor = vec3(1.0, 1.0, 1.0);
    vec3 grassColor = texture2D(grassLargeSampler, largeUV).xyz * detail.x;
    float rockRoughness = .7 - .1 * roughness.y;
    float snowRoughness = .7 - pow((cos(sin(worldPos.x * 500.0 + worldPos.z * 500.0) * 50.0) * .5 + .5), 3.0) * .6;
    float grassRoughness = .6 - detail.x * .3;

    float grassFactor = hx_linearStep(10.0, -50.0, worldPos.y + snoise(worldPos.xz / 100.0) * 15.0);
    vec3 color = mix(snowColor, grassColor, grassFactor);

    float rockFactor = 1.0 - pow(normal.y, 5.0) - max(worldPos.y * .005, 0.0);
    rockFactor = hx_linearStep(.3, .7, rockFactor);
    color = mix(color, rockColor, rockFactor);

    float roughnessOut = mix(mix(snowRoughness, grassRoughness, grassFactor), rockRoughness, rockFactor);

    vec3 grassNormal = texture2D(grassDetailNormalSampler, detailUV).xyz * 2.0 - 1.0;
    vec3 rockNormal = texture2D(rockDetailNormalSampler, largeUV).xyz * 2.0 - 1.0;
    vec3 snowNormal = vec3(0.0, 0.0, 1.0);
    vec3 compNormal = mix(snowNormal, grassNormal, grassFactor);
    compNormal = mix(compNormal, rockNormal, rockFactor);

    compNormal = normalize(compNormal);

    compNormal = TBN * compNormal;
    compNormal = mat3(hx_viewMatrix) * compNormal;

    hx_processGeometry(hx_gammaToLinear(vec4(color, 1.0)), compNormal, 0.0, specularNormalReflection, roughnessOut, 1.0, linearDepth);
}