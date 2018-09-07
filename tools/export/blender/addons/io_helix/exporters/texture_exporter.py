import os

from .. import data, property_types, object_types

extensionMap = {
    "CHECKER": 0,
    "CLIP": 0,
    "CLIP_CUBE": 0,
    "EXTEND": 0,
    "REPEAT": 1
}

def write(tex, file, object_map, filepath):
    if tex.type != "IMAGE":
        if tex.type != "NONE":
            print ("Only texture type 'IMAGE' is supported; skipping texture '" + tex.name + "'")
        return

    id = data.start_object(file, object_types.TEXTURE_2D, object_map)
    data.write_string_prop(file, property_types.NAME, tex.name)
    data.write_uint8_prop(file, property_types.WRAP_MODE, extensionMap[tex.extension])

    if not tex.use_interpolation:
        data.write_uint8_prop(file, property_types.FILTER, 0)
    else:
        data.write_uint8_prop(file, property_types.FILTER, 3)   # anisoptropic as default

    target_file = "textures\\" + os.path.basename(tex.image.filepath)
    tex.image.save_render(os.path.dirname(filepath) + "\\" + target_file)

    data.write_string_prop(file, property_types.URL, target_file)

    data.end_object(file)

    object_map.map(tex, id)
    return id