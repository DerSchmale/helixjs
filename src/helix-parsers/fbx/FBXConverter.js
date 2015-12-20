// Could also create an ASCII deserializer
HX.FBXConverter = function()
{
    this._objects = null;
    this._textureTokens = null;
    this._textureMaterialMap = null;
};

HX.FBXConverter.prototype =
{
    get textureTokens() { return this._textureTokens; },
    get textureMaterialMap() { return this._textureMaterialMap; },

    convert: function(rootNode, target, settings)
    {
        this._settings = settings;
        this._objects = [];
        this._textureTokens = [];
        this._textureMaterialMap = [];
        this._convertGroupNode(rootNode, target);
    },

    // handles object of type FbxNode
    _convertNode: function(fbxNode)
    {
        var hxNode;

        if (fbxNode.mesh)
            hxNode = this._convertModelMesh(fbxNode);
        else if (fbxNode.children && fbxNode.children.length > 0) {
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

        // TODO: handle limb nodes
    },

    _convertModelMesh: function(fbxNode)
    {
        var matrix;
        if (fbxNode.GeometricRotation || fbxNode.GeometricScaling || fbxNode.GeometricTranslation) {
            var transform = new HX.Transform();
            // for now there will be problems with this if several geometric transformations are used on the same geometry
            if (transform.GeometricRotation) transform.rotation = this._convertRotation(fbxNode.GeometricRotation);
            if (transform.GeometricScaling) transform.scale = fbxNode.GeometricScaling;
            if (transform.GeometricTranslation) transform.position = fbxNode.GeometricTranslation;
            matrix = transform.transformationMatrix;
            matrix.append(this._settings.orientationMatrix);
        }
        else {
            matrix = this._settings.transformationMatrix;
        }


        var modelConverter = this._convertGeometry(fbxNode.mesh, matrix, this._settings.flipFaces);

        var materials = [];

        var numMaterials = fbxNode.materials.length;
        for (var i = 0; i < numMaterials; ++i) {
            materials[i] = this._convertMaterial(fbxNode.materials[i]);
        }
        return modelConverter.createModelInstance(materials);
    },

    _convertSceneGraphObject: function(fbxNode, hxNode)
    {
        var matrix = new HX.Matrix4x4();

        if (fbxNode.ScalingPivot) matrix.appendTranslation(HX.Float4.negate(fbxNode.ScalingPivot));
        var scale = fbxNode["Lcl Scaling"];
        if (scale) matrix.appendScale(scale.x, scale.y, scale.z);
        if (fbxNode.ScalingPivot) matrix.appendTranslation(fbxNode.ScalingPivot);
        if (fbxNode.ScalingOffset) matrix.appendTranslation(fbxNode.ScalingOffset);

        if (fbxNode.RotationPivot) matrix.appendTranslation(HX.Float4.negate(fbxNode.RotationPivot));
        if (fbxNode.PreRotation) matrix.appendRotationQuaternion(this._convertRotation(fbxNode.PreRotation));
        if (fbxNode["Lcl Rotation"]) matrix.appendRotationQuaternion(this._convertRotation(fbxNode["Lcl Rotation"]));
        if (fbxNode.PostRotation) matrix.appendRotationQuaternion(this._convertRotation(fbxNode.PostRotation));
        if (fbxNode.RotationPivot) matrix.appendTranslation(fbxNode.RotationPivot);
        if (fbxNode.RotationOffset) matrix.appendTranslation(fbxNode.RotationOffset);

        if (fbxNode["Lcl Translation"]) matrix.appendTranslation(fbxNode["Lcl Translation"]);

        hxNode.transformationMatrix = matrix;
    },

    _convertRotation: function(v)
    {
        var quat = new HX.Quaternion();
        quat.fromXYZ(v.x * HX.DEG_TO_RAD, v.y * HX.DEG_TO_RAD, v.z * HX.DEG_TO_RAD);
        return quat;
    },

    _convertGeometry: function(node, matrix, flipFaces)
    {
        if (this._objects[node.UID]) return this._objects[node.UID];

        var converter = new HX.FBXGeometryConverter();
        converter.convertToModel(node, matrix, flipFaces);

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
        if (fbxMaterial.ShininessExponent) hxMaterial.roughness = Math.sqrt(2.0/(fbxMaterial.Shininess + 2.0));

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