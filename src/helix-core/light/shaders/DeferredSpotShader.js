import {ElementType, META, CullMode} from "../../Helix";
import {GL} from "../../core/GL";
import {Shader} from "../../shader/Shader";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Float4} from "../../math/Float4";
import {RectMesh} from "../../mesh/RectMesh";
import {ConePrimitive} from "../../mesh/primitives/ConePrimitive";

/**
 * @ignore
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DeferredSpotShader(useCone)
{
    Shader.call(this);
    this._useCone = useCone;

    var defines = {};

    if (useCone) {
        var primitive = new ConePrimitive({
            // overshoot a bit
            radius: 1.1,
            numSegmentsH: 1,
            alignment: ConePrimitive.ALIGN_Z
        });
        this._mesh = primitive.getMesh(0);
        defines.HX_CONE_MESH = 1;
    }

    var vertex =
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        META.OPTIONS.deferredLightingModel + "\n\n\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_spot_light_vertex.glsl", defines);
    var fragment =
        ShaderLibrary.get("snippets_geometry.glsl") + "\n" +
        META.OPTIONS.deferredLightingModel + "\n\n\n" +
        ShaderLibrary.get("spot_light.glsl") + "\n" +
        ShaderLibrary.get("deferred_spot_light_fragment.glsl", defines);

    this.init(vertex, fragment);

    var gl = GL.gl;
    var p = this._program;
    gl.useProgram(p);

    this._colorLocation = gl.getUniformLocation(p, "hx_spotLight.color");
    this._posLocation = gl.getUniformLocation(p, "hx_spotLight.position");
    this._radiusLocation = gl.getUniformLocation(p, "hx_spotLight.radius");
    this._dirLocation = gl.getUniformLocation(p, "hx_spotLight.direction");
    this._rcpRadiusLocation = gl.getUniformLocation(p, "hx_spotLight.rcpRadius");
    this._anglesLocation = gl.getUniformLocation(p, "hx_spotLight.angleData");
    if (useCone) {
        this._sinOuterAngleLocation = gl.getUniformLocation(p, "hx_spotLight.sinOuterAngle");
        this._worldMatrixLocation = gl.getUniformLocation(p, "hx_spotLightWorldMatrix");
    }

    this._positionAttributeLocation = gl.getAttribLocation(p, "hx_position");
    this._texCoordAttributeLocation = gl.getAttribLocation(p, "hx_texCoord");

    var albedoSlot = gl.getUniformLocation(p, "hx_gbufferAlbedo");
    var normalDepthSlot = gl.getUniformLocation(p, "hx_gbufferNormalDepth");
    var specularSlot = gl.getUniformLocation(p, "hx_gbufferSpecular");

    gl.uniform1i(albedoSlot, 0);
    gl.uniform1i(normalDepthSlot, 1);
    gl.uniform1i(specularSlot, 2);
}

DeferredSpotShader.prototype = Object.create(Shader.prototype);

DeferredSpotShader.prototype.execute = function(renderer, light)
{
    var pos = new Float4();

    return function(renderer, light) {
        var gl = GL.gl;

        gl.useProgram(this._program);

        var texs = renderer._gbuffer.textures;
        texs[0].bind(0);
        texs[1].bind(1);
        texs[2].bind(2);

        var camera = renderer._camera;
        var col = light._scaledIrradiance;

        var worldMatrix = light.worldMatrix;
        worldMatrix.getColumn(3, pos);
        camera.viewMatrix.transformPoint(pos, pos);
        gl.uniform3f(this._colorLocation, col.r, col.g, col.b);
        gl.uniform3f(this._posLocation, pos.x, pos.y, pos.z);

        worldMatrix.getColumn(2, pos);
        camera.viewMatrix.transformVector(pos, pos);
        gl.uniform3f(this._dirLocation, pos.x, pos.y, pos.z);
        gl.uniform1f(this._radiusLocation, light._radius);
        gl.uniform1f(this._rcpRadiusLocation, 1.0 / light._radius);
        gl.uniform2f(this._anglesLocation, light._cosOuter, 1.0 / Math.max((light._cosInner - light._cosOuter), .00001));

        if (this._useCone) {
            gl.uniform1f(this._sinOuterAngleLocation, light._sinOuter);
            gl.uniformMatrix4fv(this._worldMatrixLocation, false, worldMatrix._m);
        }

        this.updatePassRenderState(camera, renderer);

        if (this._useCone) {
            GL.setCullMode(CullMode.FRONT);
            var mesh = this._mesh;
            mesh._vertexBuffers[0].bind();
            mesh._indexBuffer.bind();

            gl.vertexAttribPointer(this._positionAttributeLocation, 3, gl.FLOAT, false, 48, 0);
            GL.enableAttributes(1);
            GL.drawElements(ElementType.TRIANGLES, mesh.numIndices, 0);
        }
        else {
            GL.setCullMode(CullMode.NONE);
            var rect = RectMesh.DEFAULT;
            rect._vertexBuffers[0].bind();
            rect._indexBuffer.bind();

            gl.vertexAttribPointer(this._positionAttributeLocation, 2, gl.FLOAT, false, 16, 0);
            gl.vertexAttribPointer(this._texCoordAttributeLocation, 2, gl.FLOAT, false, 16, 8);

            GL.enableAttributes(2);

            GL.drawElements(ElementType.TRIANGLES, 6, 0);
        }
    }
}();

export { DeferredSpotShader };