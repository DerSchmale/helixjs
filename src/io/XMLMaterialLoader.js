/**
 * Our own material format, containing code for several passes
 */
HX.XMLMaterialLoader =
{
    load: function(url, onComplete, onError)
    {
        var material = new HX.Material();
        var urlLoader = new HX.URLLoader();

        urlLoader.onComplete = function(data) {
            var parser = new DOMParser();
            var xml = parser.parseFromString(data, "text/xml");

            HX.XMLMaterialLoader._parseXMLTo(xml, material);

            if (onComplete) onComplete();
        };

        urlLoader.onError = function(code) {
            console.warn("Failed loading " + url + ". Error code: " + code);
            if (onError) onError(code);
        };

        urlLoader.load(url);

        return material;
    },

    parse: function(xml)
    {
        var material = new HX.Material();
        HX.XMLMaterialLoader._parseXMLTo(xml, material);
        return material;
    },

    _parseXMLTo: function(xml, material)
    {
        HX.XMLMaterialLoader._parsePassFromXML(xml, HX.MaterialPass.GEOMETRY_PASS, "geometry", material);
        HX.XMLMaterialLoader._parsePassFromXML(xml, HX.MaterialPass.POST_LIGHT_PASS, "preEffect", material);
        HX.XMLMaterialLoader._parsePassFromXML(xml, HX.MaterialPass.POST_PASS, "post", material);

        material.transparencyMode = HX.XMLMaterialLoader._translateTransparencyMode(xml.documentElement.getAttribute("transparencyMode"));

        var uniforms = xml.getElementsByTagName("uniforms")[0];

        if (uniforms) {
            var node = uniforms.firstChild;

            while (node) {
                if (node.nodeName != "#text") {
                    var value = node.getAttribute("value").split(",");
                    if (value.length == 1)
                        material.setUniform(node.nodeName, Number(value[0]), false);
                    else
                        material.setUniform(node.nodeName, {x: Number(value[0]), y: Number(value[1]), z: Number(value[2]), w: Number(value[3])}, false);
                }

                node = node.nextSibling;
            }
        }

        // assign default textures
        material.setTexture("hx_dither2D", HX.DEFAULT_2D_DITHER_TEXTURE);
    },

    _translateTransparencyMode: function(value)
    {
        switch(value) {
            case "additive":
                return HX.TransparencyMode.ADDITIVE;
            case "alpha":
                return HX.TransparencyMode.ALPHA;
            default:
                return HX.TransparencyMode.OPAQUE;
        }
    },

    _translateProperty: function(value)
    {
        if (!HX.XMLMaterialLoader._properties) {
            HX.XMLMaterialLoader._properties = {
                back: HX.GL.BACK,
                front: HX.CullMode.FRONT,
                both: HX.CullMode.ALL,
                none: null,
                lines: HX.ElementType.LINES,
                points: HX.ElementType.POINTS,
                triangles: HX.ElementType.TRIANGLES,
                one: HX.BlendFactor.ONE,
                zero: HX.BlendFactor.ZERO,
                sourceColor: HX.BlendFactor.SOURCE_COLOR,
                oneMinusSourceColor: HX.BlendFactor.ONE_MINUS_SOURCE_COLOR,
                sourceAlpha: HX.BlendFactor.SOURCE_ALPHA,
                oneMinusSourceAlpha: HX.BlendFactor.ONE_MINUS_SOURCE_ALPHA,
                destinationAlpha: HX.BlendFactor.DST_ALPHA,
                oneMinusDestinationAlpha: HX.BlendFactor.ONE_MINUS_DESTINATION_ALPHA,
                destinationColor: HX.BlendFactor.DESTINATION_COLOR,
                sourceAlphaSaturate: HX.BlendFactor.SOURCE_ALPHA_SATURATE,
                add: HX.BlendOperation.ADD,
                subtract: HX.BlendOperation.SUBTRACT,
                reverseSubtract: HX.BlendOperation.REVERSE_SUBTRACT
            }
        }

        return HX.XMLMaterialLoader._properties[value];
    },

    _decodeHTML: function(value)
    {
        var e = document.createElement('div');
        e.innerHTML = value;
        return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
    },

    _addParsedPass: function (vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, passType, geometryPassTypeDef)
    {
        fragmentShader = HX.GLSLIncludeGeometryPass + fragmentShader;

        if (geometryPassTypeDef) {
            var defines = "#define " + geometryPassTypeDef + "\n";
            vertexShader = defines + vertexShader;
            fragmentShader = defines + fragmentShader;
        }

        var shader = new HX.Shader(vertexShader, fragmentShader);
        var pass = new HX.MaterialPass(shader);

        if (elements)
            pass.elementType = HX.XMLMaterialLoader._translateProperty(elements.childNodes[0].nodeValue);

        if (cullmode)
            pass.cullMode = HX.XMLMaterialLoader._translateProperty(cullmode.childNodes[0].nodeValue);

        if (blend) {
            var blendState = new HX.BlendState();
            var source = blend.getElementsByTagName("source")[0];
            var dest = blend.getElementsByTagName("destination")[0];
            var op = blend.getElementsByTagName("operator")[0];
            blendState.srcFactor = source ? HX.XMLMaterialLoader._translateProperty(source.childNodes[0].nodeValue) : HX.BlendFactor.ONE;
            blendState.dstFactor = dest ? HX.XMLMaterialLoader._translateProperty(dest.childNodes[0].nodeValue) : HX.BlendFactor.ZERO;
            blendState.operator = op ? HX.XMLMaterialLoader._translateProperty(op.childNodes[0].nodeValue) : HX.BlendOperation.ADD;
            pass.blendState = blendState;
        }

        targetMaterial.setPass(passType, pass);
    },

    _parsePassFromXML: function(xml, passType, tagName, targetMaterial)
    {
        var common = xml.getElementsByTagName("common")[0];
        common = common ? common.childNodes[0].nodeValue : "";
        var tags = xml.getElementsByTagName(tagName);
        if (tags === undefined || tags.length === 0) return;
        var passDef = tags[0];

        var vertexShaderID = passDef.getElementsByTagName("vertex")[0].childNodes[0].nodeValue;
        var fragmentShaderID = passDef.getElementsByTagName("fragment")[0].childNodes[0].nodeValue;
        var elements = passDef.getElementsByTagName("element")[0];
        var cullmode = passDef.getElementsByTagName("cullmode")[0];
        var blend = passDef.getElementsByTagName("blend")[0];

        var vertexShader = common + xml.querySelector("[id=" + vertexShaderID + "]").childNodes[0].nodeValue;
        var fragmentShader = common + xml.querySelector("[id=" + fragmentShaderID + "]").childNodes[0].nodeValue;
        vertexShader = HX.XMLMaterialLoader._decodeHTML(vertexShader);
        fragmentShader = HX.XMLMaterialLoader._decodeHTML(fragmentShader);

        if (passType === HX.MaterialPass.GEOMETRY_PASS) {
            if (HX.EXT_DRAW_BUFFERS)
                this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, passType);
            else {
                this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.MaterialPass.GEOMETRY_COLOR_PASS, "HX_NO_MRT_GBUFFER_COLOR");
                this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.MaterialPass.GEOMETRY_NORMAL_PASS, "HX_NO_MRT_GBUFFER_NORMALS");
                this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.MaterialPass.GEOMETRY_SPECULAR_PASS, "HX_NO_MRT_GBUFFER_SPECULAR");
            }

            if (HX.MaterialPass.SHADOW_MAP_PASS !== -1)
                this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, HX.MaterialPass.SHADOW_MAP_PASS, "HX_SHADOW_MAP_PASS");
        }
        else {
            this._addParsedPass(vertexShader, fragmentShader, elements, cullmode, blend, targetMaterial, passType);
        }
    }
};
