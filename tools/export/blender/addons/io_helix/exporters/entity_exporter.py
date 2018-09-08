from .. import data, property_types, object_types


def write_props(object, file, orientation=None, visible=True):
    data.write_string_prop(file, property_types.NAME, object.name)
    data.write_vector_prop(file, property_types.POSITION, object.location)

    if not visible:
        data.write_uint8_prop(file, property_types.VISIBLE, 0)

    quat = object.matrix_local.to_quaternion()

    if orientation:
        quat = quat * orientation

    data.write_quat_prop(file, property_types.ROTATION, quat)
    data.write_vector_prop(file, property_types.SCALE, object.scale)


# in Blender, we're only ever exporting Entity objects, not scene nodes
# orientation allows changing the orientation of fe: a light (down vs fwd in HX)
def write(object, file, object_map, orientation=None, visible=True):
    c = data.start_object(file, object_types.ENTITY, object_map)
    write_props(object, file, orientation, visible)
    data.end_object(file)
    return c