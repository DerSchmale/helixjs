import {CylinderPrimitive} from "../mesh/primitives/CylinderPrimitive";
import {BasicMaterial} from "../material/BasicMaterial";
import {LightingModel} from "../render/LightingModel";
import {SceneNode} from "../scene/SceneNode";
import {Entity} from "../entity/Entity";
import {MeshInstance} from "../mesh/MeshInstance";

function DebugAxes()
{
    Entity.call(this);

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

	primitiveX.translate(.5, 0, 0);
	primitiveY.translate(0, .5, 0);
	primitiveZ.translate(0, 0, .5);

    var materialX = new BasicMaterial({color: 0xff0000, lightingModel: LightingModel.Unlit});
    var materialY = new BasicMaterial({color: 0x00ff00, lightingModel: LightingModel.Unlit});
    var materialZ = new BasicMaterial({color: 0x0000ff, lightingModel: LightingModel.Unlit});

    this.addComponent(new MeshInstance(primitiveX, materialX));
    this.addComponent(new MeshInstance(primitiveY, materialY));
    this.addComponent(new MeshInstance(primitiveZ, materialZ));
}


DebugAxes.prototype = Object.create(SceneNode.prototype);

export { DebugAxes };