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

    mesh.onLayoutChanged.bind(this._onMaterialOrMeshChange, this);

    if (mesh.hasMorphData) {
        this._morphPositions = [];

        var numMorphs = 8;

        if (mesh.hasMorphNormals) {
            this._morphNormals = [];
            numMorphs = 4;
        }

        this._morphWeights = new Float32Array(numMorphs);

        for (var i = 0; i < numMorphs; ++i) {
            this._morphWeights[i] = 0;
        }
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
    setMorphTarget: function(targetIndex, positionBuffer, normalBuffer, weight)
    {
        if (targetIndex >= this._morphWeights.length) return;

        this._morphPositions[targetIndex] = positionBuffer;
        if (normalBuffer && this._morphNormals)
            this._morphNormals[targetIndex] = normalBuffer;

        this._morphWeights[targetIndex] = positionBuffer? weight : 0.0;
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
            this._material.onChange.unbind(this._onMaterialOrMeshChange);

        this._material = value;

        if (this._material) {
            this._material.onChange.bind(this._onMaterialOrMeshChange, this);

            this._material._setUseSkinning(/*this._material._useSkinning || */!!this._mesh._model.skeleton);
            this._material._setUseMorphing(
                /*this._material._useMorphing || */this._mesh.hasMorphData,
                /*this._material._useNormalMorphing || */this._mesh.hasMorphNormals
            );
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
        var morphPosAttributes = layout.morphPositionAttributes;
        var morphNormalAttributes = layout.morphNormalAttributes;
        var attribute;
        var gl = GL.gl;

        var len = morphPosAttributes.length;

        for (var i = 0; i < len; ++i) {
            attribute = morphPosAttributes[i];
            var buffer = this._morphPositions[i] || this._mesh._defaultMorphTarget;
            buffer.bind();

            gl.vertexAttribPointer(attribute.index, attribute.numComponents, gl.FLOAT, false, attribute.stride, attribute.offset);
        }

        if (this._morphNormals) {
            len = morphNormalAttributes.length;
            for (i = 0; i < len; ++i) {
                attribute = morphNormalAttributes[i];
                var buffer = this._morphNormals[i] || this._mesh._defaultMorphTarget;
                buffer.bind();

                gl.vertexAttribPointer(attribute.index, attribute.numComponents, gl.FLOAT, false, attribute.stride, attribute.offset);
            }
        }

        var attributes = layout.attributes;
        len = layout._numAttributes;

        GL.enableAttributes(layout._numAttributes);

        for (i = 0; i < len; ++i) {
            attribute = attributes[i];

            if (attribute) {
                // external = in case of morph targets etc
                if (!attribute.external) {
                    vertexBuffers[attribute.streamIndex].bind();
                    gl.vertexAttribPointer(i, attribute.numComponents, gl.FLOAT, false, attribute.stride, attribute.offset);
                }
            }
            else {
                GL.gl.disableVertexAttribArray(i);
                // there seem to be some bugs in ANGLE with disabling vertex attribute arrays, so bind a dummy instead
                // vertexBuffers[0].bind();
                // gl.vertexAttribPointer(i, 1, gl.FLOAT, false, 4, 0);
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
    _onMaterialOrMeshChange: function()
    {
        this._meshMaterialLinkInvalid = true;
    }
};


export { MeshInstance };