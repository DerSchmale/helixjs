/**
 * VertexLayout links the mesh's vertex attributes to a shader's attributes
 * @param mesh
 * @param pass
 * @constructor
 */
HX.VertexLayout = function(mesh, pass)
{
    var shader = pass.getShader();
    this.attributes = [];
    this.morphAttributes = [];

    this._numAttributes = -1;

    for (var i = 0; i < mesh.numVertexAttributes; ++i) {
        var attribute = mesh.getVertexAttribute(i);
        var index = shader.getAttributeLocation(attribute.name);
        if (!(index >= 0)) continue;

        var stride = mesh.getVertexStride(attribute.streamIndex);
        var attrib = {
            index: index,
            offset: attribute.offset * 4,
            numComponents: attribute.numComponents,
            stride: stride * 4,
            streamIndex: attribute.streamIndex
        };

        // morph attributes are handled differently because their associated vertex buffers change dynamically
        if (attribute.name.indexOf("hx_morph") === 0)
            this.morphAttributes.push(attrib);
        else
            this.attributes.push(attrib);

        this._numAttributes = Math.max(this._numAttributes, index + 1);


    }
};

HX.VertexLayout.prototype =
{
    constructor: HX.VertexLayout
};
