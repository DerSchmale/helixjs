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
import {TextureFilter, TextureWrapMode} from "../Helix";
import {OrthographicOffCenterCamera} from "../camera/OrthographicOffCenterCamera";

export var Impostor = {
	/**
	 * Generates an impostor MeshInstance.
	 * @param entity The texture to be used as the mesh's texture.
	 * @param texWidth The width of the texture to contain the impostor texture.
	 * @param texHeight The height of the texture to contain the impostor texture.
	 * @returns {MeshInstance} A billboard.
	 */
	create: function(entity, texWidth, texHeight)
	{
		var scene = new Scene();
		var camera = new OrthographicOffCenterCamera();
		var instances = entity.getComponentsByType(MeshInstance);
		var alphaThreshold = 1.0;
		entity = new Entity();
		for (var i = 0; i < instances.length; ++i) {
			var srcMaterial = instances[i].material;
			var renderMaterial = new BasicMaterial();
			renderMaterial.alphaThreshold = srcMaterial.alphaThreshold;
			if (alphaThreshold < srcMaterial.alphaThreshold)
				alphaThreshold = srcMaterial.alphaThreshold;
			renderMaterial.lightingModel = LightingModel.Unlit;
			renderMaterial.colorMap = srcMaterial.colorMap;
			entity.addComponent(new MeshInstance(instances[i].mesh, renderMaterial));
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

		var targetTex = new Texture2D();
		targetTex.initEmpty(texWidth, texHeight);
		targetTex.wrapMode = TextureWrapMode.CLAMP;

		var depthBuffer = new WriteOnlyDepthBuffer();
		depthBuffer.init(texWidth, texHeight, false);

		var fbo = new FrameBuffer(targetTex, depthBuffer);
		fbo.init();

		var renderer = new Renderer(fbo);
		renderer.backgroundColor = Color.ZERO;
		renderer.render(camera, scene, 0);

		if (MathX.isPowerOfTwo(texWidth) && MathX.isPowerOfTwo(texHeight))
			targetTex.generateMipmap();
		else
			targetTex.filter = TextureFilter.BILINEAR_NOMIP;

		return new MeshInstance(
			createMesh(bounds),
			new BasicMaterial(
				{
					colorMap: targetTex,
					alphaThreshold: alphaThreshold,
					roughness: 1.0,
					billboardMode: BasicMaterial.BILLBOARD
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