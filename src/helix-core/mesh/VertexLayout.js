/**
 * @classdesc
 * VertexLayout links the mesh's vertex attributes to a shader's attributes
 *
 * @param mesh
 * @param pass
 * @constructor
 *
 * @ignore
 *
 * @author derschmale <http://www.derschmale.com>
 */
function VertexLayout(mesh, pass)
{
    var shader = pass.getShader();
    this.attributes = [];
    this.morphAttributes = [];

    this._numAttributes = -1;

    for (var i = 0; i < mesh.numVertexAttributes; ++i) {
        var attribute = mesh.getVertexAttributeByIndex(i);
        var index = shader.getAttributeLocation(attribute.name);

        if (!(index >= 0)) continue;

        var stride = mesh.getVertexStride(attribute.streamIndex);
        var attrib = {
            index: index,
            offset: attribute.offset * 4,
            external: false,
            numComponents: attribute.numComponents,
            stride: stride * 4,
            streamIndex: attribute.streamIndex
        };

        // morph attributes are handled differently because their associated vertex buffers change dynamically
        if (attribute.name.indexOf("hx_morph") === 0) {
            this.morphAttributes.push(attrib);
            attrib.external = true;
        }

        // so in some cases, it occurs that - when attributes are optimized out by the driver - the indices don't change,
        // but those unused become -1, leaving gaps. This keeps the gaps so we can take care of them
        this.attributes[index] = attrib;

        this._numAttributes = Math.max(this._numAttributes, index + 1);
    }
}

export { VertexLayout };