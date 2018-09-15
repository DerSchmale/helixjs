from .. import data
from ..constants import ObjectType, PropertyType


def write_props(object, file, orientation=None, visible=True):
    data.write_string_prop(file, PropertyType.NAME, object.name)

    if not visible:
        data.write_uint8_prop(file, PropertyType.VISIBLE, 0)

    # some transformation options don't apply the same way as in Helix, so we need to explicitly calculate the local matrix
    matrix_local = object.matrix_world
    if object.parent:
        matrix_local = object.parent.matrix_world.inverted() * matrix_local

    pos, quat, scale = matrix_local.decompose()

    if orientation:
        quat = quat * orientation

    data.write_vector_prop(file, PropertyType.POSITION, pos)
    data.write_quat_prop(file, PropertyType.ROTATION, quat)
    data.write_vector_prop(file, PropertyType.SCALE, scale)


# in Blender, we're only ever exporting Entity objects, not scene nodes
# orientation allows changing the orientation of fe: a light (down vs fwd in HX)
def write(object, file, orientation=None, visible=True):
    c = data.start_object(file, ObjectType.ENTITY)
    write_props(object, file, orientation, visible)
    data.end_object(file)
    return c


def write_proxy(object, file, orientation=None, visible=True):
    c = data.start_object(file, ObjectType.ENTITY_PROXY)
    write_props(object, file, orientation, visible)
    data.end_object(file)
    return c