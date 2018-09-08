from .. import data, property_types, object_types
from . import entity_exporter
from mathutils import Quaternion, Vector, Matrix
import struct


def write(camera, file, object_map):
    cam_data = camera.data
    if cam_data.type != "PERSP":
        print("Only perspective cameras are currently exported. Camera " + camera.name + " not exported.")
        return

    camera_id = data.start_object(file, object_types.PERSPECTIVE_CAMERA, object_map)

    quat = camera.matrix_local.to_quaternion()
    # camera orientations are different from normal orientations. Calculate the transformation matrix to get there
    # camera-up is Y, global is Z, and vice versa
    y_axis = quat * Vector((0.0, 0.0, -1.0))
    z_axis = quat * Vector((0.0, 1.0, 0.0))
    x_axis = y_axis.cross(z_axis)

    m = Matrix()
    m.col[0].xyz = x_axis
    m.col[1].xyz = y_axis
    m.col[2].xyz = z_axis

    quat = quat.inverted() * m.to_quaternion()

    entity_exporter.write_props(camera, file, orientation=quat)

    data.write_string_prop(file, property_types.NAME, camera.name)

    data.start_property(file, property_types.CLIP_DISTANCES)
    file.write(struct.pack("<ff", cam_data.clip_start, cam_data.clip_end))

    data.write_float32_prop(file, property_types.FOV, cam_data.angle_y)

    data.end_object(file)

    return camera_id
