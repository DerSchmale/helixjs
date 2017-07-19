import {capabilities} from "../Helix";
import {MaterialPass} from "../material/MaterialPass";
import {GL} from "../core/GL";
import {VertexLayout} from "./VertexLayout";

/**
 * @classdesc
 * MeshInstance allows bundling a {@linkcode Mesh} with a {@linkcode Material} for rendering, allowing both the geometry
 * and materials to be shared regardless of the combination of both. MeshInstance is managed by {@linkcode ModelInstance}
 * internally and should never be created manually.
 *
 * @constructor
 * @param mesh The {@linkcode Mesh} providing the geometry for this instance.
 * @param material The {@linkcode Material} to use to render the given Mesh.
 *
 * @author derschmale <http://www.derschmale.com>
 */
function MeshInstance(mesh, material)
{
    this._mesh = mesh;
    this._meshMaterialLinkInvalid = false;
    this._vertexLayouts = null;
    this._visible = true;

    if (mesh.hasMorphData) {
        this._morphTargets = [];
        var w = [];
        for (var i = 0; i < capabilities.NUM_MORPH_TARGETS; ++i) {
            w[i] = 0;
        }
        this._morphWeights = new Float32Array(w);
    }

    this.material = material;
}

MeshInstance.prototype = {
    /**
     * Defines whether this MeshInstance should be rendered or not.
     */
    get visible()
    {
        return this._visible;
    },

    set visible(value)
    {
        this._visible = value;
    },

    /**
     * The {@linkcode Mesh} providing the geometry for this instance
     */
    get mesh()
    {
        return this._mesh;
    },

    /**
     * @ignore
     */
    setMorphTarget: function(targetIndex, vertexBuffer, weight)
    {
        this._morphTargets[targetIndex] = vertexBuffer;
        this._morphWeights[targetIndex] = vertexBuffer? weight : 0.0;
    },

    /**
     * The {@linkcode Material} used to render the Mesh.
     */
    get material()
    {
        return this._material;
    },

    set material(value)
    {
        if (this._material)
            this._material.onChange.unbind(this._onMaterialChange);

        this._material = value;

        if (this._material) {
            this._material.onChange.bind(this._onMaterialChange, this);

            this.material._setUseSkinning(this._material._useSkinning || !!this._mesh._model.skeleton);
            this.material._setUseMorphing(this._material._useMorphing || this._mesh.hasMorphData);
        }

        this._meshMaterialLinkInvalid = true;
    },

    /**
     * Sets state for this mesh/material combination.
     * @param passType
     * @ignore
     */
    updateRenderState: function(passType)
    {
        if (this._meshMaterialLinkInvalid)
            this._linkMeshWithMaterial();


        var vertexBuffers = this._mesh._vertexBuffers;
        this._mesh._indexBuffer.bind();

        var layout = this._vertexLayouts[passType];
        var morphAttributes = layout.morphAttributes;
        var len = morphAttributes.length;
        var attribute;
        var gl = GL.gl;

        for (var i = 0; i < len; ++i) {
            attribute = morphAttributes[i];
            var buffer = this._morphTargets[i] || this._mesh._defaultMorphTarget;
            buffer.bind();
            gl.vertexAttribPointer(attribute.index, attribute.numComponents, gl.FLOAT, false, attribute.stride, attribute.offset);
        }

        var attributes = layout.attributes;
        len = layout._numAttributes;

        GL.enableAttributes(layout._numAttributes);

        for (i = 0; i < len; ++i) {
            attribute = attributes[i];

            if (attribute) {
                vertexBuffers[attribute.streamIndex].bind();
                gl.vertexAttribPointer(i, attribute.numComponents, gl.FLOAT, false, attribute.stride, attribute.offset);
            }
            else {
                GL.gl.disableVertexAttribArray(i);
            }
        }
    },

    /**
     * @ignore
     * @private
     */
    _initVertexLayouts: function()
    {
        this._vertexLayouts = new Array(MaterialPass.NUM_PASS_TYPES);
        for (var type = 0; type < MaterialPass.NUM_PASS_TYPES; ++type) {
            var pass = this._material.getPass(type);
            if (pass)
                this._vertexLayouts[type] = new VertexLayout(this._mesh, pass);
        }
    },

    /**
     * @ignore
     * @private
     */
    _linkMeshWithMaterial: function()
    {
        this._initVertexLayouts();

        this._meshMaterialLinkInvalid = false;
    },

    /**
     * @ignore
     * @private
     */
    _onMaterialChange: function()
    {
        this._meshMaterialLinkInvalid = true;
    }
};


export { MeshInstance };