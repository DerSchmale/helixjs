bl_info = {
    "name": "Helix exporter",
    "description": "Exports to the Helix file format",
    "category": "Import-Export",
    "author": "David Lenaerts"
}

import bpy
from bpy_extras.io_utils import ExportHelper
from bpy.props import StringProperty
from bpy.types import Operator
from . import exporter
from . import export_options

class ExportHelix(Operator, ExportHelper):
    """Define export properties for Helix files"""
    bl_idname = "export.helix"  # important since its how bpy.ops.import_test.some_data is constructed
    bl_label = "Export Helix"

    # ExportHelper mixin class uses this
    filename_ext = ".hx"

    filter_glob = StringProperty(
        default="*.hx",
        options={'HIDDEN'},
        maxlen=255,  # Max internal buffer length, longer would be clamped.
    )

    export_mode = bpy.props.EnumProperty(
        name="Export mode",
        description="Defines the way lights are applied in Helix",
        items=(("ALL", "All", "All scenes are exported."),
               ("SELECTED_SCENE", "Selected Scene", "Only the selected scene is exported."),
               ("SELECTED_OBJECTS", "Selected Object", "Only the selected objects and its children are exported.")
               ),
        default="SELECTED_SCENE"
    )

    lighting_mode = bpy.props.EnumProperty(
        name="Lighting mode",
        description="Defines the way lights are applied in Helix",
        items=(("OFF", "Off", "Lighting is not applied to materials."),
               ("FIXED", "Fixed", "All lights are assigned to the materials in a single pass."),
               ("DYNAMIC", "Dynamic", "Lights are assigned to materials dynamically through multiple passes.")),
        default="FIXED"
    )

    export_shadows = bpy.props.BoolProperty(
        name="Export shadows",
        description="Defines whether shadow casters are exported",
        default=False
    )

    def execute(self, context):
        export_options.export_mode = self.export_mode
        export_options.export_shadows = self.export_shadows
        if self.export_mode == "SELECTED_OBJECTS":
            export_options.lighting_mode = "OFF"
        else:
            export_options.lighting_mode = self.lighting_mode
        export_options.file_path = self.filepath
        return exporter.write_hx()

    def draw(self, context):
        layout = self.layout

        row = layout.row()
        row.prop(self, "export_mode")

        row = layout.row()
        row.label(text="LIGHTING:")

        row = layout.row()
        row.enabled = self.export_mode != "SELECTED_OBJECTS"
        row.prop(self, "lighting_mode")

        row = layout.row()
        row.prop(self, "export_shadows")


def menu_func_export(self, context):
    self.layout.operator(ExportHelix.bl_idname, text="Helix (.hx)")


def register():
    bpy.utils.register_class(ExportHelix)
    bpy.types.INFO_MT_file_export.append(menu_func_export)


def unregister():
    bpy.utils.unregister_class(ExportHelix)
    bpy.types.INFO_MT_file_export.remove(menu_func_export)


if __name__ == "__main__":
    register()

    # test call
    bpy.ops.export.helix('INVOKE_DEFAULT')