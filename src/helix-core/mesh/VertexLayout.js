/**
 * ModelInstan
 * @param mesh
 * @param pass
 * @constructor
 */
HX.VertexLayout = function(mesh, pass)
{
    var shader = pass.getShader();
    this.attributes = [];

    this._numAttributes = -1;

    for (var i = 0; i < mesh.numVertexAttributes; ++i) {
        var attribute = mesh.getVertexAttribute(i);
        var index = shader.getAttributeLocation(attribute.name);

        this._numAttributes = Math.max(this._numAttributes, index + 1);

        // convert offset and stride to bytes
        if (index >= 0) {
            var stride = mesh.getVertexStride(attribute.streamIndex);
            // convert to bytes
            this.attributes.push({
                index: index,
                offset: attribute.offset * 4,
                numComponents: attribute.numComponents,
                stride: stride * 4,
                streamIndex: attribute.streamIndex
            });
        }

    }
};

HX.VertexLayout.prototype =
{
    constructor: HX.VertexLayout
};
