# @author derschmale <http://www.derschmale.com>

from mathutils import Quaternion, Vector, Matrix
from .. import data
from ..constants import ObjectType, PropertyType
from . import entity_exporter
import struct


def write(camera):
    cam_data = camera.data
    if cam_data.type != "PERSP":
        print("Only perspective cameras are currently exported. Camera " + camera.name + " not exported.")
        return

    camera_id = data.start_object(ObjectType.PERSPECTIVE_CAMERA)

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

    entity_exporter.write_props(camera, orientation=quat)

    data.write_string_prop(PropertyType.NAME, camera.name)

    data.start_property(PropertyType.CLIP_DISTANCES)
    data.write(struct.pack("<ff", cam_data.clip_start, cam_data.clip_end))

    data.write_float32_prop(PropertyType.FOV, cam_data.angle_y)

    data.end_object()

    return camera_id
