# @author derschmale <http://www.derschmale.com>

HX_VERSION = "0.1.0"

import bpy, struct
from . import data, object_map, export_options
from .exporters import scene_exporter
from .exporters import object_exporter
from .constants import PropertyType


def write_header():
    data.write(b"HX")

    # this starts a meta-property list
    print(PropertyType.VERSION)
    data.write_string_prop(PropertyType.VERSION, HX_VERSION)
    data.write_string_prop(PropertyType.GENERATOR, "Blender")
    data.write_uint8_prop(PropertyType.PAD_ARRAYS, 1)
    data.write_uint8_prop(PropertyType.DEFAULT_SCENE_INDEX, list(bpy.data.scenes).index(bpy.context.scene))
    if export_options.lighting_mode == "OFF":
        data.write_uint8_prop(PropertyType.LIGHTING_MODE, 0)
    elif export_options.lighting_mode == "FIXED":
        data.write_uint8_prop(PropertyType.LIGHTING_MODE, 1)
    elif export_options.lighting_mode == "DYNAMIC":
        data.write_uint8_prop(PropertyType.LIGHTING_MODE, 2)

    # as always, end a list with 0
    data.end_header()


def write_scene_graphs():
    for scene in bpy.data.scenes:
        scene_index = scene_exporter.write(scene)
        for obj in scene.objects:
            # root objects:
            if obj.parent is None:
                child_index = object_exporter.write(obj, scene)
                if child_index is not None:
                    object_map.link(scene_index, child_index)


def write_links():
    links = object_map.get_links()
    for link in links:
        data.write(struct.pack("<LLB", link[0], link[1], link[2]))


def write_hx():
    print("[HX] Writing Helix file...")

    object_map.init()
    data.open_file(export_options.file_path)
    write_header()
    write_scene_graphs()
    data.end_object_list()
    write_links()
    data.close_file()

    print("[HX] Export complete!")

    return {'FINISHED'}
