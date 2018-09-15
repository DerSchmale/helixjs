import os

from .. import data, export_options, object_map
from ..constants import ObjectType, PropertyType

extensionMap = {
    "CHECKER": 0,
    "CLIP": 0,
    "CLIP_CUBE": 0,
    "EXTEND": 0,
    "REPEAT": 1
}


def write(tex, file):
    if object_map.has_mapped_indices(tex):
        return

    if tex.type != "IMAGE":
        if tex.type != "NONE":
            print ("Only texture type 'IMAGE' is supported; skipping texture '" + tex.name + "'")
        return

    id = data.start_object(file, ObjectType.TEXTURE_2D)
    data.write_string_prop(file, PropertyType.NAME, tex.name)
    data.write_uint8_prop(file, PropertyType.WRAP_MODE, extensionMap[tex.extension])

    if not tex.use_interpolation:
        data.write_uint8_prop(file, PropertyType.FILTER, 0)
    else:
        data.write_uint8_prop(file, PropertyType.FILTER, 3)   # anisoptropic as default

    print ("[HX] Writing image: " + tex.image.filepath)
    # replace windows-style path separators and remove leading/trailing slashes (this confuses os.path)
    filename = tex.image.filepath.replace("\\", "/").strip("/")
    if filename == '':
        filename = tex.name
    target_file = "textures/" + os.path.basename(filename)
    tex.image.save_render(os.path.dirname(export_options.file_path) + "/" + target_file)

    data.write_string_prop(file, PropertyType.URL, target_file)

    data.end_object(file)

    object_map.map(tex, id)
    return id