/**
 * Impostor is a utility class to help generate impostor billboards from a mesh and a texture.
 *
 * @author derschmale <http://www.derschmale.com>
 */
import {Scene} from "../scene/Scene";
import {Texture2D} from "../texture/Texture2D";
import {Renderer} from "../render/Renderer";
import {BasicMaterial} from "../material/BasicMaterial";
import {LightingModel} from "../render/LightingModel";
import {FrameBuffer} from "../texture/FrameBuffer";
import {WriteOnlyDepthBuffer} from "../texture/WriteOnlyDepthBuffer";
import {MeshInstance} from "../mesh/MeshInstance";
import {Mesh} from "../mesh/Mesh";
import {Entity} from "../entity/Entity";
import {Color} from "../core/Color";
import {MathX} from "../math/MathX";
import {META, TextureFilter, TextureWrapMode} from "../Helix";
import {OrthographicOffCenterCamera} from "../camera/OrthographicOffCenterCamera";
import {Material} from "../material/Material";

export var Impostor = {
	/**
	 * Generates an impostor MeshInstance.
	 * @param {Entity} entity The entity from which to generate the impostor.
	 * @param {Number} texWidth The width of the texture to contain the impostor textures.
	 * @param {Number} texHeight The height of the texture to contain the impostor textures.
	 * @param {Boolean} normals Whether or not a normal map should be generated.
	 * @returns {MeshInstance} A billboard.
	 */
	create: function(entity, texWidth, texHeight, normals)
	{
		var scene = new Scene();
		var camera = new OrthographicOffCenterCamera();
		var srcInstances = entity.getComponentsByType(MeshInstance);
		var alphaThreshold = 1.0;
		entity = new Entity();

		for (var i = 0; i < srcInstances.length; ++i) {
			var srcMaterial = srcInstances[i].material;
			var renderMaterial = new BasicMaterial();
			renderMaterial.alphaThreshold = srcMaterial.alphaThreshold;
			if (srcMaterial.alphaThreshold < alphaThreshold)
				alphaThreshold = srcMaterial.alphaThreshold;
			renderMaterial.lightingModel = LightingModel.Unlit;
			renderMaterial.colorMap = srcMaterial.colorMap;
			renderMaterial.normalMap = srcMaterial.normalMap;
			entity.addComponent(new MeshInstance(srcInstances[i].mesh, renderMaterial));
		}

		scene.attach(entity);

		var bounds = entity.bounds;

		var min = bounds.minimum;
		var max = bounds.maximum;
		var w = max.x - min.x;
		var h = max.z - min.z;

		camera.setBounds(min.x, max.x, max.z, min.z);
		camera.nearDistance = min.y;
		camera.farDistance = max.y;

		if (!texHeight) {
			texHeight = texWidth / w * h;
			if (MathX.isPowerOfTwo(texWidth))
				texHeight = MathX.getNextPowerOfTwo(texHeight);
			else
				texHeight = Math.floor(texHeight);
		}

		var colorMap = new Texture2D();
		colorMap.initEmpty(texWidth, texHeight);
		colorMap.wrapMode = TextureWrapMode.CLAMP;

		var depthBuffer = new WriteOnlyDepthBuffer();
		depthBuffer.init(texWidth, texHeight, false);

		var fbo = new FrameBuffer(colorMap, depthBuffer);
		fbo.init();

		var renderer = new Renderer(fbo);
		renderer.backgroundColor = Color.ZERO;
		renderer.render(camera, scene, 0);

		if (MathX.isPowerOfTwo(texWidth) && MathX.isPowerOfTwo(texHeight))
			colorMap.generateMipmap();
		else
			colorMap.filter = TextureFilter.BILINEAR_NOMIP;

		if (normals) {
			var normalMap = new Texture2D();
			normalMap.initEmpty(texWidth, texHeight);
			normalMap.wrapMode = TextureWrapMode.CLAMP;

			fbo = new FrameBuffer(normalMap, depthBuffer);
			fbo.init();

			renderer.renderTarget = fbo;

			var len = entity._components.length;
			for (i = 0; i < len; ++i) {
				var instance = entity._components[i];
				instance.material.debugMode = Material.DEBUG_NORMALS;
			}

			renderer.backgroundColor = 0x8080ff;
			renderer.render(camera, scene, 0);

			if (MathX.isPowerOfTwo(texWidth) && MathX.isPowerOfTwo(texHeight))
				normalMap.generateMipmap();
			else
				normalMap.filter = TextureFilter.BILINEAR_NOMIP;
		}

		return new MeshInstance(
			createMesh(bounds),
			new BasicMaterial(
				{
					colorMap: colorMap,
					normalMap: normalMap,
					alphaThreshold: alphaThreshold,
					roughness: 1.0,
					billboardMode: BasicMaterial.BILLBOARD,
					lightingModel: META.OPTIONS.defaultLightingModel? LightingModel.Lambert : LightingModel.Unlit
				}
			)
		);
	}
};

function createMesh(bounds)
{
	var billboard = new Mesh();
	billboard.addVertexAttribute("hx_position", 3);
	billboard.addVertexAttribute("hx_normal", 3, 0, true);
	billboard.addVertexAttribute("hx_texCoord", 2, 0, true);

	var min = bounds.minimum;
	var max = bounds.maximum;
	var data = [
		min.x, 0, min.z, 	0, -1, 0, 		0, 0,
		max.x, 0, min.z, 	0, -1, 0, 		1, 0,
		max.x, 0, max.z, 	0, -1, 0, 		1, 1,
		min.x, 0, max.z, 	0, -1, 0, 		0, 1,
	];

	billboard.setVertexData(data);
	billboard.setIndexData([0, 1, 2, 0, 2, 3]);
	return billboard;
}