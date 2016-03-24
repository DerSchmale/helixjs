// Could also create an ASCII deserializer
HX.FBXConverter = function()
{
    this._settings = null;
    this._objects = null;
    this._textureTokens = null;
    this._textureMaterialMap = null;
    this._rootNode = null;
};

HX.FBXConverter.prototype =
{
    get textureTokens() { return this._textureTokens; },
    get textureMaterialMap() { return this._textureMaterialMap; },

    convert: function(rootNode, animationStack, target, settings)
    {
        this._settings = settings;
        this._objects = [];
        this._textureTokens = [];
        this._textureMaterialMap = [];
        this._rootNode = rootNode;
        this._animationStack = animationStack;
        this._convertGroupNode(rootNode, target);
    },

    // handles object of type FbxNode
    _convertNode: function(fbxNode)
    {
        var hxNode;

        if (fbxNode.mesh)
            hxNode = this._convertModelMesh(fbxNode);
        else if (fbxNode.children && fbxNode.children.length > 1) {
            hxNode = new HX.GroupNode();
            this._convertGroupNode(fbxNode, hxNode);
        }
        else return null;

        hxNode.name = fbxNode.name;

        this._convertSceneGraphObject(fbxNode, hxNode);

        // TODO: handle lights, cameras, etc
        return hxNode;
    },

    _convertGroupNode: function(fbxNode, hxNode)
    {
        var len = fbxNode.children.length;
        for (var i = 0; i < len; ++i) {
            var childNode = this._convertNode(fbxNode.children[i]);
            if (childNode)
                hxNode.attach(childNode);
        }
    },

    _convertModelMesh: function(fbxNode)
    {
        var modelConverter = this._convertGeometry(fbxNode.mesh, fbxNode.geometryTransform);

        var materials = [];

        if (fbxNode.materials) {
            var numMaterials = fbxNode.materials.length;
            for (var i = 0; i < numMaterials; ++i) {
                materials[i] = this._convertMaterial(fbxNode.materials[i]);
            }
        }
        else {
            materials.push(new HX.PBRMaterial());
        }

        return modelConverter.createModelInstance(materials);
    },

    _convertSceneGraphObject: function(fbxNode, hxNode)
    {
        hxNode.matrix = fbxNode.matrix;
    },

    _convertGeometry: function(node, geometryMatrix)
    {
        if (this._objects[node.UID]) return this._objects[node.UID];

        var converter = new HX.FBXModelInstanceConverter();
        converter.convertToModel(node, this._animationStack, geometryMatrix, this._settings);

        this._objects[node.UID] = converter;
        return converter;
    },

    _convertMaterial: function(fbxMaterial)
    {
        if (this._objects[fbxMaterial.UID]) return this._objects[fbxMaterial.UID];

        var hxMaterial = new HX.PBRMaterial();
        hxMaterial.name = fbxMaterial.name;
        if (fbxMaterial.DiffuseColor) hxMaterial.color = fbxMaterial.DiffuseColor;
        if (fbxMaterial.Shininess) fbxMaterial.ShininessExponent = fbxMaterial.Shininess;
        if (fbxMaterial.ShininessExponent) hxMaterial.setRoughness(HX.PBRMaterial.roughnessFromShininess(fbxMaterial.Shininess));

        if (fbxMaterial.textures) {
            if (fbxMaterial.textures["NormalMap"])
                this._convertTexture(fbxMaterial.textures["NormalMap"], hxMaterial, HX.FBXConverter._TextureToken.NORMAL_MAP);

            // We don't support specular color, instead hijack as roughness
            if (fbxMaterial.textures["SpecularColor"])
                this._convertTexture(fbxMaterial.textures["SpecularColor"], hxMaterial, HX.FBXConverter._TextureToken.SPECULAR_MAP);

            if (fbxMaterial.textures["DiffuseColor"])
                this._convertTexture(fbxMaterial.textures["DiffuseColor"], hxMaterial, HX.FBXConverter._TextureToken.DIFFUSE_MAP);
        }

        this._objects[fbxMaterial.UID] = hxMaterial;
        return hxMaterial;
    },

    _convertTexture: function(fbxTexture, hxMaterial, mapType)
    {
        var token;
        if (this._objects[fbxTexture.UID]) {
            token = this._objects[fbxTexture.UID];
        }
        else {
            token = new HX.FBXConverter._TextureToken();
            token.name = fbxTexture.name;
            token.mapType = mapType;
            token.filename = fbxTexture.relativeFilename ? fbxTexture.relativeFilename : fbxTexture.video.relativeFilename;
            this._textureTokens.push(token);
            this._objects[fbxTexture.UID] = token;
        }

        var mapping = new HX.FBXConverter._TextureMaterialMapping(hxMaterial, token, mapType);
        this._textureMaterialMap.push(mapping);
    }
};

HX.FBXConverter._TextureMaterialMapping = function(material, token, mapType)
{
    this.material = material;
    this.token = token;
    this.mapType = mapType;
};

HX.FBXConverter._TextureToken = function()
{
    this.filename = null;
    this.name = null;
    this.UID = null;
};

HX.FBXConverter._TextureToken.NORMAL_MAP = 0;
HX.FBXConverter._TextureToken.SPECULAR_MAP = 1;
HX.FBXConverter._TextureToken.DIFFUSE_MAP = 2;