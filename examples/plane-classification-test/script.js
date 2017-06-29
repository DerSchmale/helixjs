var project = new DemoProject();

project.time = 0;

project.onInit = function()
{
    initScene(this.scene);
    var orbitController = new HX.OrbitController();
    orbitController.radius = 5.0;
    orbitController.minRadius = .3;
    orbitController.maxRadius = 20.0;
    this.camera.addComponent(orbitController);
};

project.onUpdate = function(dt)
{
    var normal = new HX.Float4(0.0, 0.0, 0.0, 0.0);
    var pos = new HX.Float4(0.0, 0.0, 0.0, 1.0);
    var matrix = this.camera.worldMatrix;
    matrix.getColumn(2, normal);
    matrix.getColumn(3, pos);
    normal.negate();
    pos.addScaled(normal, 10.0);
    this.box.position.copyFrom(pos);

    var color;
    var classification = this.box.worldBounds.classifyAgainstPlane(this.plane);
    switch (classification) {
        case HX.PlaneSide.FRONT:
            color = 0x00ff00;
            break;
        case HX.PlaneSide.BACK:
            color = 0xff0000;
            break;
        default:
            color = 0xffff00;
    }
    this.box.getMeshInstance(0).material.color = color;
};

window.onload = function ()
{
    project.init(document.getElementById('webglContainer'));
};

function initScene(scene)
{
    var material = new HX.BasicMaterial();
    material.color = 0xff0000;

    var primitive = new HX.BoxPrimitive(
        {
            width: 1.0
        });

    project.box = new HX.ModelInstance(primitive, material);
    scene.attach(project.box);

    material = new HX.BasicMaterial();
    material.color = 0xff00ff;

    primitive = new HX.PlanePrimitive(
        {
            width: 10,
            height: 10,
            numSegmentsW: 10,
            numSegmentsH: 10,
            alignment: HX.PlanePrimitive.ALIGN_XY
        });

    material.elementType = HX.ElementType.LINES;
    var plane = new HX.ModelInstance(primitive, material);
    plane.rotation.fromAxisAngle(HX.Float4.Y_AXIS, 2.0);
    scene.attach(plane);
    plane.position.set(2, 3, -4);

    project.plane = new HX.Float4();
    project.plane.planeFromNormalAndPoint(plane.worldMatrix.getColumn(2), plane.position);
    project.plane.normalizeAsPlane();
}