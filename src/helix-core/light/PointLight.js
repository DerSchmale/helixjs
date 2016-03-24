/**
 *
 * @constructor
 */
HX.PointLight = function()
{
    HX.Light.call(this);

    // TODO: use geodesic sphere
    if (!HX.PointLight._initialized) {
        var sphere = HX.SpherePrimitive.createMeshData(
            {
                radius: 1.0,
                invert: true,
                numSegmentsW: HX.PointLight.SPHERE_SEGMENTS_W,
                numSegmentsH: HX.PointLight.SPHERE_SEGMENTS_H,
                uvs: false,
                normals: false,
                tangents: false
            });

        HX.PointLight._sphereMesh = new HX.Mesh(HX.MeshBatch.create(sphere, HX.PointLight.LIGHTS_PER_BATCH));
        HX.PointLight.NUM_SPHERE_INDICES = sphere._indexData.length;
        HX.PointLight._positionData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
        HX.PointLight._colorData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH * 3);
        HX.PointLight._radiusData = new Float32Array(HX.PointLight.LIGHTS_PER_BATCH);

        this._initLightPasses();

        HX.PointLight._initialized = true;
    }


    this._radius = 100.0;
    this.intensity = 3.1415;
};

HX.PointLight.LIGHTS_PER_BATCH = 20;
HX.PointLight.SPHERE_SEGMENTS_W = 16;
HX.PointLight.SPHERE_SEGMENTS_H = 10;
HX.PointLight.NUM_SPHERE_INDICES = -1;  // will be set on creation instead of passing value that might get invalidated

HX.PointLight.prototype = Object.create(HX.Light.prototype,
    {
        // radius is not physically correct, but invaluable for performance
        radius: {
            get: function() {
                return this._radius;
            },

            set: function(value) {
                this._radius = value;
                this._updateWorldBounds();
            }
        }
    });

// returns the index of the FIRST UNRENDERED light
HX.PointLight.prototype.renderBatch = function(lightCollection, startIndex, renderer)
{
    var end = startIndex + HX.PointLight.LIGHTS_PER_BATCH;
    if (end > lightCollection.length) end = lightCollection.length;

    HX.PointLight._lightPass.updateRenderState(renderer);

    var camera = renderer._camera;
    var posData = HX.PointLight._positionData;
    var colorData = HX.PointLight._colorData;
    var radiusData = HX.PointLight._radiusData;
    var pos = new HX.Float4();
    var viewMatrix = camera.viewMatrix;

    var v1i = 0, v3i = 0;

    for (var i = startIndex; i < end; ++i) {
        var light = lightCollection[i];
        if (light._type != this._type/* || light._renderOrderHint > 0*/) {
            end = i;
            break;
        }

        light.worldMatrix.getColumn(3, pos);
        viewMatrix.transformPoint(pos, pos);

        var color = light._scaledIrradiance;

        posData[v3i] = pos.x;
        colorData[v3i++] = color.r;
        posData[v3i] = pos.y;
        colorData[v3i++] = color.g;
        posData[v3i] = pos.z;
        colorData[v3i++] = color.b;
        // todo: lights behind camera become too big to render
        radiusData[v1i++] = light._radius * 1.0001; // add some padding to account for imperfect geometry
    }

    var vertexBuffers = HX.PointLight._sphereMesh._vertexBuffers;
    vertexBuffers[0].bind();
    HX_GL.vertexAttribPointer(HX.PointLight._positionAttrib, 3, HX_GL.FLOAT, false, 12, 0);
    vertexBuffers[1].bind();
    HX_GL.vertexAttribPointer(HX.PointLight._instanceAttrib, 1, HX_GL.FLOAT, false, 4, 0);
    HX_GL.uniform3fv(HX.PointLight._positionLocation, posData);
    HX_GL.uniform3fv(HX.PointLight._colorLocation, colorData);
    HX_GL.uniform1fv(HX.PointLight._lightRadiusLocation, radiusData);

    // TODO: Should only draw when depth sphere > depth scene
    // but should also use stencil buffer to mark when front sphere depth > depth scene, because then it doesn't light anything
    // however, stencil buffer is already used for lighting models etc :s
    // could we still reserve a bit somewhere?
    HX.setDepthTest(HX.Comparison.GREATER);
    HX.setCullMode(HX.CullMode.BACK);
    HX.drawElements(HX_GL.TRIANGLES, HX.PointLight.NUM_SPHERE_INDICES * (end - startIndex), 0);

    HX.setDepthTest(HX.Comparison.ALWAYS);

    return end;
};

HX.PointLight.prototype._createBoundingVolume = function()
{
    return new HX.BoundingSphere();
};

HX.PointLight.prototype._updateWorldBounds = function()
{
    this._worldBounds.setExplicit(this.worldMatrix.getColumn(3), this._radius);
};

HX.PointLight.prototype._initLightPasses =  function()
{
    var defines = {
        LIGHTS_PER_BATCH: HX.PointLight.LIGHTS_PER_BATCH
    };
    var pass = new HX.EffectPass(
        HX.ShaderLibrary.get("point_light_vertex.glsl", defines),
        HX.LIGHTING_MODEL.getGLSL() + HX.ShaderLibrary.get("point_light_fragment.glsl", defines)
    );

    pass.blendState = HX.BlendState.ADD;

    // do not use rect
    pass.setMesh(HX.PointLight._sphereMesh);

    HX.PointLight._positionAttrib = pass.getAttributeLocation("hx_position");
    HX.PointLight._instanceAttrib = pass.getAttributeLocation("hx_instanceID");
    HX.PointLight._lightPass = pass;
    HX.PointLight._positionLocation = pass.getUniformLocation("lightViewPosition[0]");
    HX.PointLight._colorLocation = pass.getUniformLocation("lightColor[0]");
    HX.PointLight._lightRadiusLocation = pass.getUniformLocation("lightRadius[0]");
};