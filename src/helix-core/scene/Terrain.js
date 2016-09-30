// TODO: there no way to figure out correct mip level for texture
// TODO: Should we provide a snap size in the vertex data?
HX.Terrain = function(terrainSize, minElevation, maxElevation, numLevels, material, detail)
{
    HX.GroupNode.call(this);

    this._terrainSize = terrainSize || 512;
    this._minElevation = minElevation;
    this._maxElevation = maxElevation;
    this._numLevels = numLevels || 4;
    detail = detail || 32;
    var gridSize = Math.ceil(detail * .5) * 2.0; // round off to 2

    this._snapSize = (this._terrainSize / detail) >> this._numLevels;

    this._material = material;
    material.setUniform("hx_elevationOffset", minElevation);
    material.setUniform("hx_elevationScale", maxElevation - minElevation);

    this._initModels(gridSize);
    this._initTree();
};

// TODO: Allow setting material
HX.Terrain.prototype = Object.create(HX.GroupNode.prototype, {
    terrainSize: {
        get: function() {
            return this._terrainSize;
        }
    }
});

/**
 *
 * @param size
 * @param numSegments
 * @param subDiv Subdivide an edge
 * @returns {HX.Model}
 * @private
 */
HX.Terrain.prototype._createModel = function(size, numSegments, subDiv, lastLevel)
{
    var rcpNumSegments = 1.0 / numSegments;
    var meshData = new HX.MeshData();
    var cellSize = size * rcpNumSegments;
    var halfCellSize = cellSize * .5;

    meshData.addVertexAttribute("hx_position", 3);
    meshData.addVertexAttribute("hx_normal", 3);
    meshData.addVertexAttribute("hx_cellSize", 1);

    var vertices = [];
    var indices = [];

    var numZ = subDiv? numSegments - 1: numSegments;

    var w = numSegments + 1;

    for (var zi = 0; zi <= numZ; ++zi) {
        var z = (zi*rcpNumSegments - .5) * size;

        for (var xi = 0; xi <= numSegments; ++xi) {
            var x = (xi*rcpNumSegments - .5) * size;

            // the one corner that attaches to higher resolution neighbours needs to snap like them
            var s = !lastLevel && xi === numSegments && zi === numSegments? halfCellSize : cellSize;
            vertices.push(x, 0, z, 0, 1, 0, s);

            if (xi !== numSegments && zi !== numZ) {
                var base = xi + zi * w;

                indices.push(base, base + w, base + w + 1);
                indices.push(base, base + w + 1, base + 1);
            }
        }
    }

    var highIndexX = vertices.length / 7;

    if (subDiv) {
        var z = (numSegments * rcpNumSegments - .5) * size;
        for (var xi = 0; xi <= numSegments; ++xi) {
            var x = (xi*rcpNumSegments - .5) * size;
            vertices.push(x, 0, z, 0, 1, 0);
            vertices.push(halfCellSize);

            if (xi !== numSegments) {
                var base = xi + numZ * w;
                vertices.push(x + halfCellSize, 0, z, 0, 1, 0, halfCellSize);
                indices.push(base, highIndexX + xi * 2, highIndexX + xi * 2 + 1);
                indices.push(base, highIndexX + xi * 2 + 1, base + 1);
                indices.push(highIndexX + xi * 2 + 1, highIndexX + xi * 2 + 2, base + 1);
            }
        }
    }

    meshData.setVertexData(vertices, 0);
    meshData.setIndexData(indices);

    var modelData = new HX.ModelData();
    modelData.addMeshData(meshData);
    var model = new HX.Model(modelData);
    model.localBounds.growToIncludeMinMax(new HX.Float4(0, this._minElevation, 0), new HX.Float4(0, this._maxElevation, 0));
    return model;
};

HX.Terrain.prototype._initModels = function(gridSize)
{
    this._models = [];
    var modelSize = this._terrainSize * .25;

    for (var level = 0; level < this._numLevels; ++level) {
        if (level === this._numLevels - 1) {
            // do not subdivide max detail
            var model = this._createModel(modelSize, gridSize, false, true);
            this._models[level] = {
                edge: model,
                corner: model
            };
        }
        else {
            this._models[level] = {
                edge: this._createModel(modelSize, gridSize, true, false),
                corner: this._createModel(modelSize, gridSize, false, false)
            };
        }

        modelSize *= .5;

    }
};

HX.Terrain.prototype._initTree = function()
{
    var level = 0;
    var size = this._terrainSize * .25;
    for (var yi = 0; yi < 4; ++yi) {
        var y = this._terrainSize * (yi / 4 - .5) + size * .5;
        for (var xi = 0; xi < 4; ++xi) {
            var x = this._terrainSize * (xi / 4 - .5) + size * .5;
            var subX = 0, subY = 0;

            if (xi === 1)
                subX = 1;
            else if (xi === 2)
                subX = -1;

            if (yi === 1)
                subY = 1;
            else if (yi === 2)
                subY = -1;

            if (subX && subY) {
                this._subDivide(x, y, subX, subY, level + 1, size * .5);
            }
            else {
                var rotation = 0;
                var mode = "edge";
                var add = true;
                // if both are 0, we have a corner
                if (xi % 3 === yi % 3) {
                    mode = "corner";
                    console.log(mode, xi, yi);

                    if (xi === 0 && yi === 0) rotation = 0;
                    if (xi === 0 && yi === 3) rotation = 1;
                    if (xi === 3 && yi === 3) rotation = 2;
                    if (xi === 3 && yi === 0) rotation = -1;
                }
                else {
                    if (yi === 3) rotation = 2;
                    if (xi === 3) rotation = -1;
                    if (xi === 0) rotation = 1;
                }
                if (add)
                    this._addModel(x, y, level, rotation, mode);
            }
        }
    }
};

HX.Terrain.prototype._addModel = function(x, y, level, rotation, mode)
{
    var modelInstance = new HX.ModelInstance(this._models[level][mode], this._material);
    modelInstance.position.set(x, 0, y);
    modelInstance.rotation.fromAxisAngle(HX.Float4.Y_AXIS, rotation * Math.PI * .5);
    this.attach(modelInstance);
};

HX.Terrain.prototype._subDivide = function(x, y, subX, subY, level, size)
{
    size *= .5;

    for (var yi = -1; yi <= 1; yi += 2) {
        for (var xi = -1; xi <= 1; xi += 2) {
            if((xi !== subX || yi !== subY) || level === this._numLevels - 1) {
                var rotation = 0;
                var mode = "corner";
                // messy, I know
                if (x < 0 && y < 0) {
                    if (xi < 0 && yi > 0) {
                        mode = "edge";
                        rotation = 1;
                    }
                    else if (xi > 0 && yi < 0) {
                        mode = "edge";
                        rotation = 0;
                    }
                    else
                        rotation = 0;
                }
                else if (x > 0 && y > 0) {
                    if (xi > 0 && yi < 0) {
                        mode = "edge";
                        rotation = -1;
                    }
                    else if (xi < 0 && yi > 0) {
                        mode = "edge";
                        rotation = 2;
                    }
                    else
                        rotation = 2;
                }
                else if (x < 0 && y > 0) {
                    if (xi > 0 && yi > 0) {
                        mode = "edge";
                        rotation = 2;
                    }
                    else if (xi < 0 && yi < 0) {
                        mode = "edge";
                        rotation = 1;
                    }
                    else
                        rotation = 1;
                }
                else if (x > 0 && y < 0) {
                    if (xi < 0 && yi < 0) {
                        mode = "edge";
                        rotation = 0;
                    }
                    else if (xi > 0 && yi > 0) {
                        mode = "edge";
                        rotation = -1;
                    }
                    else
                        rotation = -1;
                }

                this._addModel(x + size * xi, y + size * yi, level, rotation, mode);
            }
        }
    }

    if (level < this._numLevels - 1)
        this._subDivide(x + size * subX, y + size * subY, subX, subY, level + 1, size);
};

HX.Terrain.prototype.acceptVisitor = function(visitor)
{
    // typechecking isn't nice, but it does what we want
    if (visitor instanceof HX.RenderCollector) {
        var pos = visitor._camera.position;
        this.position.x = Math.floor(pos.x / this._snapSize) * this._snapSize;
        this.position.z = Math.floor(pos.z / this._snapSize) * this._snapSize;
    }

    HX.GroupNode.prototype.acceptVisitor.call(this, visitor);
};

HX.Terrain.prototype._updateWorldBounds = function ()
{
    this._worldBounds.clear(HX.BoundingVolume.EXPANSE_INFINITE);
};