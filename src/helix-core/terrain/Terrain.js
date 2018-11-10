import {BoundingVolume} from "../scene/BoundingVolume";
import {Float4} from "../math/Float4";
import {Mesh} from "../mesh/Mesh";
import {SceneNode} from "../scene/SceneNode";
import {MathX} from "../math/MathX";
import {MeshInstance} from "../mesh/MeshInstance";
import {Entity} from "../entity/Entity";

/**
 * Terrain provides a terrain with dynamic LOD. The heightmapping itself happens in the Material.
 *
 * @property {number} terrainSize The world size for the entire terrain.
 *
 * @param {Texture2D} heightMap The height map defining the height of the terrain.
 * @param {number} terrainSize The size of the terrain's geometry. Generally smaller than the total world size of the height map.
 * @param {number} worldSize The total world size covered by the heightmap.
 * @param {number} minElevation The minimum elevation for the terrain (maps to heightmap value 0)
 * @param {number} maxElevation The maximum elevation for the terrain (maps to heightmap value 1)
 * @param {Material} material The {@linkcode Material} to use when rendering the terrain.
 * @param {number} [subdivisions] The amount of subdivisions per patch. Must be divisible by 4. Defaults to 32.
 * @constructor
 *
 * @extends SceneNode
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Terrain(heightMap, terrainSize, worldSize, minElevation, maxElevation, material, subdivisions)
{
    Entity.call(this);

    this._terrainSize = terrainSize;
    this._minElevation = minElevation;
    this._maxElevation = maxElevation;
    // this container will move along with the "player"
    // we use the extra container so the Terrain.position remains constant, so we can reliably translate and use rigid body components
    this._container = new SceneNode();
    this._subdivisions = subdivisions || 32;
	this.ignoreSpatialPartition = true;

    // will be defined when we're generating meshes
    // this._snapSize = undefined;

    this._heightMap = heightMap;
	// noinspection JSSuspiciousNameCombination
	this._heightMapSize = heightMap.width;
    this._worldSize = worldSize;
    this._material = material;
	material.setUniform("hx_worldSize", worldSize);
	material.setUniform("hx_elevationOffset", minElevation);
    material.setUniform("hx_elevationScale", maxElevation - minElevation);
	material.setUniform("hx_heightMapSize", this._heightMapSize);
	material.setTexture("hx_heightMap", heightMap);

	console.assert(this._subdivisions % 4 === 0, "subdivisions parameter must be divisible by 4!");

    this._initPatches();
}

// TODO: Allow setting material
Terrain.prototype = Object.create(Entity.prototype, {
    terrainSize: {
        get: function() {
            return this._terrainSize;
        }
    }
});

Terrain.prototype._createLODMesh = function(patchSize, texelSize, isFinal)
{
	// patchSize refers to the entire patch size, not the mesh size
	// subdivisions also refers to the entire patch
	// this mesh is 3/4 the width of the patch size, and 1/4 the height

    var mesh = new Mesh();

    mesh.addVertexAttribute("hx_position", 3);
    mesh.addVertexAttribute("hx_normal", 3);
    mesh.addVertexAttribute("hx_cellSize", 1);
    mesh.addVertexAttribute("hx_cellMipLevel", 1);

    var vertices = [];
    var tessVertices = [];
    var indices = [];
    // final patch is just square subdivs
	var numY = isFinal? this._subdivisions : this._subdivisions / 4;
	var numX = isFinal? this._subdivisions : 3.0 * numY;
	var cellSize = patchSize / this._subdivisions;
	var halfCellSize = cellSize * .5;
	var w = numX + 1;
	var mipLevel = MathX.log2(texelSize);
	var mipLevelDetail = Math.max(mipLevel - 1, 0);
	var tessIndex = (numY + 1) * w;	// this is the offset where the tessellated points start;

	// origin at 0, so we can easily rotate and position to the corners of the patches
    for (var yi = 0; yi <= numY; ++yi) {
        var y = yi * cellSize;

        for (var xi = 0; xi <= numX; ++xi) {
            var x = xi * cellSize;

            // the base index of the bottom right index
			var base = xi + yi * w;

			// the last row contains a set of points that touch a higher tessellated mesh, so we tessellate the edge
			// also not required if it's the final mesh
            var inTessellated = !isFinal && yi === numY && xi >= numY;

            // TODO: Something still wrong at corners!

			if (inTessellated && xi < numX)
				tessVertices.push(x + halfCellSize, y, 0, 0, 0, 1, halfCellSize, mipLevelDetail);

            if (inTessellated && xi > numY) {
				vertices.push(x, y, 0, 0, 0, 1, halfCellSize, mipLevelDetail);

				// A slightly different subdivision:
				// *-----*
				// *\   /*
				// * \ / *
				// *--*--*
				// (bottom right = base)
				// we've stored the middle point after all the other points to make it easier, so the outer points still
				// have grid-based indices, and the tessellation point is simply base + numTess
				indices.push(base - w - 1, tessIndex, base - 1);
				indices.push(base - w - 1, base - w, tessIndex);
				indices.push(base - w, base, tessIndex);
				++tessIndex;
			}
			else {
            	if (inTessellated)
					vertices.push(x, y, 0, 0, 0, 1, halfCellSize, mipLevelDetail);
				else
					vertices.push(x, y, 0, 0, 0, 1, cellSize, mipLevel);

				// the standard quad subdivision
				// *---*
				// * \ *
				// *---*
				// (bottom right = base)
				if (xi > 0 && yi > 0) {
					indices.push(base - w - 1, base, base - 1);
					indices.push(base - w - 1, base - w, base);
				}
			}
        }
    }

    mesh.setVertexData(vertices.concat(tessVertices), 0);
    mesh.setIndexData(indices);
	mesh.dynamicBounds = false;
	mesh.bounds.clear();
	mesh.bounds.growToIncludeMinMax(new Float4(0, 0, this._minElevation), new Float4(numX * cellSize, numY * cellSize, this._maxElevation));
    return mesh;
};

/**
 * @ignore
 * @private
 */
Terrain.prototype._initPatches = function()
{
	// the world size per segment
    var gridSize = this._terrainSize / this._subdivisions;
    // the amount of texels covered by the cell
    var texelSize = gridSize / this._worldSize * this._heightMapSize;
    var size = this._worldSize;

    // stop adding meshes if the NEXT one covers 1 texel or less.
	// that one should just be a simple plane mesh

	// the lower res ones look sort of like this:
	// so it's 1 mesh with a higher tessellated edge rotated around the higher detail inner square
	// the inner square is recursively generated the same until it covers 1 texel per segment, at which point it's filled
	// in with a simple grid mesh
	// |-----------|---|
	// |           |   |
	// |----*******|   |
	// |   *       *   |
	// |   *       *   |
	// |   |*******----|
	// |   |           |
	// |---|-----------|
	var positions = [
		[-.5, -.5],
		[.5, -.5],
		[.5, .5],
		[-.5, .5]
	];
    while (texelSize > 1.0) {
        var mesh = this._createLODMesh(size, texelSize);

        for (var i = 0; i < 4; ++i)
			this._addMesh(mesh, size * positions[i][0], size * positions[i][1], i);

        size *= .5;
        texelSize *= .5;
    }

    // create the final patch (just a plane)
	mesh = this._createLODMesh(size, texelSize, true);
	this._addMesh(mesh, -size * .5, -size * .5, 0);
};


Terrain.prototype._addMesh = function(mesh, x, y, rot)
{
	var entity = new Entity();
	var meshInstance = new MeshInstance(mesh, this._material);
	meshInstance.name = "hx_terrain_" + this._container.numChildren;
	entity.addComponent(meshInstance);

	// always add this to the partition's root node
	entity.position.x = x;
	entity.position.y = y;
	entity.euler.z = rot * Math.PI * .5;
	this._container.attach(entity);
};

/**
 * @ignore
 */
Terrain.prototype.acceptVisitor = function(visitor, isMainCollector)
{
    if (isMainCollector) {
		var cameraPos = visitor._camera.position;
		var containerPos = this._container.position;
		var entityPosition = this.position;
		containerPos.x = cameraPos.x - entityPosition.x;
		containerPos.y = cameraPos.y - entityPosition.y;
		// containerPos.x = Math.round(cameraPos.x / this._snapSize) * this._snapSize - entityPosition.x;
		// containerPos.y = Math.round(cameraPos.y / this._snapSize) * this._snapSize - entityPosition.y;
    }

    for (var i = 0, len = this._container.numChildren; i < len; ++i) {
    	var entity = this._container.getChild(i);
    	if (visitor.qualifies(entity))
    		visitor.visitEntity(entity);
	}
};

/**
 * @inheritDoc
 */
Terrain.prototype.clone = function()
{
    return new Terrain(this._heightMap, this._terrainSize, this._worldSize, this._minElevation, this._maxElevation, this._material, this._subdivisions);
};

Terrain.prototype._updateBounds = function()
{
	this._bounds.clear(BoundingVolume.EXPANSE_INFINITE);
};

export { Terrain };