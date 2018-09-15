HX_VERSION = "0.1.0"

import bpy, struct
from . import data, object_map, export_options
from .exporters import scene_exporter
from .exporters import object_exporter
from .constants import PropertyType


def write_header(file):
    file.write(b"HX")

    # this starts a meta-property list
    print(PropertyType.VERSION)
    data.write_string_prop(file, PropertyType.VERSION, HX_VERSION)
    data.write_string_prop(file, PropertyType.GENERATOR, "Blender")
    data.write_uint8_prop(file, PropertyType.PAD_ARRAYS, 1)
    data.write_uint8_prop(file, PropertyType.DEFAULT_SCENE_INDEX, list(bpy.data.scenes).index(bpy.context.scene))
    if export_options.lighting_mode == "OFF":
        data.write_uint8_prop(file, PropertyType.LIGHTING_MODE, 0)
    elif export_options.lighting_mode == "FIXED":
        data.write_uint8_prop(file, PropertyType.LIGHTING_MODE, 1)
    elif export_options.lighting_mode == "DYNAMIC":
        data.write_uint8_prop(file, PropertyType.LIGHTING_MODE, 2)

    # as always, end a list with 0
    data.end_header(file)


def write_scene_graphs(file):
    for scene in bpy.data.scenes:
        scene_index = scene_exporter.write(scene, file)
        for obj in scene.objects:
            # root objects:
            if obj.parent is None:
                child_index = object_exporter.write(obj, file, scene)
                if child_index is not None:
                    object_map.link(scene_index, child_index)


def write_links(file):
    links = object_map.get_links()
    for link in links:
        file.write(struct.pack("<LLB", link[0], link[1], link[2]))


def write_hx():
    print("[HX] Writing Helix file...")
    file = open(export_options.file_path, 'wb')

    object_map.init()
    data.reset()
    write_header(file)
    write_scene_graphs(file)
    data.end_object_list(file)
    write_links(file)
    file.close()

    print("[HX] Export complete!")

    return {'FINISHED'}
