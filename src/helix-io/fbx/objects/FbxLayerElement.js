import {FbxObject} from "./FbxObject";
function FbxLayerElement()
{
    FbxObject.call(this);
    this.directData = null;
    this.indexData = null;
    this.type = null;   // can be normal, uv, etc ...
    this.mappingInformationType = 0;
    this.referenceInformationType = 0;
}

FbxLayerElement.prototype = Object.create(FbxObject.prototype);

FbxLayerElement.MAPPING_TYPE = {
    NONE: 0,
    BY_POLYGON_VERTEX: 1,
    BY_CONTROL_POINT: 2,
    BY_POLYGON: 3,
    ALL_SAME: 4
};

FbxLayerElement.REFERENCE_TYPE = {
    DIRECT: 1,
    INDEX_TO_DIRECT: 2
};

FbxLayerElement.prototype.toString = function() { return "[FbxLayerElement(name="+this.name+")]"; };

export {FbxLayerElement};