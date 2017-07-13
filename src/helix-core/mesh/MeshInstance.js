/**
 * MeshInstance represents a mesh/material combination as it appears on a scene
 * @param mesh
 * @param material
 * @constructor
 */
import {capabilities} from "../Helix";
import {MaterialPass} from "../material/MaterialPass";
import {GL} from "../core/GL";
import {VertexLayout} from "./VertexLayout";

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
};

MeshInstance.prototype = {
    get visible()
    {
        return this._visible;
    },

    set visible(value)
    {
        this._visible = value;
    },

    setMorphTarget: function(targetIndex, vertexBuffer, weight)
    {
        this._morphTargets[targetIndex] = vertexBuffer;
        this._morphWeights[targetIndex] = vertexBuffer? weight : 0.0;
    },

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
        len = attributes.length;

        for (i = 0; i < len; ++i) {
            attribute = attributes[i];
            vertexBuffers[attribute.streamIndex].bind();
            gl.vertexAttribPointer(attribute.index, attribute.numComponents, gl.FLOAT, false, attribute.stride, attribute.offset);
        }

        GL.enableAttributes(layout._numAttributes);
    },

    _initVertexLayouts: function()
    {
        this._vertexLayouts = new Array(MaterialPass.NUM_PASS_TYPES);
        for (var type = 0; type < MaterialPass.NUM_PASS_TYPES; ++type) {
            var pass = this._material.getPass(type);
            if (pass)
                this._vertexLayouts[type] = new VertexLayout(this._mesh, pass);
        }
    },

    _linkMeshWithMaterial: function()
    {
        this._initVertexLayouts();

        this._meshMaterialLinkInvalid = false;
    },

    _onMaterialChange: function()
    {
        this._meshMaterialLinkInvalid = true;
    }
};


export { MeshInstance };