import {GL} from "../core/GL";
import {DEFAULTS, META} from "../Helix";
import {PoissonDisk} from "../math/PoissonDisk";
import {PoissonSphere} from "../math/PoissonSphere";
import {Matrix4x4} from "../math/Matrix4x4";

/**
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
export var UniformSetter = {

    getSettersPerInstance: function (materialPass)
    {
        if (UniformSetter._instanceTable === undefined)
            UniformSetter._init();

        return UniformSetter._findSetters(materialPass.shader, UniformSetter._instanceTable);
    },

    getSettersPerPass: function (materialPass)
    {
        if (UniformSetter._passTable === undefined)
            UniformSetter._init();

        return UniformSetter._findSetters(materialPass.shader, UniformSetter._passTable);
    },

    _findSetters: function (shader, table)
    {
        var setters = [];
        for (var uniformName in table) {
            var location = GL.gl.getUniformLocation(shader.program, uniformName);
            if (!location) continue;
            var setter = new table[uniformName]();
            setters.push(setter);
            setter.location = location;
        }

        return setters;
    },

    _init: function ()
    {
        UniformSetter._instanceTable = {};
        UniformSetter._passTable = {};

        UniformSetter._instanceTable.hx_worldMatrix = WorldMatrixSetter;
        UniformSetter._instanceTable.hx_prevWorldMatrix = PrevWorldMatrixSetter;
        UniformSetter._instanceTable.hx_worldViewMatrix = WorldViewMatrixSetter;
        UniformSetter._instanceTable.hx_wvpMatrix = WorldViewProjectionSetter;
        UniformSetter._instanceTable.hx_inverseWVPMatrix = InverseWVPSetter;
        UniformSetter._instanceTable.hx_normalWorldMatrix = NormalWorldMatrixSetter;
        UniformSetter._instanceTable.hx_normalWorldViewMatrix = NormalWorldViewMatrixSetter;
		UniformSetter._instanceTable.hx_lodRange = LODRangeSetter;
        UniformSetter._instanceTable.hx_bindShapeMatrix = BindShapeMatrixSetter;
        UniformSetter._instanceTable.hx_bindShapeMatrixInverse = BindShapeMatrixInverseSetter;
        UniformSetter._instanceTable["hx_skinningMatrices[0]"] = SkinningMatricesSetter;
        UniformSetter._instanceTable["hx_morphWeights[0]"] = MorphWeightsSetter;

        UniformSetter._passTable.hx_viewMatrix = ViewMatrixSetter;
        UniformSetter._passTable.hx_projectionMatrix = ProjectionSetter;
        UniformSetter._passTable.hx_inverseProjectionMatrix = InverseProjectionSetter;
        UniformSetter._passTable.hx_viewProjectionMatrix = ViewProjectionSetter;
        UniformSetter._passTable.hx_prevViewProjectionMatrix = PrevViewProjectionSetter;
        UniformSetter._passTable.hx_inverseViewProjectionMatrix = InverseViewProjectionSetter;
        UniformSetter._passTable.hx_cameraWorldPosition = CameraWorldPosSetter;
        UniformSetter._passTable.hx_cameraWorldMatrix = CameraWorldMatrixSetter;
        UniformSetter._passTable.hx_cameraFrustumRange = CameraFrustumRangeSetter;
        UniformSetter._passTable.hx_rcpCameraFrustumRange = RCPCameraFrustumRangeSetter;
        UniformSetter._passTable.hx_cameraNearPlaneDistance = CameraNearPlaneDistanceSetter;
        UniformSetter._passTable.hx_cameraFarPlaneDistance = CameraFarPlaneDistanceSetter;
        UniformSetter._passTable.hx_cameraJitter = CameraJitterSetter;
        UniformSetter._passTable.hx_renderTargetResolution = RenderTargetResolutionSetter;
        UniformSetter._passTable.hx_rcpRenderTargetResolution = RCPRenderTargetResolutionSetter;
        UniformSetter._passTable.hx_dither2DTextureScale = Dither2DTextureScaleSetter;
        UniformSetter._passTable.hx_time = TimeSetter;
        UniformSetter._passTable.hx_ambientColor = AmbientColorSetter;
        UniformSetter._passTable["hx_poissonDisk[0]"] = PoissonDiskSetter;
        UniformSetter._passTable["hx_poissonSphere[0]"] = PoissonSphereSetter;
    }
};


function WorldMatrixSetter()
{
}

WorldMatrixSetter.prototype.execute = function (camera, renderItem)
{
    GL.gl.uniformMatrix4fv(this.location, false, renderItem.worldMatrix._m);
};

function PrevWorldMatrixSetter()
{
}

PrevWorldMatrixSetter.prototype.execute = function (camera, renderItem)
{
    GL.gl.uniformMatrix4fv(this.location, false, renderItem.prevWorldMatrix._m);
};


function ViewProjectionSetter()
{
}

ViewProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.viewProjectionMatrix._m);
};

function PrevViewProjectionSetter()
{
}

PrevViewProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera._prevViewProjectionMatrix._m);
};

function InverseViewProjectionSetter()
{
}

InverseViewProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.inverseViewProjectionMatrix._m);
};

function InverseWVPSetter()
{
}

InverseWVPSetter.prototype.execute = function(camera)
{
    var matrix = new Matrix4x4();
    return function(camera, renderItem)
    {
        // using (A*B)^-1 = B^-1 * A^-1
        matrix.inverseAffineOf(renderItem.worldMatrix);
        matrix.prepend(camera.inverseViewProjectionMatrix);
        GL.gl.uniformMatrix4fv(this.location, false, matrix._m);
    };
}();

function ProjectionSetter()
{
}

ProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.projectionMatrix._m);
};

function InverseProjectionSetter()
{
}

InverseProjectionSetter.prototype.execute = function(camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.inverseProjectionMatrix._m);
};

function WorldViewProjectionSetter()
{
}

WorldViewProjectionSetter.prototype.execute = function()
{
    var matrix = new Matrix4x4();
    var m = matrix._m;
    return function(camera, renderItem)
    {
        matrix.multiply(camera.viewProjectionMatrix, renderItem.worldMatrix);
        GL.gl.uniformMatrix4fv(this.location, false, m);
    };
}();

function WorldViewMatrixSetter()
{
}

WorldViewMatrixSetter.prototype.execute = function(){
    var matrix = new Matrix4x4();
    var m = matrix._m;
    return function (camera, renderItem)
    {
        matrix.multiply(camera.viewMatrix, renderItem.worldMatrix);
        GL.gl.uniformMatrix4fv(this.location, false, m);
    }
}();


function NormalWorldMatrixSetter()
{
}

NormalWorldMatrixSetter.prototype.execute = function() {
    var data = new Float32Array(9);
    return function (camera, renderItem)
    {
        renderItem.worldMatrix.writeNormalMatrix(data);
        GL.gl.uniformMatrix3fv(this.location, false, data);    // transpose of inverse
    }
}();


function NormalWorldViewMatrixSetter()
{
}

NormalWorldViewMatrixSetter.prototype.execute = function() {
    var data = new Float32Array(9);
    //var matrix = new Matrix4x4();

    return function (camera, renderItem)
    {
        // the following code is the same as the following two lines, but inlined and reducing the need for all field to be multiplied
        //matrix.multiply(camera.viewMatrix, renderItem.worldMatrix);
        //matrix.writeNormalMatrix(data);

        var am = camera.viewMatrix._m;
        var bm = renderItem.worldMatrix._m;

        var a_m00 = am[0], a_m10 = am[1], a_m20 = am[2];
        var a_m01 = am[4], a_m11 = am[5], a_m21 = am[6];
        var a_m02 = am[8], a_m12 = am[9], a_m22 = am[10];
        var a_m03 = am[12], a_m13 = am[13], a_m23 = am[14];
        var b_m00 = bm[0], b_m10 = bm[1], b_m20 = bm[2], b_m30 = bm[3];
        var b_m01 = bm[4], b_m11 = bm[5], b_m21 = bm[6], b_m31 = bm[7];
        var b_m02 = bm[8], b_m12 = bm[9], b_m22 = bm[10], b_m32 = bm[11];

        var m0 = a_m00 * b_m00 + a_m01 * b_m10 + a_m02 * b_m20 + a_m03 * b_m30;
        var m1 = a_m10 * b_m00 + a_m11 * b_m10 + a_m12 * b_m20 + a_m13 * b_m30;
        var m2 = a_m20 * b_m00 + a_m21 * b_m10 + a_m22 * b_m20 + a_m23 * b_m30;
        var m4 = a_m00 * b_m01 + a_m01 * b_m11 + a_m02 * b_m21 + a_m03 * b_m31;
        var m5 = a_m10 * b_m01 + a_m11 * b_m11 + a_m12 * b_m21 + a_m13 * b_m31;
        var m6 = a_m20 * b_m01 + a_m21 * b_m11 + a_m22 * b_m21 + a_m23 * b_m31;
        var m8 = a_m00 * b_m02 + a_m01 * b_m12 + a_m02 * b_m22 + a_m03 * b_m32;
        var m9 = a_m10 * b_m02 + a_m11 * b_m12 + a_m12 * b_m22 + a_m13 * b_m32;
        var m10 = a_m20 * b_m02 + a_m21 * b_m12 + a_m22 * b_m22 + a_m23 * b_m32;

        var determinant = m0 * (m5 * m10 - m9 * m6) - m4 * (m1 * m10 - m9 * m2) + m8 * (m1 * m6 - m5 * m2);
        var rcpDet = 1.0 / determinant;

        data[0] = (m5 * m10 - m9 * m6) * rcpDet;
        data[1] = (m8 * m6 - m4 * m10) * rcpDet;
        data[2] = (m4 * m9 - m8 * m5) * rcpDet;
        data[3] = (m9 * m2 - m1 * m10) * rcpDet;
        data[4] = (m0 * m10 - m8 * m2) * rcpDet;
        data[5] = (m8 * m1 - m0 * m9) * rcpDet;
        data[6] = (m1 * m6 - m5 * m2) * rcpDet;
        data[7] = (m4 * m2 - m0 * m6) * rcpDet;
        data[8] = (m0 * m5 - m4 * m1) * rcpDet;

        GL.gl.uniformMatrix3fv(this.location, false, data);    // transpose of inverse
    }
}();

function LODRangeSetter()
{
}

LODRangeSetter.prototype.execute = function (camera, renderItem)
{
    var instance = renderItem.meshInstance;
	GL.gl.uniform2f(this.location, instance._lodRangeStart, instance._lodRangeEnd);
};

function CameraWorldPosSetter()
{
}

CameraWorldPosSetter.prototype.execute = function (camera)
{
    var arr = camera.worldMatrix._m;
    GL.gl.uniform3f(this.location, arr[12], arr[13], arr[14]);
};

function CameraWorldMatrixSetter()
{
}

CameraWorldMatrixSetter.prototype.execute = function (camera)
{
    var matrix = camera.worldMatrix;
    GL.gl.uniformMatrix4fv(this.location, false, matrix._m);
};

function CameraFrustumRangeSetter()
{
}

CameraFrustumRangeSetter.prototype.execute = function (camera)
{
    GL.gl.uniform1f(this.location, camera._farDistance - camera._nearDistance);
};

function RCPCameraFrustumRangeSetter()
{
}

RCPCameraFrustumRangeSetter.prototype.execute = function (camera)
{
    GL.gl.uniform1f(this.location, 1.0 / (camera._farDistance - camera._nearDistance));
};

function CameraNearPlaneDistanceSetter()
{
}

CameraNearPlaneDistanceSetter.prototype.execute = function (camera)
{
    GL.gl.uniform1f(this.location, camera._nearDistance);
};

function CameraFarPlaneDistanceSetter()
{
}

CameraFarPlaneDistanceSetter.prototype.execute = function (camera)
{
    GL.gl.uniform1f(this.location, camera._farDistance);
};

function CameraJitterSetter()
{
}

CameraJitterSetter.prototype.execute = function (camera)
{
    var m = camera.projectionMatrix._m;
    GL.gl.uniform2f(this.location, m[4], m[5]);
};

function ViewMatrixSetter()
{
}

ViewMatrixSetter.prototype.execute = function (camera)
{
    GL.gl.uniformMatrix4fv(this.location, false, camera.viewMatrix._m);
};

function RenderTargetResolutionSetter()
{
}

RenderTargetResolutionSetter.prototype.execute = function (camera)
{
    GL.gl.uniform2f(this.location, camera._renderTargetWidth, camera._renderTargetHeight);
};

function AmbientColorSetter()
{
}

AmbientColorSetter.prototype.execute = function (camera, renderer)
{
    var color = renderer._ambientColor;
    GL.gl.uniform3f(this.location, color.r, color.g, color.b);
};

function RCPRenderTargetResolutionSetter()
{
}

RCPRenderTargetResolutionSetter.prototype.execute = function (camera)
{
    GL.gl.uniform2f(this.location, 1.0/camera._renderTargetWidth, 1.0/camera._renderTargetHeight);
};

function Dither2DTextureScaleSetter()
{
}

Dither2DTextureScaleSetter.prototype.execute = function ()
{
    GL.gl.uniform2f(this.location, 1.0 / DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.width, 1.0 / DEFAULTS.DEFAULT_2D_DITHER_TEXTURE.height);
};

function TimeSetter()
{
}

TimeSetter.prototype.execute = function ()
{
    GL.gl.uniform1f(this.location, META.TIME);
};

function PoissonDiskSetter()
{
}

PoissonDiskSetter.prototype.execute = function ()
{
    GL.gl.uniform2fv(this.location, PoissonDisk.DEFAULT_FLOAT32);
};

function PoissonSphereSetter()
{
}

PoissonSphereSetter.prototype.execute = function ()
{
    GL.gl.uniform3fv(this.location, PoissonSphere.DEFAULT_FLOAT32);
};


function BindShapeMatrixInverseSetter()
{
}

BindShapeMatrixInverseSetter.prototype.execute = function (camera, renderItem)
{
    var m = renderItem.meshInstance.bindShapeMatrixInverse || Matrix4x4.IDENTITY;
	GL.gl.uniformMatrix4fv(this.location, false, m._m);
};


function BindShapeMatrixSetter()
{
}

BindShapeMatrixSetter.prototype.execute = function (camera, renderItem)
{
    var m = renderItem.meshInstance.bindShapeMatrix || Matrix4x4.IDENTITY;
	GL.gl.uniformMatrix4fv(this.location, false, m._m);
};

function SkinningMatricesSetter()
{
}

SkinningMatricesSetter.prototype.execute = function (camera, renderItem)
{
    GL.gl.uniform4fv(this.location, renderItem.skeletonMatrices);
};

function MorphWeightsSetter()
{
}

MorphWeightsSetter.prototype.execute = function (camera, renderItem)
{
    GL.gl.uniform1fv(this.location, renderItem.meshInstance._morphWeights);
};