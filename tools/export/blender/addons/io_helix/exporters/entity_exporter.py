from .. import data, property_types, object_types

# in Blender, we're only ever exporting Entity objects, not scene nodes
# orientation allows changing the orientation of fe: a light (down vs fwd in HX)
def write(object, file, object_map, orientation=None):
    c = data.start_object(file, object_types.ENTITY, object_map)
    data.write_string_prop(file, property_types.NAME, object.name)
    data.write_vector_prop(file, property_types.POSITION, object.location)

    quat = object.rotation_quaternion
    if orientation:
        quat = quat * orientation

    data.write_vector_prop(file, property_types.ROTATION, quat)
    data.write_vector_prop(file, property_types.SCALE, object.scale)
    # write scene graph info
    data.end_object(file)
    return c