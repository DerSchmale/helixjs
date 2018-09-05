from .. import data, property_types, object_types


def write(scene, file, object_map):
    id = data.start_object(file, object_types.SCENE, object_map)
    data.write_string_prop(file, property_types.NAME, scene.name)
    data.end_object(file)
    return id