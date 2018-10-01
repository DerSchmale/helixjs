import {MaterialPass} from "../MaterialPass";
import {ShaderLibrary} from "../../shader/ShaderLibrary";
import {Shader} from "../../shader/Shader";
import {META} from "../../Helix";
import {Float4} from "../../math/Float4";
import {GL} from "../../core/GL";
import {TextureCube} from "../../texture/TextureCube";

var pos = new Float4();

/**
 * The base pass for dynamic lighting with probe support
 * @ignore
 * @param geometryVertex
 * @param geometryFragment
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function DynamicLitBaseProbesPass(geometryVertex, geometryFragment)
{
    MaterialPass.call(this, this._generateShader(geometryVertex, geometryFragment));
	this._initLocations();
	this._specProbeTextures = [];
	this._MP_updatePassRenderState = MaterialPass.prototype.updatePassRenderState;
}

DynamicLitBaseProbesPass.prototype = Object.create(MaterialPass.prototype);

DynamicLitBaseProbesPass.prototype._generateShader = function(geometryVertex, geometryFragment)
{
    // no normals or specular are needed
    var probeDefines = {
		HX_NUM_DIFFUSE_PROBES: META.OPTIONS.maxDiffuseProbes,
		HX_NUM_SPECULAR_PROBES: META.OPTIONS.maxSpecularProbes
	};
    var extensions = "#texturelod\n";
	var vertexShader = geometryVertex + "\n" + ShaderLibrary.get("material_fwd_base_vertex.glsl", probeDefines);
	var fragmentShader = 	extensions + ShaderLibrary.get("snippets_geometry.glsl") + "\n" + geometryFragment + "\n" +
							ShaderLibrary.get("light_probe.glsl") + "\n" +
							ShaderLibrary.get("material_fwd_base_fragment.glsl", probeDefines);

    return new Shader(vertexShader, fragmentShader);
};

DynamicLitBaseProbesPass.prototype.updatePassRenderState = function(camera, renderer, probes)
{
	GL.gl.useProgram(this.shader.program);
    this._assignDiffuseProbes(camera, probes.diffuseProbes);
	this._assignSpecularProbes(camera, probes.specularProbes);
	this._MP_updatePassRenderState(camera, renderer);
};

DynamicLitBaseProbesPass.prototype._assignDiffuseProbes = function (camera, probes)
{
	var len = probes.length, max = META.OPTIONS.maxDiffuseProbes;
	var gl = GL.gl;

	if (max < len)
		len = max;

	for (var i = 0; i < len; ++i) {
		var locs = this._diffProbeLocations[i];
		var probe = probes[i];
		var entity = probe.entity;

		if (!entity.hierarchyVisible) {
			gl.uniform1f(locs.intensity, 0);
			continue;
		}

		entity.worldMatrix.getColumn(3, pos);
		camera.viewMatrix.transformPoint(pos, pos);

		gl.uniform3fv(locs.sh, probe.diffuseSH._coefficients);
		gl.uniform3f(locs.position, pos.x, pos.y, pos.z);
		gl.uniform1f(locs.intensity, probe.intensity);
		var size = probe.size || 0;
		gl.uniform1f(locs.sizeSqr, size * size);
	}

	for (i = len; i < max; ++i) {
		locs = this._diffProbeLocations[i];
		gl.uniform1f(locs.intensity, 0);
	}
};

DynamicLitBaseProbesPass.prototype._assignSpecularProbes = function (camera, probes) {
	var len = probes.length, max = META.OPTIONS.maxSpecularProbes;
	var gl = GL.gl;

	if (max < len)
		len = max;

	for (var i = 0; i < len; ++i) {
		var locs = this._specProbeLocations[i];
		var probe = probes[i];
		var entity = probe.entity;

		if (!entity.hierarchyVisible) {
			gl.uniform1f(locs.intensity, 0);
			continue;
		}

		entity.worldMatrix.getColumn(3, pos);
		camera.viewMatrix.transformPoint(pos, pos);

		gl.uniform3f(locs.position, pos.x, pos.y, pos.z);
		gl.uniform1f(locs.intensity, probe.intensity);
		gl.uniform1f(locs.sizeSqr, probe.size * probe.size);
		var tex = probe.specularTexture;
		gl.uniform1f(locs.numMips, tex.numMips);
		this._specProbeTextures[i] = tex;
	}

	for (i = len; i < max; ++i) {
		locs = this._specProbeLocations[i];
		gl.uniform1f(locs.intensity, 0);
		this._specProbeTextures[i] = TextureCube.DEFAULT;
	}

	this.setTextureArrayByIndex(this._specularProbeTexSlot, this._specProbeTextures);
};

DynamicLitBaseProbesPass.prototype._initLocations = function()
{
	this._diffProbeLocations = [];
	this._specProbeLocations = [];

	this._specularProbeTexSlot = this.shader.getTextureIndex("hx_specularProbeTextures[0]");

	for (var i = 0; i < META.OPTIONS.maxDiffuseProbes; ++i) {
		this._diffProbeLocations.push({
			sh: this.getUniformLocation("hx_diffuseProbes[" + i + "].sh[0]"),
			position: this.getUniformLocation("hx_diffuseProbes[" + i + "].position"),
			intensity: this.getUniformLocation("hx_diffuseProbes[" + i + "].intensity"),
			sizeSqr: this.getUniformLocation("hx_diffuseProbes[" + i + "].sizeSqr")
		});

	}

	for (i = 0; i < META.OPTIONS.maxSpecularProbes; ++i) {
		this._specProbeLocations.push({
			position: this.getUniformLocation("hx_specularProbes[" + i + "].position"),
			intensity: this.getUniformLocation("hx_specularProbes[" + i + "].intensity"),
			sizeSqr: this.getUniformLocation("hx_specularProbes[" + i + "].sizeSqr"),
			numMips: this.getUniformLocation("hx_specularProbes[" + i + "].numMips")
		});
	}
};

export { DynamicLitBaseProbesPass };