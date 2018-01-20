import {ModelInstance} from "../mesh/ModelInstance";
import {CylinderPrimitive} from "../mesh/primitives/CylinderPrimitive";
import {BasicMaterial} from "../material/BasicMaterial";
import {LightingModel} from "../render/LightingModel";
import {SceneNode} from "../scene/SceneNode";

function DebugAxes()
{
    SceneNode.call(this);

    var primitiveX = new CylinderPrimitive({
        height: 1.0,
        radius: .01,
        alignment: CylinderPrimitive.ALIGN_X
    });
    var primitiveY = new CylinderPrimitive({
        height: 1.0,
        radius: .01,
        alignment: CylinderPrimitive.ALIGN_Y
    });
    var primitiveZ = new CylinderPrimitive({
        height: 1.0,
        radius: .01,
        alignment: CylinderPrimitive.ALIGN_Z
    });

    var materialX = new BasicMaterial({color: 0xff0000, lightingModel: LightingModel.Unlit});
    var materialY = new BasicMaterial({color: 0x00ff00, lightingModel: LightingModel.Unlit});
    var materialZ = new BasicMaterial({color: 0x0000ff, lightingModel: LightingModel.Unlit});

    var modelInstanceX = new ModelInstance(primitiveX, materialX);
    var modelInstanceY = new ModelInstance(primitiveY, materialY);
    var modelInstanceZ = new ModelInstance(primitiveZ, materialZ);

    modelInstanceX.position.x = .5;
    modelInstanceY.position.y = .5;
    modelInstanceZ.position.z = .5;

    this.attach(modelInstanceX);
    this.attach(modelInstanceY);
    this.attach(modelInstanceZ);
}


DebugAxes.prototype = Object.create(SceneNode.prototype);

export { DebugAxes };