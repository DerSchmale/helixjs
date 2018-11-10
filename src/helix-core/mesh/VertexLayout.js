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
function VertexLayout(mesh, shader)
{
    this.attributes = [];
    this.morphPositionAttributes = [];
    this.morphNormalAttributes = [];
    this.mesh = mesh;
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
            streamIndex: attribute.streamIndex,
            normalized: attribute.normalized
        };

		// so in some cases, it occurs that - when attributes are optimized out by the driver - the indices don't change,
		// but those unused become -1, leaving gaps. This keeps the gaps so we can take care of them
		this.attributes[index] = attrib;
		this._numAttributes = Math.max(this._numAttributes, index + 1);

        // morph attributes are handled differently because their associated vertex buffers change dynamically
        // their state is uploaded by MeshInstance itself
        if (attribute.name.indexOf("hx_morphPosition") === 0) {
            this.morphPositionAttributes.push(attrib);
            attrib.external = true;
        }

        if (attribute.name.indexOf("hx_morphNormal") === 0) {
            this.morphNormalAttributes.push(attrib);
            attrib.external = true;
        }
    }

    // any instanced attribs that isn't managed by vertex layout
    var builtIn = ["hx_instanceMatrix0", "hx_instanceMatrix1", "hx_instanceMatrix2"];
    for (var i = 0; i < 3; ++i) {
        index = shader.getAttributeLocation(builtIn[i]);
		this._numAttributes = Math.max(this._numAttributes, index + 1);
    }

}

export { VertexLayout };